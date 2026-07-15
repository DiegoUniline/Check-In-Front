import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { cleanPhone, corsHeaders, evoFetch } from '../_shared/evolution.ts';

/**
 * Cron de WhatsApp (cada hora). Envía mensajes automáticos vía Evolution
 * (WhatsApp vinculado por QR de cada hotel).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  const hour = now.getUTCHours();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const today = ymd(now);
  const tomorrow = ymd(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const log = { recordatorios: 0, checkouts: 0, errores: [] as string[] };

  if (hour >= 16) {
    log.recordatorios = await procesar(supabase, {
      template_key: 'recordatorio_checkin',
      filterFechaCol: 'fecha_checkin',
      fecha: tomorrow,
      soloWeb: false,
      log,
    });
  }
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
  opts: {
    template_key: string;
    filterFechaCol: string;
    fecha: string;
    soloWeb: boolean;
    log: { errores: string[] };
  },
) {
  let q = supabase
    .from('reservas')
    .select('id, hotel_id, numero_reserva, cliente_id, fecha_checkin, fecha_checkout, habitacion_id, origen')
    .eq(opts.filterFechaCol, opts.fecha)
    .neq('estado', 'Cancelada');
  if (opts.soloWeb) q = q.eq('origen', 'Web');
  const { data: reservas, error } = await q;
  if (error) {
    opts.log.errores.push(error.message);
    return 0;
  }
  if (!reservas?.length) return 0;

  let enviados = 0;
  for (const r of reservas) {
    try {
      const { data: ya } = await supabase
        .from('whatsapp_envios')
        .select('id')
        .eq('reserva_id', r.id)
        .eq('template_key', opts.template_key)
        .maybeSingle();
      if (ya) continue;

      const { data: hotel } = await supabase
        .from('hotels')
        .select('nombre')
        .eq('id', r.hotel_id)
        .single();
      if (!hotel) continue;

      const { data: inst } = await supabase
        .from('wa_instancias')
        .select('instance_name, estado')
        .eq('hotel_id', r.hotel_id)
        .maybeSingle();
      if (!inst || inst.estado !== 'connected') continue;

      const { data: tpl } = await supabase
        .from('whatsapp_templates')
        .select('mensaje, activo')
        .eq('hotel_id', r.hotel_id)
        .eq('template_key', opts.template_key)
        .maybeSingle();
      if (!tpl?.activo || !tpl?.mensaje) continue;

      const { data: cliente } = await supabase
        .from('clientes')
        .select('nombre, apellido_paterno, telefono')
        .eq('id', r.cliente_id)
        .maybeSingle();
      if (!cliente?.telefono) continue;

      let habNumero = '';
      if (r.habitacion_id) {
        const { data: hab } = await supabase
          .from('habitaciones')
          .select('numero')
          .eq('id', r.habitacion_id)
          .maybeSingle();
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
      const mensaje = tpl.mensaje.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m: string, k: string) => vars[k] ?? '');
      const phone = cleanPhone(String(cliente.telefono));
      if (!phone) continue;

      const resp = await evoFetch(`/message/sendText/${inst.instance_name}`, {
        method: 'POST',
        body: JSON.stringify({ number: phone, text: mensaje }),
      });
      const ok = resp.ok;
      const respText = typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body);

      await supabase.from('whatsapp_envios').insert({
        hotel_id: r.hotel_id,
        reserva_id: r.id,
        template_key: opts.template_key,
        phone,
        mensaje,
        status: ok ? 'sent' : 'error',
        error: ok ? null : respText.slice(0, 500),
      });
      if (ok) enviados++;
    } catch (e) {
      opts.log.errores.push((e as Error).message);
    }
  }
  return enviados;
}