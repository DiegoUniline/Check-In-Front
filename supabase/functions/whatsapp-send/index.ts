import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { cleanPhone, corsHeaders, evoFetch } from '../_shared/evolution.ts';

/**
 * Envía un mensaje de WhatsApp vía Evolution (WhatsApp vinculado por QR).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { hotel_id, phone, template_key, vars = {}, reserva_id } = body;
    let { message } = body;

    if (!hotel_id || !phone) {
      return new Response(JSON.stringify({ error: 'hotel_id y phone son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hotel, error: hErr } = await supabase
      .from('hotels')
      .select('id, nombre')
      .eq('id', hotel_id)
      .single();
    if (hErr || !hotel) throw new Error('Hotel no encontrado');

    const { data: inst } = await supabase
      .from('wa_instancias')
      .select('instance_name, estado')
      .eq('hotel_id', hotel_id)
      .maybeSingle();
    if (!inst || inst.estado !== 'connected') {
      return new Response(
        JSON.stringify({ error: 'WhatsApp no está vinculado. Conecta el QR en WhatsApp → Conexión.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (template_key) {
      const { data: tpl } = await supabase
        .from('whatsapp_templates')
        .select('mensaje, activo')
        .eq('hotel_id', hotel_id)
        .eq('template_key', template_key)
        .maybeSingle();
      if (tpl?.activo && tpl?.mensaje) {
        message = tpl.mensaje;
      }
      // si no existe/inactiva, se usa el `message` inline si vino en el body
    }
    if (!message) {
      return new Response(JSON.stringify({ error: 'message o template_key requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allVars: Record<string, string> = { hotel: hotel.nombre, ...vars };
    message = message.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m: string, k: string) => allVars[k] ?? '');

    const number = String(phone).includes('@g.us') ? String(phone) : cleanPhone(String(phone));

    const resp = await evoFetch(`/message/sendText/${inst.instance_name}`, {
      method: 'POST',
      body: JSON.stringify({ number, text: String(message) }),
    });
    const ok = resp.ok;
    const respText = typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body);

    await supabase.from('whatsapp_envios').insert({
      hotel_id,
      reserva_id: reserva_id ?? null,
      template_key: template_key ?? 'manual',
      phone: number,
      mensaje: message,
      status: ok ? 'sent' : 'error',
      error: ok ? null : respText.slice(0, 500),
    });

    return new Response(JSON.stringify({ ok, response: resp.body }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});