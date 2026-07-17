// Temporadas: ajustes de precio por rango de fechas.
// Persistidas en Supabase (tabla `public.temporadas`) para que la configuración
// esté disponible desde cualquier dispositivo, incluida la página pública.
// En cliente se mantiene una caché en memoria por hotel para poder resolver
// tarifas de forma síncrona en los formularios.
// Prioridad al resolver: habitación específica > tipo de habitación > todas.
// Si varias temporadas coinciden por fecha, gana la de mayor `prioridad`, luego la más específica.
import { supabase } from '@/integrations/supabase/client';

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

// Caché en memoria por hotel. Se llena con loadTemporadas() y se mantiene
// sincronizada tras cada upsert/delete para que resolver funcione síncrono.
const cache: Record<string, Temporada[]> = {};
const loadPromises: Record<string, Promise<Temporada[]>> = {};

const normalize = (row: any): Temporada => ({
  id: String(row.id),
  nombre: String(row.nombre ?? ''),
  fecha_inicio: String(row.fecha_inicio),
  fecha_fin: String(row.fecha_fin),
  tipo_ajuste: (row.tipo_ajuste ?? 'porcentaje') as TipoAjuste,
  valor: Number(row.valor) || 0,
  alcance: (row.alcance ?? 'todos') as AlcanceTemporada,
  tipo_habitacion_id: row.tipo_habitacion_id ?? null,
  habitacion_id: row.habitacion_id ?? null,
  prioridad: Number(row.prioridad) || 0,
  activo: row.activo !== false,
});

export const loadTemporadas = async (hotelId?: string): Promise<Temporada[]> => {
  const hid = hotelId || getHotelId();
  if (!hid || hid === 'default') { cache[hid] = []; return []; }
  if (loadPromises[hid]) return loadPromises[hid];
  const p = (async () => {
    const { data, error } = await (supabase.from('temporadas') as any)
      .select('*')
      .eq('hotel_id', hid);
    if (error) { cache[hid] = cache[hid] || []; return cache[hid]; }
    const list = (Array.isArray(data) ? data : []).map(normalize);
    cache[hid] = list;
    return list;
  })();
  loadPromises[hid] = p;
  try { return await p; } finally { delete loadPromises[hid]; }
};

export const listTemporadas = (hotelId?: string): Temporada[] => {
  const hid = hotelId || getHotelId();
  return cache[hid] || [];
};

export const upsertTemporada = async (t: Temporada, hotelId?: string): Promise<Temporada> => {
  const hid = hotelId || getHotelId();
  const payload: any = {
    id: t.id,
    hotel_id: hid,
    nombre: t.nombre,
    fecha_inicio: t.fecha_inicio,
    fecha_fin: t.fecha_fin,
    tipo_ajuste: t.tipo_ajuste,
    valor: Number(t.valor) || 0,
    alcance: t.alcance,
    tipo_habitacion_id: t.alcance === 'tipo' ? t.tipo_habitacion_id || null : null,
    habitacion_id: t.alcance === 'habitacion' ? t.habitacion_id || null : null,
    prioridad: Number(t.prioridad) || 0,
    activo: !!t.activo,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await (supabase.from('temporadas') as any)
    .upsert(payload, { onConflict: 'id' })
    .select()
    .maybeSingle();
  if (error) throw error;
  const saved = normalize(data || payload);
  const list = cache[hid] || [];
  const idx = list.findIndex((x) => x.id === saved.id);
  if (idx >= 0) list[idx] = saved; else list.push(saved);
  cache[hid] = list;
  return saved;
};

export const deleteTemporada = async (id: string, hotelId?: string): Promise<void> => {
  const hid = hotelId || getHotelId();
  const { error } = await (supabase.from('temporadas') as any).delete().eq('id', id);
  if (error) throw error;
  cache[hid] = (cache[hid] || []).filter((t) => t.id !== id);
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