import { supabase } from '@/integrations/supabase/client';

export type TipoNotificacion =
  | 'info' | 'success' | 'warning' | 'error'
  | 'reserva_online' | 'pago' | 'mantenimiento' | 'limpieza';

interface CrearParams {
  tipo?: TipoNotificacion;
  titulo: string;
  mensaje?: string;
  url?: string;
  user_id?: string | null; // null = todo el hotel
  metadata?: any;
}

export async function crearNotificacion(p: CrearParams): Promise<void> {
  try {
    const hotel_id = localStorage.getItem('hotel_id');
    if (!hotel_id) return;
    await supabase.from('notificaciones' as any).insert({
      hotel_id,
      user_id: p.user_id ?? null,
      tipo: p.tipo || 'info',
      titulo: p.titulo,
      mensaje: p.mensaje || null,
      url: p.url || null,
      metadata: p.metadata || null,
    });
  } catch (e) {
    console.warn('[notificaciones] no se pudo crear', e);
  }
}

export async function marcarLeida(id: string): Promise<void> {
  await supabase.from('notificaciones' as any).update({ leida: true }).eq('id', id);
}

export async function marcarTodasLeidas(hotelId: string): Promise<void> {
  await supabase.from('notificaciones' as any).update({ leida: true }).eq('hotel_id', hotelId).eq('leida', false);
}