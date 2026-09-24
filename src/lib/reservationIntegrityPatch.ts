import api, { todayLocal } from '@/lib/api';
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
      .select('habitacion_id,fecha_checkin,fecha_checkout,estado,checkin_realizado,checkout_realizado')
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
        let reservationCheckout = effectiveStayCheckout(reservationCheckin, String(reservation.fecha_checkout || ''));
        // Huésped con salida vencida sin check-out: la habitación sigue ocupada hoy.
        if (reservation.checkin_realizado && !reservation.checkout_realizado) {
          const tomorrow = addStayDay(todayLocal());
          if (reservationCheckout < tomorrow) reservationCheckout = tomorrow;
        }
        return reservationCheckin < effectiveCheckout && reservationCheckout > checkin.slice(0, 10);
      })
      .map((reservation: any) => reservation.habitacion_id)
      .filter(Boolean));
    return (habitaciones || []).filter((h: any) => !ocupadas.has(h.id));
  };

  // El servidor valida habitación, fechas y estancias activas en una sola
  // transacción (complete_reservation_checkin); aquí sólo se resuelve la habitación.
  client.checkin = async (id: string, habitacionId?: string) => {
    const hotelId = client.getHotelId?.();
    const { data: reserva, error: reservaError } = await db
      .from('reservas')
      .select('id,estado,checkin_realizado,habitacion_id')
      .eq('id', id)
      .eq('hotel_id', hotelId)
      .maybeSingle();
    if (reservaError) throw reservaError;
    if (!reserva) throw new Error('Reserva no encontrada');
    if (reserva.checkin_realizado) return reserva;
    if (['Cancelada', 'NoShow', 'CheckOut'].includes(reserva.estado)) {
      throw new Error(`No se puede hacer check-in a una reserva en estado ${reserva.estado}`);
    }
    const roomId = habitacionId || reserva.habitacion_id;
    if (!roomId) throw new Error('Selecciona una habitación antes de hacer check-in');
    return originalCheckin(id, roomId);
  };
}

export {};
