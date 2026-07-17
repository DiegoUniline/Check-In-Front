// Temporadas: ajustes de precio por rango de fechas.
// Guardado en localStorage por hotel (patrón consistente con impuestosDefault).
// Prioridad al resolver: habitación específica > tipo de habitación > todas.
// Si varias temporadas coinciden por fecha, gana la de mayor `prioridad`, luego la más específica.

export type TipoAjuste = 'porcentaje' | 'monto' | 'absoluto';
export type AlcanceTemporada = 'todos' | 'tipo' | 'habitacion';

export interface Temporada {
  id: string;
  nombre: string;
  fecha_inicio: string; // yyyy-MM-dd
  fecha_fin: string;    // yyyy-MM-dd
  tipo_ajuste: TipoAjuste;
  valor: number;        // % si porcentaje, $ si monto o absoluto
  alcance: AlcanceTemporada;
  tipo_habitacion_id?: string | null;
  habitacion_id?: string | null;
  prioridad: number;
  activo: boolean;
}

const getHotelId = (): string => {
  try { return localStorage.getItem('hotel_id') || 'default'; } catch { return 'default'; }
};

const keyFor = (hotelId?: string) => `temporadas:hotel:${hotelId || getHotelId()}`;

export const listTemporadas = (hotelId?: string): Temporada[] => {
  try {
    const raw = localStorage.getItem(keyFor(hotelId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: any) => t && t.id && t.fecha_inicio && t.fecha_fin);
  } catch { return []; }
};

export const saveTemporadas = (list: Temporada[], hotelId?: string) => {
  try { localStorage.setItem(keyFor(hotelId), JSON.stringify(list)); } catch { /* ignore */ }
};

export const upsertTemporada = (t: Temporada) => {
  const list = listTemporadas();
  const idx = list.findIndex((x) => x.id === t.id);
  if (idx >= 0) list[idx] = t; else list.push(t);
  saveTemporadas(list);
};

export const deleteTemporada = (id: string) => {
  saveTemporadas(listTemporadas().filter((t) => t.id !== id));
};

const inRange = (dateStr: string, start: string, end: string): boolean => {
  return dateStr >= start && dateStr <= end;
};

// Encuentra la temporada aplicable a una fecha (yyyy-MM-dd) para un tipo/habitación.
export const findTemporadaAplicable = (
  fechaCheckin: string,
  tipoHabitacionId?: string | null,
  habitacionId?: string | null,
  hotelId?: string,
): Temporada | null => {
  const list = listTemporadas(hotelId).filter((t) => t.activo && inRange(fechaCheckin, t.fecha_inicio, t.fecha_fin));
  if (list.length === 0) return null;
  const scoped = list.filter((t) => {
    if (t.alcance === 'todos') return true;
    if (t.alcance === 'tipo') return t.tipo_habitacion_id && t.tipo_habitacion_id === tipoHabitacionId;
    if (t.alcance === 'habitacion') return t.habitacion_id && t.habitacion_id === habitacionId;
    return false;
  });
  if (scoped.length === 0) return null;
  // Prioridad: habitación > tipo > todos ; luego mayor `prioridad`.
  const rankAlcance = (a: AlcanceTemporada) => (a === 'habitacion' ? 3 : a === 'tipo' ? 2 : 1);
  scoped.sort((a, b) => {
    const r = rankAlcance(b.alcance) - rankAlcance(a.alcance);
    if (r !== 0) return r;
    return (b.prioridad || 0) - (a.prioridad || 0);
  });
  return scoped[0];
};

// Devuelve el precio ajustado según la temporada aplicable.
export const aplicarTemporada = (basePrice: number, t: Temporada | null): number => {
  if (!t || !basePrice) return basePrice;
  switch (t.tipo_ajuste) {
    case 'porcentaje':
      return Math.max(0, basePrice + (basePrice * (Number(t.valor) || 0)) / 100);
    case 'monto':
      return Math.max(0, basePrice + (Number(t.valor) || 0));
    case 'absoluto':
      return Math.max(0, Number(t.valor) || 0);
    default:
      return basePrice;
  }
};

export const resolverPrecioTemporada = (
  basePrice: number,
  fechaCheckin: string,
  tipoHabitacionId?: string | null,
  habitacionId?: string | null,
  hotelId?: string,
): { precio: number; temporada: Temporada | null } => {
  const t = findTemporadaAplicable(fechaCheckin, tipoHabitacionId, habitacionId, hotelId);
  return { precio: aplicarTemporada(basePrice, t), temporada: t };
};

export const describirAjuste = (t: Temporada): string => {
  const signo = t.valor >= 0 ? '+' : '';
  if (t.tipo_ajuste === 'porcentaje') return `${signo}${t.valor}%`;
  if (t.tipo_ajuste === 'monto') return `${signo}$${t.valor}`;
  return `= $${t.valor}`;
};

export const newTemporadaId = (): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch { /* ignore */ }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};