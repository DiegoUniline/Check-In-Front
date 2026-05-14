import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WHATSAPI_URL = 'https://itxrxxoykvxpwflndvea.supabase.co/functions/v1/api-proxy';

/**
 * Envía un mensaje de WhatsApp usando el token del hotel.
 * Body:
 *   - hotel_id (req)
 *   - phone (req) — ej. "5213171035768"
 *   - message (opcional si template_key)
 *   - template_key (opcional) — busca plantilla y aplica variables de `vars`
 *   - vars (opcional) — objeto { nombre, hotel, ... } para reemplazar {{var}}
 *   - reserva_id (opcional) — para registrar y evitar duplicados
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { hotel_id, phone, template_key, vars = {}, reserva_id } = body;
    let { message } = body;

    if (!hotel_id || !phone) {
      return new Response(JSON.stringify({ error: 'hotel_id y phone son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hotel, error: hErr } = await supabase
      .from('hotels')
      .select('id, nombre, whatsapp_token, whatsapp_enabled')
      .eq('id', hotel_id).single();
    if (hErr || !hotel) throw new Error('Hotel no encontrado');
    if (!hotel.whatsapp_enabled || !hotel.whatsapp_token) {
      return new Response(JSON.stringify({ error: 'WhatsApp no está activado o falta el token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (template_key) {
      const { data: tpl } = await supabase
        .from('whatsapp_templates')
        .select('mensaje, activo')
        .eq('hotel_id', hotel_id).eq('template_key', template_key).single();
      if (!tpl || !tpl.activo) {
        return new Response(JSON.stringify({ error: 'Plantilla no encontrada o inactiva' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      message = tpl.mensaje;
    }
    if (!message) {
      return new Response(JSON.stringify({ error: 'message o template_key requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reemplazar {{variables}}
    const allVars: Record<string, string> = { hotel: hotel.nombre, ...vars };
    message = message.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => allVars[k] ?? '');

    // Limpia phone: solo dígitos y/o sufijo @g.us
    const cleanPhone = String(phone).includes('@g.us')
      ? String(phone)
      : String(phone).replace(/\D/g, '');

    // Envío al api-proxy
    const resp = await fetch(WHATSAPI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': hotel.whatsapp_token,
      },
      body: JSON.stringify({
        action: 'send-text',
        phone: cleanPhone,
        message,
      }),
    });
    const respText = await resp.text();
    const ok = resp.ok;

    // Registrar envío
    await supabase.from('whatsapp_envios').insert({
      hotel_id,
      reserva_id: reserva_id ?? null,
      template_key: template_key ?? 'manual',
      phone: cleanPhone,
      mensaje: message,
      status: ok ? 'sent' : 'error',
      error: ok ? null : respText.slice(0, 500),
    });

    return new Response(JSON.stringify({ ok, response: respText }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});