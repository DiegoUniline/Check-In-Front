export type OnlineReservationFilters = { search: string; status: string; roomType: string; from: string; to: string };

const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function filterOnlineReservations<T extends Record<string, any>>(rows: T[], filters: OnlineReservationFilters): T[] {
  const query = normalize(filters.search.trim());
  return rows.filter((row) => {
    if (filters.status !== 'all' && row.estado !== filters.status) return false;
    if (filters.roomType !== 'all' && row.tipo_habitacion_id !== filters.roomType) return false;
    const arrival = String(row.fecha_checkin || '').slice(0, 10);
    if (filters.from && arrival < filters.from) return false;
    if (filters.to && arrival > filters.to) return false;
    return !query || normalize([row.numero_reserva, row.cliente_nombre, row.cliente_email, row.cliente_telefono, row.habitacion_numero].join(' ')).includes(query);
  });
}

export function onlineReservationDateError(reservation: Record<string, any>, today: string): string | null {
  const arrival = String(reservation.fecha_checkin || '').slice(0, 10);
  const departure = String(reservation.fecha_checkout || '').slice(0, 10);
  if (!arrival || !departure || departure < arrival) return 'Las fechas de la reserva no son válidas. Corrígelas antes de aceptar.';
  // Same-day bookings remain valid today. An overnight stay ending today has already expired.
  if (departure < today || (departure === today && arrival < today)) return 'Las fechas de esta reserva ya terminaron. Edita las fechas antes de aceptar.';
  return null;
}

/** Detect changes to the reservation the operator actually reviewed. */
export function onlineReservationSnapshot(reservation: Record<string, any>): string {
  return JSON.stringify(['id', 'cliente_id', 'estado', 'fecha_checkin', 'fecha_checkout', 'habitacion_id', 'tipo_habitacion_id',
    'adultos', 'ninos', 'total', 'updated_at', 'version_operativa', 'checkin_realizado', 'checkout_realizado']
    .map((key) => reservation[key] ?? null));
}
