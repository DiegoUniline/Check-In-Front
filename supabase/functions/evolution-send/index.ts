import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { cleanPhone, corsHeaders, evoFetch, json } from "../_shared/evolution.ts";

/**
 * Envía un mensaje (texto/imagen/audio/documento) por WhatsApp vía Evolution.
 * Body:
 *  - chat_id (opcional) → si viene, se usa para inferir hotel/instancia y actualizar el hilo
 *  - phone (opcional si viene chat_id)
 *  - tipo: 'text' | 'image' | 'audio' | 'document'
 *  - contenido: texto o caption
 *  - media_url, media_mime: para media
 *  - from_bot: bool
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
    const { data: userData } = await userClient.auth.getUser(token);
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const {
      chat_id,
      phone: phoneIn,
      tipo = "text",
      contenido = "",
      media_url,
      media_mime,
      from_bot = false,
    } = (await req.json()) as Record<string, unknown>;

    // Resolver hotel + chat
    let hotelId: string | null = null;
    let chat: Record<string, unknown> | null = null;
    let phone = cleanPhone(String(phoneIn ?? ""));
    if (chat_id) {
      const { data } = await admin
        .from("wa_chats")
        .select("*")
        .eq("id", chat_id)
        .single();
      chat = data;
      hotelId = data?.hotel_id ?? null;
      phone = data?.phone ?? phone;
    } else {
      // por perfil
      const { data: profile } = await admin
        .from("profiles")
        .select("hotel_id, hotel_activo_id")
        .eq("id", userId)
        .single();
      hotelId = profile?.hotel_activo_id ?? profile?.hotel_id ?? null;
    }
    if (!hotelId) return json({ error: "Hotel no resuelto" }, 400);
    if (!phone) return json({ error: "phone requerido" }, 400);

    const { data: inst } = await admin
      .from("wa_instancias")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();
    if (!inst || inst.estado !== "connected") {
      return json({ error: "Instancia WhatsApp no está conectada" }, 400);
    }

    const number = phone;
    let path = "";
    let payload: Record<string, unknown> = {};
    if (tipo === "text") {
      path = `/message/sendText/${inst.instance_name}`;
      payload = { number, text: String(contenido ?? "") };
    } else if (tipo === "image" || tipo === "video" || tipo === "document") {
      path = `/message/sendMedia/${inst.instance_name}`;
      payload = {
        number,
        mediatype: tipo,
        media: media_url,
        mimetype: media_mime,
        caption: contenido ?? "",
        fileName: (contenido as string) || `archivo.${tipo === "image" ? "jpg" : "bin"}`,
      };
    } else if (tipo === "audio") {
      path = `/message/sendWhatsAppAudio/${inst.instance_name}`;
      payload = { number, audio: media_url };
    } else {
      return json({ error: "tipo inválido" }, 400);
    }

    const resp = await evoFetch(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      return json({ error: "Envío fallo", details: resp.body }, 502);
    }

    const wa_message_id =
      typeof resp.body === "object" && resp.body
        ? ((resp.body as Record<string, unknown>).key as Record<string, unknown> | undefined)
          ?.id as string | undefined
        : undefined;

    // Asegurar chat
    let chatId = chat_id as string | null;
    if (!chatId) {
      const wa_id = `${phone}@s.whatsapp.net`;
      const up = await admin
        .from("wa_chats")
        .upsert(
          {
            hotel_id: hotelId,
            wa_id,
            phone,
            nombre: phone,
            ultima_actividad: new Date().toISOString(),
            ultimo_mensaje: (contenido as string) || `[${tipo}]`,
          },
          { onConflict: "hotel_id,wa_id" },
        )
        .select("id")
        .single();
      chatId = up.data?.id as string;
    } else {
      await admin
        .from("wa_chats")
        .update({
          ultima_actividad: new Date().toISOString(),
          ultimo_mensaje: (contenido as string) || `[${tipo}]`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId);
    }

    await admin.from("wa_mensajes").insert({
      chat_id: chatId,
      hotel_id: hotelId,
      direccion: "out",
      tipo,
      contenido: String(contenido ?? ""),
      media_url: (media_url as string) ?? null,
      media_mime: (media_mime as string) ?? null,
      wa_message_id: wa_message_id ?? null,
      status: "sent",
      from_bot: !!from_bot,
      author_id: userId,
    });

    return json({ ok: true, wa_message_id: wa_message_id ?? null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});