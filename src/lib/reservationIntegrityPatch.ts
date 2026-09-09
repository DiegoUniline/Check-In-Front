import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

const PATCH_KEY = '__hospedapp_reservation_integrity_patch_v1__';
const root = globalThis as any;

const addStayDay = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const effectiveStayCheckout = (checkin: string, checkout: string) => (
  checkout.slice(0, 10) <= checkin.slice(0, 10) ? addStayDay(checkin) : checkout.slice(0, 10)
);

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;
  const client = api as any;
  const db = supabase as any;
  const originalCheckin = client.checkin.bind(client);

  client.getHabitacionesDisponibles = async (checkin: string, checkout: string, tipoId?: string, excludeReservaId?: string) => {
    const hotelId = client.getHotelId?.();
    const effectiveCheckout = effectiveStayCheckout(checkin, checkout);
    let habitacionesQuery = db
      .from('habitaciones')
      .select('*, tipos_habitacion(*)')
      .eq('hotel_id', hotelId)
      .not('estado_habitacion', 'in', '(Mantenimiento,FueraDeServicio,Bloqueada)');
    if (tipoId) habitacionesQuery = habitacionesQuery.eq('tipo_habitacion_id', tipoId);

    let reservasQuery = db.from('reservas')
      .select('habitacion_id,fecha_checkin,fecha_checkout')
      .eq('hotel_id', hotelId)
      .in('estado', ['Pendiente', 'Confirmada', 'CheckIn', 'Hospedado'])
      .lt('fecha_checkin', effectiveCheckout);
    if (excludeReservaId) reservasQuery = reservasQuery.neq('id', excludeReservaId);

    const [{ data: habitaciones, error: habError }, { data: conflictos, error: reservasError }] = await Promise.all([
      habitacionesQuery,
      reservasQuery,
    ]);
    if (habError) throw habError;
    if (reservasError) throw reservasError;

    const ocupadas = new Set((conflictos || [])
      .filter((reservation: any) => {
        const reservationCheckin = String(reservation.fecha_checkin || '').slice(0, 10);
        const reservationCheckout = effectiveStayCheckout(reservationCheckin, String(reservation.fecha_checkout || ''));
        return reservationCheckin < effectiveCheckout && reservationCheckout > checkin.slice(0, 10);
      })
      .map((reservation: any) => reservation.habitacion_id)
      .filter(Boolean));
    return (habitaciones || []).filter((h: any) => !ocupadas.has(h.id));
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

    const reservationCheckin = String(reserva.fecha_checkin || '').slice(0, 10);
    const reservationCheckout = effectiveStayCheckout(reservationCheckin, String(reserva.fecha_checkout || ''));
    const { data: conflictos, error: conflictoError } = await db
      .from('reservas')
      .select('id,numero_reserva,fecha_checkin,fecha_checkout')
      .eq('hotel_id', hotelId)
      .eq('habitacion_id', roomId)
      .in('estado', ['Confirmada', 'CheckIn'])
      .neq('id', id)
      .lt('fecha_checkin', reservationCheckout);
    if (conflictoError) throw conflictoError;
    const conflict = (conflictos || []).find((other: any) => {
      const otherCheckin = String(other.fecha_checkin || '').slice(0, 10);
      const otherCheckout = effectiveStayCheckout(otherCheckin, String(other.fecha_checkout || ''));
      return otherCheckin < reservationCheckout && otherCheckout > reservationCheckin;
    });
    if (conflict) {
      throw new Error(`La habitación ya fue asignada a otra reserva${conflict.numero_reserva ? ` (${conflict.numero_reserva})` : ''}`);
    }

    return originalCheckin(id, roomId);
  };
}

export {};
