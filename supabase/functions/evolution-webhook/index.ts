import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, json, parseJid } from "../_shared/evolution.ts";

/**
 * Webhook público que recibe eventos de Evolution API.
 * Eventos manejados:
 *  - QRCODE_UPDATED: actualiza el QR y estado
 *  - CONNECTION_UPDATE: connected/disconnected
 *  - MESSAGES_UPSERT: nuevo mensaje entrante (o saliente si fromMe)
 *  - MESSAGES_UPDATE: cambios de status (delivered/read)
 *
 * NOTA: verify_jwt=false. Autenticamos con la apikey en headers (opcional) o
 * simplemente resolvemos por instance name (mundo público hasta añadir HMAC).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);

  try {
    const raw = await req.json().catch(() => ({}));
    const evt = raw as {
      event?: string;
      instance?: string;
      data?: Record<string, unknown>;
    };
    const event = (evt.event ?? "").toString().toUpperCase();
    const instance = evt.instance ?? "";
    const data = evt.data ?? {};

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolver hotel por instance
    const { data: inst } = await admin
      .from("wa_instancias")
      .select("*")
      .eq("instance_name", instance)
      .maybeSingle();
    if (!inst) return json({ ok: true, note: "instance no reconocida" });
    const hotelId = inst.hotel_id as string;

    if (event.includes("QRCODE")) {
      const qr = (data.qrcode as { base64?: string; code?: string } | undefined)?.base64
        ?? (data.qrcode as { base64?: string; code?: string } | undefined)?.code
        ?? (data.base64 as string | undefined)
        ?? null;
      if (qr) {
        await admin
          .from("wa_instancias")
          .update({ qr, estado: "qr", last_status_at: new Date().toISOString() })
          .eq("id", inst.id);
      }
      return json({ ok: true });
    }

    if (event.includes("CONNECTION")) {
      const st = (data.state ?? data.status ?? "").toString();
      let estado = inst.estado;
      if (st === "open" || st === "CONNECTED") estado = "connected";
      else if (st === "close" || st === "DISCONNECTED") estado = "disconnected";
      else if (st === "connecting") estado = "connecting";
      const phone = (data.wuid as string | undefined) ?? inst.phone_number;
      await admin
        .from("wa_instancias")
        .update({
          estado,
          phone_number: phone ? String(phone).split("@")[0] : inst.phone_number,
          qr: estado === "connected" ? null : inst.qr,
          connected_at:
            estado === "connected" && !inst.connected_at
              ? new Date().toISOString()
              : inst.connected_at,
          last_status_at: new Date().toISOString(),
        })
        .eq("id", inst.id);
      return json({ ok: true });
    }

    if (event.includes("MESSAGES_UPSERT")) {
      // data puede ser { key, message, ... } o { messages: [...] }
      const list: Record<string, unknown>[] = Array.isArray(
        (data as { messages?: unknown[] }).messages,
      )
        ? ((data as { messages: Record<string, unknown>[] }).messages)
        : [data];

      for (const m of list) {
        await procesarMensaje(admin, hotelId, m);
      }
      // Disparar agente IA para mensajes entrantes (no bloqueante)
      for (const m of list) {
        const key = (m.key as Record<string, unknown> | undefined) ?? {};
        if (key.fromMe) continue;
        const jid = (key.remoteJid as string) ?? "";
        if (jid.endsWith("@g.us")) continue;
        dispararAgente(hotelId, jid).catch((e) => console.error("agent trigger error", e));
      }
      return json({ ok: true, procesados: list.length });
    }

    if (event.includes("MESSAGES_UPDATE")) {
      const list: Record<string, unknown>[] = Array.isArray(
        (data as { updates?: unknown[] }).updates,
      )
        ? ((data as { updates: Record<string, unknown>[] }).updates)
        : [data];
      for (const u of list) {
        const key = (u.key as Record<string, unknown> | undefined) ?? {};
        const id = key.id as string | undefined;
        const status = ((u.status ?? u.update as Record<string, unknown> | undefined)?.status) as
          | string
          | undefined;
        if (!id || !status) continue;
        const map: Record<string, string> = {
          PENDING: "pending",
          SERVER_ACK: "sent",
          DELIVERY_ACK: "delivered",
          READ: "read",
          "1": "sent",
          "2": "delivered",
          "3": "read",
          "4": "read",
        };
        const st = map[status] ?? status.toLowerCase();
        await admin.from("wa_mensajes").update({ status: st }).eq("wa_message_id", id);
      }
      return json({ ok: true });
    }

    return json({ ok: true, note: `evento ignorado: ${event}` });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function procesarMensaje(
  admin: ReturnType<typeof createClient>,
  hotelId: string,
  m: Record<string, unknown>,
) {
  const key = (m.key as Record<string, unknown> | undefined) ?? {};
  const remoteJid = (key.remoteJid as string) ?? "";
  if (!remoteJid) return;
  const { wa_id, phone, isGroup } = parseJid(remoteJid);
  if (isGroup) return; // por ahora ignoramos grupos
  const fromMe = !!key.fromMe;
  const pushName = (m.pushName as string | undefined) ?? undefined;
  const wa_message_id = (key.id as string | undefined) ?? null;
  const ts = m.messageTimestamp
    ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();

  const msg = (m.message as Record<string, unknown> | undefined) ?? {};
  let tipo = "text";
  let contenido = "";
  let media_url: string | null = null;
  let media_mime: string | null = null;

  if (msg.conversation) {
    contenido = String(msg.conversation);
  } else if ((msg.extendedTextMessage as { text?: string })?.text) {
    contenido = String((msg.extendedTextMessage as { text: string }).text);
  } else if (msg.imageMessage) {
    tipo = "image";
    const im = msg.imageMessage as { caption?: string; mimetype?: string; url?: string };
    contenido = im.caption ?? "";
    media_mime = im.mimetype ?? null;
    media_url = im.url ?? null;
  } else if (msg.audioMessage) {
    tipo = "audio";
    const am = msg.audioMessage as { mimetype?: string; url?: string };
    media_mime = am.mimetype ?? null;
    media_url = am.url ?? null;
  } else if (msg.videoMessage) {
    tipo = "video";
    const vm = msg.videoMessage as { caption?: string; mimetype?: string; url?: string };
    contenido = vm.caption ?? "";
    media_mime = vm.mimetype ?? null;
    media_url = vm.url ?? null;
  } else if (msg.documentMessage) {
    tipo = "document";
    const dm = msg.documentMessage as {
      caption?: string;
      mimetype?: string;
      url?: string;
      fileName?: string;
    };
    contenido = dm.fileName ?? dm.caption ?? "";
    media_mime = dm.mimetype ?? null;
    media_url = dm.url ?? null;
  } else if (msg.stickerMessage) {
    tipo = "sticker";
  } else if (msg.locationMessage) {
    tipo = "location";
    const lm = msg.locationMessage as { degreesLatitude?: number; degreesLongitude?: number };
    contenido = `${lm.degreesLatitude},${lm.degreesLongitude}`;
  } else {
    contenido = "[mensaje no soportado]";
  }

  // Buscar cliente por teléfono para vincularlo automáticamente
  const { data: cliente } = await admin
    .from("clientes")
    .select("id, nombre, apellido_paterno")
    .eq("hotel_id", hotelId)
    .ilike("telefono", `%${phone.slice(-8)}%`)
    .maybeSingle();

  // Upsert chat
  const chatName =
    pushName ??
    (cliente
      ? [cliente.nombre, cliente.apellido_paterno].filter(Boolean).join(" ")
      : phone);

  const { data: chat } = await admin
    .from("wa_chats")
    .upsert(
      {
        hotel_id: hotelId,
        wa_id,
        phone,
        nombre: chatName,
        cliente_id: cliente?.id ?? null,
        ultima_actividad: ts,
        ultimo_mensaje: contenido || `[${tipo}]`,
      },
      { onConflict: "hotel_id,wa_id" },
    )
    .select("id, no_leidos")
    .single();

  if (!chat) return;

  // Insert mensaje (evitando duplicado)
  if (wa_message_id) {
    const { data: existing } = await admin
      .from("wa_mensajes")
      .select("id")
      .eq("chat_id", chat.id)
      .eq("wa_message_id", wa_message_id)
      .maybeSingle();
    if (existing) return;
  }

  await admin.from("wa_mensajes").insert({
    chat_id: chat.id,
    hotel_id: hotelId,
    direccion: fromMe ? "out" : "in",
    tipo,
    contenido,
    media_url,
    media_mime,
    wa_message_id,
    status: "delivered",
    from_bot: false,
    timestamp: ts,
  });

  if (!fromMe) {
    await admin
      .from("wa_chats")
      .update({ no_leidos: (chat.no_leidos ?? 0) + 1 })
      .eq("id", chat.id);
  }
}