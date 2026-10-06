// Bloqueos de habitación por rango de fechas (habitacion_bloqueos).
// fecha_desde = primera noche bloqueada, fecha_hasta = última noche bloqueada.

export type RoomBlock = {
  id: string;
  habitacion_id: string;
  tipo: 'Mantenimiento' | 'FueraDeServicio' | 'Bloqueo';
  fecha_desde: string;
  fecha_hasta: string;
  motivo?: string;
  estado?: string;
  tarea_id?: string | null;
  created_by_nombre?: string | null;
};

export const BLOCK_TIPOS: { value: RoomBlock['tipo']; label: string }[] = [
  { value: 'Mantenimiento', label: 'Mantenimiento / reparación' },
  { value: 'FueraDeServicio', label: 'Fuera de servicio' },
  { value: 'Bloqueo', label: 'Bloqueada (fuera de venta)' },
];

export const blockTipoLabel = (tipo?: string) =>
  BLOCK_TIPOS.find((t) => t.value === tipo)?.label || tipo || 'Bloqueo';

const LEGACY_STATES = ['Mantenimiento', 'FueraDeServicio', 'Bloqueada'];

/** Bandera antigua sin fechas: bloquea todas las fechas hasta liberarla a mano. */
export const legacyRoomBlocked = (room: any) => Boolean(room)
  && !room.bloqueo_id
  && (LEGACY_STATES.includes(String(room.estado_habitacion || ''))
    || String(room.estado_mantenimiento || 'OK').toLowerCase() !== 'ok');

const d10 = (v: any) => String(v || '').slice(0, 10);

const nextDay = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
};

/** ¿El bloqueo cae en alguna noche de la estancia [checkin, checkout)? */
export const blockOverlapsStay = (block: RoomBlock, checkin: string, checkout: string) => {
  const inDay = d10(checkin);
  const outDay = d10(checkout) <= inDay ? nextDay(inDay) : d10(checkout);
  return d10(block.fecha_desde) < outDay && d10(block.fecha_hasta) >= inDay;
};

export const blockCoversNight = (block: RoomBlock, day: string) =>
  d10(day) >= d10(block.fecha_desde) && d10(day) <= d10(block.fecha_hasta);

export const roomBlockedForStay = (blocks: RoomBlock[], roomId: string, checkin: string, checkout: string) =>
  blocks.find((b) => b.habitacion_id === roomId && (b.estado || 'Activo') === 'Activo' && blockOverlapsStay(b, checkin, checkout));
