// Reglas únicas de ocupación de una habitación:
//  * Una estancia ocupa [entrada, salida): el día de salida queda libre.
//  * Una estancia del día (entrada = salida) ocupa hasta el día siguiente.
//  * Un huésped con check-in y sin check-out sigue ocupando la habitación
//    aunque su fecha de salida ya haya pasado.
//  * Canceladas, no-show y con check-out ya no ocupan.

const addDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

export const isInHouseStay = (reserva: any) =>
  ['CheckIn', 'Hospedado'].includes(String(reserva?.estado || ''))
  && Boolean(reserva?.checkin_realizado)
  && !reserva?.checkout_realizado;

export const occupiesRoom = (reserva: any) =>
  !['Cancelada', 'NoShow', 'CheckOut'].includes(String(reserva?.estado || ''))
  && !reserva?.checkout_realizado;

/** Día (exclusivo) hasta el que la reserva ocupa la habitación. */
export const occupancyEnd = (reserva: any, todayKey: string) => {
  const checkin = String(reserva?.fecha_checkin || '').slice(0, 10);
  const rawCheckout = String(reserva?.fecha_checkout || '').slice(0, 10);
  const checkout = rawCheckout <= checkin ? addDay(checkin) : rawCheckout;
  if (!isInHouseStay(reserva)) return checkout;
  const tomorrow = addDay(todayKey);
  return checkout < tomorrow ? tomorrow : checkout;
};

/** ¿La reserva ocupa la habitación la noche de `day` (YYYY-MM-DD)? */
export const occupiesNight = (reserva: any, day: string, todayKey: string) => {
  if (!occupiesRoom(reserva)) return false;
  const checkin = String(reserva?.fecha_checkin || '').slice(0, 10);
  return Boolean(checkin) && checkin <= day && day < occupancyEnd(reserva, todayKey);
};

/** ¿La salida de esta reserva está pendiente hoy (incluye salidas vencidas)? */
export const departsTodayOrOverdue = (reserva: any, todayKey: string) =>
  isInHouseStay(reserva) && String(reserva?.fecha_checkout || '').slice(0, 10) <= todayKey;
