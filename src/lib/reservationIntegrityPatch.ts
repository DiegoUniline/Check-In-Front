import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

const PATCH_KEY = '__hospedapp_reservation_integrity_patch_v1__';
const root = globalThis as any;

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;
  const client = api as any;
  const db = supabase as any;
  const originalCheckin = client.checkin.bind(client);

  client.getHabitacionesDisponibles = async (checkin: string, checkout: string, tipoId?: string) => {
    const hotelId = client.getHotelId?.();
    let habitacionesQuery = db
      .from('habitaciones')
      .select('*, tipos_habitacion(*)')
      .eq('hotel_id', hotelId)
      .eq('estado_habitacion', 'Disponible');
    if (tipoId) habitacionesQuery = habitacionesQuery.eq('tipo_habitacion_id', tipoId);

    const [{ data: habitaciones, error: habError }, { data: conflictos, error: reservasError }] = await Promise.all([
      habitacionesQuery,
      db.from('reservas')
        .select('habitacion_id')
        .eq('hotel_id', hotelId)
        .in('estado', ['Confirmada', 'CheckIn'])
        .lt('fecha_checkin', checkout)
        .gt('fecha_checkout', checkin),
    ]);
    if (habError) throw habError;
    if (reservasError) throw reservasError;

    const ocupadas = new Set((conflictos || []).map((r: any) => r.habitacion_id).filter(Boolean));
    return (habitaciones || []).filter((h: any) => {
      const limpieza = String(h.estado_limpieza || '').toLowerCase();
      const mantenimiento = String(h.estado_mantenimiento || '').toLowerCase();
      const lista = (!limpieza || limpieza === 'limpia') && (!mantenimiento || mantenimiento === 'ok');
      return lista && !ocupadas.has(h.id);
    });
  };

  client.checkin = async (id: string, habitacionId?: string) => {
    const hotelId = client.getHotelId?.();
    const { data: reserva, error: reservaError } = await db
      .from('reservas')
      .select('id,estado,checkin_realizado,fecha_checkin,fecha_checkout,habitacion_id')
      .eq('id', id)
      .eq('hotel_id', hotelId)
      .maybeSingle();
    if (reservaError) throw reservaError;
    if (!reserva) throw new Error('Reserva no encontrada');
    if (reserva.checkin_realizado || reserva.estado === 'CheckIn') return reserva;
    if (['Cancelada', 'NoShow', 'CheckOut'].includes(reserva.estado)) {
      throw new Error(`No se puede hacer check-in a una reserva en estado ${reserva.estado}`);
    }

    const roomId = habitacionId || reserva.habitacion_id;
    if (!roomId) throw new Error('Selecciona una habitación antes de hacer check-in');

    const { data: habitacion, error: habitacionError } = await db
      .from('habitaciones')
      .select('id,numero,estado_habitacion,estado_limpieza,estado_mantenimiento')
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .maybeSingle();
    if (habitacionError) throw habitacionError;
    if (!habitacion) throw new Error('Habitación no encontrada');

    const limpieza = String(habitacion.estado_limpieza || '').toLowerCase();
    const mantenimiento = String(habitacion.estado_mantenimiento || '').toLowerCase();
    if (habitacion.estado_habitacion !== 'Disponible' || (limpieza && limpieza !== 'limpia') || (mantenimiento && mantenimiento !== 'ok')) {
      throw new Error(`La habitación ${habitacion.numero || ''} ya no está lista para recibir al huésped`);
    }

    const { data: conflictos, error: conflictoError } = await db
      .from('reservas')
      .select('id,numero_reserva')
      .eq('hotel_id', hotelId)
      .eq('habitacion_id', roomId)
      .in('estado', ['Confirmada', 'CheckIn'])
      .neq('id', id)
      .lt('fecha_checkin', reserva.fecha_checkout)
      .gt('fecha_checkout', reserva.fecha_checkin)
      .limit(1);
    if (conflictoError) throw conflictoError;
    if (conflictos?.length) {
      throw new Error(`La habitación ya fue asignada a otra reserva${conflictos[0].numero_reserva ? ` (${conflictos[0].numero_reserva})` : ''}`);
    }

    return originalCheckin(id, roomId);
  };
}

export {};
