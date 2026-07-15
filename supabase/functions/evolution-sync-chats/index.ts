import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, evoFetch, json, parseJid } from "../_shared/evolution.ts";

type AnyRecord = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await admin
      .from("profiles")
      .select("hotel_id, hotel_activo_id")
      .eq("id", userData.user.id)
      .single();
    const hotelId = profile?.hotel_activo_id ?? profile?.hotel_id;
    if (!hotelId) return json({ error: "Hotel no encontrado" }, 400);

    const { data: inst } = await admin
      .from("wa_instancias")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();
    if (!inst || inst.estado !== "connected") {
      return json({ error: "WhatsApp no está conectado" }, 400);
    }

    const chatsResp = await evoFetch(`/chat/findChats/${inst.instance_name}`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    if (!chatsResp.ok) {
      return json({ error: "No se pudieron leer los chats de Evolution", details: chatsResp.body }, 502);
    }

    const evoChats = extractArray(chatsResp.body, ["chats", "data", "records", "result"]);
    let chatsSincronizados = 0;
    let mensajesSincronizados = 0;

    for (const evoChat of evoChats) {
      const remoteJid = getRemoteJid(evoChat);
      if (!remoteJid) continue;
      const parsed = parseJid(remoteJid);
      if (parsed.isGroup || !parsed.phone) continue;

      const nombre = getString(evoChat, ["name", "pushName", "verifiedName", "notifyName"]) || parsed.phone;
      const ultimo = getLastText(evoChat) || null;
      const ultimaActividad = getTimestamp(evoChat) || new Date().toISOString();
      const noLeidos = getNumber(evoChat, ["unreadMessages", "unreadCount", "unread", "unreadMessagesCount"]) ?? 0;

      const upsert = await admin
        .from("wa_chats")
        .upsert(
          {
            hotel_id: hotelId,
            wa_id: parsed.wa_id,
            phone: parsed.phone,
            nombre,
            ultima_actividad: ultimaActividad,
            ultimo_mensaje: ultimo,
            no_leidos: noLeidos,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "hotel_id,wa_id" },
        )
        .select("id")
        .single();

      if (upsert.error || !upsert.data?.id) {
        console.error("sync chat upsert error", upsert.error);
        continue;
      }

      chatsSincronizados += 1;
      const chatId = upsert.data.id as string;
      mensajesSincronizados += await sincronizarMensajes(admin, hotelId, chatId, inst.instance_name, remoteJid);
    }

    return json({ ok: true, chats: chatsSincronizados, mensajes: mensajesSincronizados });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function sincronizarMensajes(
  admin: ReturnType<typeof createClient>,
  hotelId: string,
  chatId: string,
  instanceName: string,
  remoteJid: string,
) {
  const resp = await evoFetch(`/chat/findMessages/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ where: { key: { remoteJid } } }),
  });
  if (!resp.ok) {
    console.error("sync messages error", resp.body);
    return 0;
  }

  const messages = extractArray(resp.body, ["messages", "data", "records", "result"])
    .map((m) => parseMessage(m))
    .filter((m) => m && m.wa_message_id) as ParsedMessage[];

  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const recent = messages.slice(-200);
  let inserted = 0;

  for (const msg of recent) {
    const { data: exists } = await admin
      .from("wa_mensajes")
      .select("id")
      .eq("chat_id", chatId)
      .eq("wa_message_id", msg.wa_message_id)
      .maybeSingle();
    if (exists) continue;

    const insert = await admin.from("wa_mensajes").insert({
      chat_id: chatId,
      hotel_id: hotelId,
      direccion: msg.direccion,
      tipo: msg.tipo,
      contenido: msg.contenido,
      media_url: msg.media_url,
      media_mime: msg.media_mime,
      wa_message_id: msg.wa_message_id,
      status: msg.status,
      from_bot: false,
      timestamp: msg.timestamp,
    });
    if (!insert.error) inserted += 1;
  }

  const last = recent.at(-1);
  if (last) {
    await admin
      .from("wa_chats")
      .update({
        ultimo_mensaje: last.contenido || `[${last.tipo}]`,
        ultima_actividad: last.timestamp,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId);
  }

  return inserted;
}

type ParsedMessage = {
  direccion: "in" | "out";
  tipo: string;
  contenido: string;
  media_url: string | null;
  media_mime: string | null;
  wa_message_id: string;
  status: string;
  timestamp: string;
};

function parseMessage(raw: AnyRecord): ParsedMessage | null {
  const key = (raw.key as AnyRecord | undefined) ?? {};
  const waMessageId = (key.id as string | undefined) ?? getString(raw, ["id", "messageId"]);
  if (!waMessageId) return null;

  const msg = unwrapMessage((raw.message as AnyRecord | undefined) ?? raw);
  let tipo = "text";
  let contenido = "";
  let media_url: string | null = null;
  let media_mime: string | null = null;

  if (msg.conversation) {
    contenido = String(msg.conversation);
  } else if ((msg.extendedTextMessage as { text?: string } | undefined)?.text) {
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
    const dm = msg.documentMessage as { caption?: string; mimetype?: string; url?: string; fileName?: string };
    contenido = dm.fileName ?? dm.caption ?? "";
    media_mime = dm.mimetype ?? null;
    media_url = dm.url ?? null;
  } else if (msg.stickerMessage) {
    tipo = "sticker";
  } else if (msg.locationMessage) {
    tipo = "location";
    const lm = msg.locationMessage as { degreesLatitude?: number; degreesLongitude?: number };
    contenido = `${lm.degreesLatitude ?? ""},${lm.degreesLongitude ?? ""}`;
  } else {
    contenido = "[mensaje no soportado]";
  }

  return {
    direccion: key.fromMe ? "out" : "in",
    tipo,
    contenido,
    media_url,
    media_mime,
    wa_message_id: waMessageId,
    status: "delivered",
    timestamp: getTimestamp(raw) || new Date().toISOString(),
  };
}

function unwrapMessage(message: AnyRecord): AnyRecord {
  let current = message;
  for (let i = 0; i < 4; i += 1) {
    const next = (current.ephemeralMessage as AnyRecord | undefined)?.message
      ?? (current.viewOnceMessage as AnyRecord | undefined)?.message
      ?? (current.viewOnceMessageV2 as AnyRecord | undefined)?.message
      ?? (current.documentWithCaptionMessage as AnyRecord | undefined)?.message;
    if (!next || typeof next !== "object") break;
    current = next as AnyRecord;
  }
  return current;
}

function extractArray(body: unknown, keys: string[]): AnyRecord[] {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (!isRecord(body)) return [];
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = extractArray(value, ["records", "items", "data"]);
      if (nested.length) return nested;
    }
  }
  return Object.values(body).find((value) => Array.isArray(value))?.filter(isRecord) as AnyRecord[] ?? [];
}

function getRemoteJid(chat: AnyRecord) {
  const key = chat.key as AnyRecord | undefined;
  return getString(chat, ["remoteJid", "jid", "id", "chatId"]) || (key?.remoteJid as string | undefined) || "";
}

function getLastText(chat: AnyRecord) {
  const last = (chat.lastMessage as AnyRecord | undefined) ?? (chat.message as AnyRecord | undefined) ?? chat;
  const msg = unwrapMessage((last.message as AnyRecord | undefined) ?? last);
  return String(
    msg.conversation
      ?? (msg.extendedTextMessage as { text?: string } | undefined)?.text
      ?? (msg.imageMessage as { caption?: string } | undefined)?.caption
      ?? (msg.videoMessage as { caption?: string } | undefined)?.caption
      ?? (msg.documentMessage as { fileName?: string; caption?: string } | undefined)?.fileName
      ?? (msg.documentMessage as { caption?: string } | undefined)?.caption
      ?? "",
  );
}

function getTimestamp(record: AnyRecord) {
  const value = record.messageTimestamp
    ?? record.conversationTimestamp
    ?? record.updatedAt
    ?? record.createdAt
    ?? (record.lastMessage as AnyRecord | undefined)?.messageTimestamp;
  if (!value) return null;
  if (typeof value === "number") return new Date(value > 9999999999 ? value : value * 1000).toISOString();
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n) && /^\d+$/.test(value)) return new Date(n > 9999999999 ? n : n * 1000).toISOString();
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function getString(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function getNumber(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}