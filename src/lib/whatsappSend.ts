import { supabase } from '@/integrations/supabase/client';

/**
 * Envía un mensaje de WhatsApp al huésped usando la instancia del hotel.
 * Si existe una plantilla activa con el `template_key` la usa; si no, usa
 * el `mensaje` por defecto pasado aquí. Falla en silencio (no bloquea la UI).
 */
export async function enviarWhatsAppReserva(params: {
  hotel_id: string;
  telefono?: string | null;
  template_key: 'confirmacion_reserva' | 'bienvenida_checkin' | 'recordatorio_checkin' | 'gracias_checkout';
  mensajeFallback: string;
  reserva_id?: string | null;
  vars: Record<string, string | number | null | undefined>;
}): Promise<boolean> {
  try {
    if (!params.telefono || !params.hotel_id) return false;
    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries(params.vars)) vars[k] = v == null ? '' : String(v);

    const { error } = await supabase.functions.invoke('whatsapp-send', {
      body: {
        hotel_id: params.hotel_id,
        phone: params.telefono,
        template_key: params.template_key,
        message: params.mensajeFallback,
        vars,
        reserva_id: params.reserva_id ?? null,
      },
    });
    return !error;
  } catch (err) {
    console.warn('WhatsApp send failed:', err);
    return false;
  }
}

export const MENSAJES_DEFAULT = {
  confirmacion_reserva:
    '¡Hola {{nombre}}! 🎉\n\nTu reserva en *{{hotel}}* está confirmada ✅\n\n📄 Reserva: {{numero_reserva}}\n🛏️ Habitación: {{tipo_habitacion}}\n📅 Check-in: {{fecha_checkin}}\n📅 Check-out: {{fecha_checkout}}\n🌙 Noches: {{noches}}\n💰 Total: {{total}}\n\n¡Te esperamos! Cualquier duda, responde este mensaje.',
  bienvenida_checkin:
    '¡Bienvenido {{nombre}}! 🏨\n\nTu check-in en *{{hotel}}* está completo ✅\n\n🛏️ Habitación: {{habitacion}}\n📅 Check-out: {{fecha_checkout}} (12:00 hrs)\n\nEsperamos que disfrutes tu estancia. Estamos a tus órdenes. 🙌',
} as const;