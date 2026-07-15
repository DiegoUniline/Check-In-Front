import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, evoFetch, json } from "../_shared/evolution.ts";

/**
 * Crea (o recupera) la instancia Evolution del hotel del usuario logueado.
 * Configura webhook para eventos entrantes. Devuelve QR base64 y estado.
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
    const { data: userData, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { data: profile } = await admin
      .from("profiles")
      .select("hotel_id, hotel_activo_id")
      .eq("id", userId)
      .single();
    const hotelId = profile?.hotel_activo_id ?? profile?.hotel_id;
    if (!hotelId) return json({ error: "No se encontró el hotel del usuario" }, 400);

    // 1) Buscar o crear registro local
    let { data: inst } = await admin
      .from("wa_instancias")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${projectUrl}/functions/v1/evolution-webhook`;

    if (!inst) {
      const instanceName = `hotel_${String(hotelId).slice(0, 8)}_${Date.now()
        .toString(36)}`.toLowerCase();
      const insert = await admin
        .from("wa_instancias")
        .insert({
          hotel_id: hotelId,
          instance_name: instanceName,
          estado: "connecting",
          webhook_url: webhookUrl,
        })
        .select("*")
        .single();
      if (insert.error) throw insert.error;
      inst = insert.data;
    }

    // 2) Crear (o re-crear) en Evolution
    const createResp = await evoFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: inst!.instance_name,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
          ],
        },
      }),
    });

    let qr: string | null = null;
    let status = "connecting";
    const body = createResp.body as Record<string, unknown> | string;

    if (createResp.ok && typeof body === "object" && body) {
      const qrObj = (body as { qrcode?: { base64?: string; code?: string } }).qrcode;
      qr = qrObj?.base64 ?? qrObj?.code ?? null;
      status = "qr";
    } else if (createResp.status === 409 || createResp.status === 403) {
      // Ya existe: pedir QR directo
      const c = await evoFetch(`/instance/connect/${inst!.instance_name}`);
      if (c.ok && typeof c.body === "object" && c.body) {
        const cb = c.body as Record<string, unknown>;
        qr = (cb.base64 as string) ?? (cb.code as string) ?? null;
        status = qr ? "qr" : "connecting";
      }
    } else {
      return json({ error: "Evolution create fallo", details: createResp.body }, 502);
    }

    // Asegurar webhook (Evolution v2 requiere endpoint dedicado)
    try {
      await evoFetch(`/webhook/set/${inst!.instance_name}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: true,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "CONNECTION_UPDATE",
              "QRCODE_UPDATED",
            ],
          },
        }),
      });
    } catch (e) {
      console.error("webhook/set fallo", e);
    }

    await admin
      .from("wa_instancias")
      .update({
        estado: status,
        qr,
        webhook_url: webhookUrl,
        last_status_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", inst!.id);

    return json({ ok: true, instance: inst!.instance_name, qr, estado: status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});