import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPI_URL = 'https://itxrxxoykvxpwflndvea.supabase.co/functions/v1/api-proxy';

/**
 * Cron de WhatsApp. Se invoca cada hora.
 * - "recordatorio_checkin": cualquier reserva cuya fecha_checkin = mañana (envía 1 vez)
 * - "gracias_checkout": reservas con origen='Web' y fecha_checkout = hoy, a las 9am hora local del servidor
 * Evita duplicados con UNIQUE(reserva_id, template_key) en whatsapp_envios.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  // Hora del cron (UTC). Para el job de check-out usamos ventana 9-10 (hora servidor).
  const hour = now.getUTCHours();

  // Helpers de fecha YYYY-MM-DD
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const today = ymd(now);
  const tomorrow = ymd(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const log = { recordatorios: 0, checkouts: 0, errores: [] as string[] };

  // 1) Recordatorios día antes (corre cada hora pero el UNIQUE evita reenvíos)
  // Para no spamear, sólo enviamos a partir de las 16:00 hora servidor.
  if (hour >= 16) {
    log.recordatorios = await procesar(supabase, {
      template_key: 'recordatorio_checkin',
      filterFechaCol: 'fecha_checkin',
      fecha: tomorrow,
      soloWeb: false,
      log,
    });
  }

  // 2) Gracias check-out a las 9am
  if (hour === 9) {
    log.checkouts = await procesar(supabase, {
      template_key: 'gracias_checkout',
      filterFechaCol: 'fecha_checkout',
      fecha: today,
      soloWeb: true,
      log,
    });
  }

  return new Response(JSON.stringify({ ok: true, ...log }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function procesar(
  supabase: ReturnType<typeof createClient>,
  opts: { template_key: string; filterFechaCol: string; fecha: string; soloWeb: boolean; log: { errores: string[] } }
) {
  let q = supabase
    .from('reservas')
    .select('id, hotel_id, numero_reserva, cliente_id, fecha_checkin, fecha_checkout, habitacion_id, origen')
    .eq(opts.filterFechaCol, opts.fecha)
    .neq('estado', 'Cancelada');
  if (opts.soloWeb) q = q.eq('origen', 'Web');
  const { data: reservas, error } = await q;
  if (error) { opts.log.errores.push(error.message); return 0; }
  if (!reservas?.length) return 0;

  let enviados = 0;
  for (const r of reservas) {
    try {
      // Saltar si ya se envió
      const { data: ya } = await supabase
        .from('whatsapp_envios')
        .select('id')
        .eq('reserva_id', r.id)
        .eq('template_key', opts.template_key)
        .maybeSingle();
      if (ya) continue;

      // Hotel
      const { data: hotel } = await supabase
        .from('hotels')
        .select('nombre, whatsapp_token, whatsapp_enabled')
        .eq('id', r.hotel_id).single();
      if (!hotel?.whatsapp_enabled || !hotel?.whatsapp_token) continue;

      // Plantilla
      const { data: tpl } = await supabase
        .from('whatsapp_templates')
        .select('mensaje, activo')
        .eq('hotel_id', r.hotel_id)
        .eq('template_key', opts.template_key).maybeSingle();
      if (!tpl?.activo || !tpl?.mensaje) continue;

      // Cliente
      const { data: cliente } = await supabase
        .from('clientes').select('nombre, apellido_paterno, telefono')
        .eq('id', r.cliente_id).maybeSingle();
      if (!cliente?.telefono) continue;

      // Habitación
      let habNumero = '';
      if (r.habitacion_id) {
        const { data: hab } = await supabase
          .from('habitaciones').select('numero').eq('id', r.habitacion_id).maybeSingle();
        habNumero = hab?.numero ?? '';
      }

      const vars: Record<string, string> = {
        nombre: [cliente.nombre, cliente.apellido_paterno].filter(Boolean).join(' '),
        hotel: hotel.nombre,
        numero_reserva: r.numero_reserva ?? '',
        fecha_checkin: r.fecha_checkin ?? '',
        fecha_checkout: r.fecha_checkout ?? '',
        habitacion: habNumero,
      };

      const mensaje = tpl.mensaje.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? '');
      const phone = String(cliente.telefono).replace(/\D/g, '');
      if (!phone) continue;

      const resp = await fetch(WHATSAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-token': hotel.whatsapp_token },
        body: JSON.stringify({ action: 'send-text', phone, message: mensaje }),
      });
      const ok = resp.ok;
      const txt = await resp.text();
      await supabase.from('whatsapp_envios').insert({
        hotel_id: r.hotel_id,
        reserva_id: r.id,
        template_key: opts.template_key,
        phone,
        mensaje,
        status: ok ? 'sent' : 'error',
        error: ok ? null : txt.slice(0, 500),
      });
      if (ok) enviados++;
    } catch (e) {
      opts.log.errores.push((e as Error).message);
    }
  }
  return enviados;
}