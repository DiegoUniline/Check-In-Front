// Cliente compartido para Evolution API.
// Todas las funciones lo importan para hablar con el servidor DigitalOcean.

export const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
export const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

export function evoHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    apikey: EVO_KEY,
    ...extra,
  };
}

export async function evoFetch(path: string, init: RequestInit = {}) {
  if (!EVO_URL || !EVO_KEY) {
    throw new Error("Evolution API no está configurado (EVOLUTION_API_URL / EVOLUTION_API_KEY).");
  }
  const url = `${EVO_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      ...evoHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await resp.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { ok: resp.ok, status: resp.status, body };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-evolution-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Sanitiza teléfono a solo dígitos. */
export function cleanPhone(p: string) {
  return String(p ?? "").replace(/\D/g, "");
}

/** Extrae phone y wa_id desde un remoteJid ("5213171035768@s.whatsapp.net"). */
export function parseJid(jid: string): { wa_id: string; phone: string; isGroup: boolean } {
  const isGroup = jid.endsWith("@g.us");
  const phone = cleanPhone(jid.split("@")[0] ?? "");
  return { wa_id: jid, phone, isGroup };
}