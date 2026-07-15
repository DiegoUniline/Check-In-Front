import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, evoFetch, json } from "../_shared/evolution.ts";

/** Consulta a Evolution el estado de la instancia del hotel y refresca la DB. */
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
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const { data: profile } = await admin
      .from("profiles")
      .select("hotel_id, hotel_activo_id")
      .eq("id", userId)
      .single();
    const hotelId = profile?.hotel_activo_id ?? profile?.hotel_id;
    if (!hotelId) return json({ error: "Hotel no encontrado" }, 400);

    const { data: inst } = await admin
      .from("wa_instancias")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (!inst) return json({ estado: "none" });

    const stateResp = await evoFetch(
      `/instance/connectionState/${inst.instance_name}`,
    );
    let estado = inst.estado;
    let phone = inst.phone_number;
    if (stateResp.ok && typeof stateResp.body === "object" && stateResp.body) {
      const b = stateResp.body as Record<string, unknown>;
      const st = ((b.instance as Record<string, unknown> | undefined)?.state ??
        b.state) as string | undefined;
      if (st === "open") estado = "connected";
      else if (st === "connecting") estado = "connecting";
      else if (st === "close") estado = "disconnected";
      const owner = (b.instance as Record<string, unknown> | undefined)?.owner as
        | string
        | undefined;
      if (owner) phone = String(owner).split("@")[0];
    }

    // Si conectado, pedir QR ya no hace falta
    let qr = inst.qr;
    if (estado !== "connected" && estado !== "disconnected") {
      const c = await evoFetch(`/instance/connect/${inst.instance_name}`);
      if (c.ok && typeof c.body === "object" && c.body) {
        const cb = c.body as Record<string, unknown>;
        qr = (cb.base64 as string) ?? (cb.code as string) ?? qr;
      }
    } else if (estado === "connected") {
      qr = null;
    }

    await admin
      .from("wa_instancias")
      .update({
        estado,
        qr,
        phone_number: phone,
        connected_at: estado === "connected" && !inst.connected_at
          ? new Date().toISOString()
          : inst.connected_at,
        last_status_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", inst.id);

    return json({ estado, qr, phone, instance: inst.instance_name });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});