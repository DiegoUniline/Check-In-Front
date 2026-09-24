// Configuración de impuestos por defecto para prellenar en Nueva Reserva.
// Fuente de verdad: columna impuestos_default de hotels, tipos_habitacion y
// habitaciones. localStorage sólo es caché para leer de forma síncrona.
//
// Prioridad al pre-cargar: habitación > tipo > hotel > [].
import { supabase } from '@/integrations/supabase/client';

export interface ImpuestoDefault {
  nombre: string;
  tasa: number; // porcentaje 0-100
}

const getHotelId = (): string => {
  try { return localStorage.getItem('hotel_id') || 'default'; } catch { return 'default'; }
};

const read = (key: string): ImpuestoDefault[] | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((x: any) => x && typeof x.nombre === 'string')
      .map((x: any) => ({ nombre: String(x.nombre), tasa: Number(x.tasa) || 0 }));
  } catch {
    return null;
  }
};

const write = (key: string, list: ImpuestoDefault[] | null) => {
  try {
    if (list === null) { localStorage.removeItem(key); return; }
    localStorage.setItem(key, JSON.stringify(list));
  } catch { /* ignore */ }
};

const clean = (v: unknown): ImpuestoDefault[] | null => {
  if (!Array.isArray(v)) return null;
  return v
    .filter((x: any) => x && typeof x.nombre === 'string')
    .map((x: any) => ({ nombre: String(x.nombre), tasa: Number(x.tasa) || 0 }));
};

// Guarda en la base; si falla, avisa (el caché local ya quedó actualizado).
const persist = async (table: 'hotels' | 'tipos_habitacion' | 'habitaciones', id: string, list: ImpuestoDefault[] | null, silent = false) => {
  if (!id || id === 'default') return;
  const { error } = await (supabase as any).from(table).update({ impuestos_default: list }).eq('id', id);
  if (error && !silent) {
    const missing = /impuestos_default|schema cache/i.test(error.message || '');
    window.dispatchEvent(new CustomEvent('vulo:impuestos-default-error', {
      detail: missing ? 'Falta correr el SQL de impuestos por defecto en Supabase.' : error.message,
    }));
  }
};

export const getHotelDefault = (): ImpuestoDefault[] | null =>
  read(`impuestos_default:hotel:${getHotelId()}`);
export const setHotelDefault = (list: ImpuestoDefault[] | null) => {
  write(`impuestos_default:hotel:${getHotelId()}`, list);
  return persist('hotels', getHotelId(), list);
};

export const getTipoDefault = (tipoId: string): ImpuestoDefault[] | null =>
  tipoId ? read(`impuestos_default:tipo:${tipoId}`) : null;
export const setTipoDefault = (tipoId: string, list: ImpuestoDefault[] | null) => {
  write(`impuestos_default:tipo:${tipoId}`, list);
  return persist('tipos_habitacion', tipoId, list);
};

export const getHabDefault = (habId: string): ImpuestoDefault[] | null =>
  habId ? read(`impuestos_default:hab:${habId}`) : null;
export const setHabDefault = (habId: string, list: ImpuestoDefault[] | null) => {
  write(`impuestos_default:hab:${habId}`, list);
  return persist('habitaciones', habId, list);
};

/**
 * Trae de la base los impuestos por defecto y actualiza el caché local.
 * Si la base aún no tiene valor pero este navegador sí (configuración
 * anterior), lo sube una vez para que todos los equipos lo compartan.
 */
let syncPromise: Promise<void> | null = null;
export const syncImpuestosDefault = (): Promise<void> => {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    const hotelId = getHotelId();
    if (!hotelId || hotelId === 'default') return;
    const [hotelRes, tiposRes, habsRes] = await Promise.all([
      (supabase as any).from('hotels').select('id, impuestos_default').eq('id', hotelId).maybeSingle(),
      (supabase as any).from('tipos_habitacion').select('id, impuestos_default').eq('hotel_id', hotelId),
      (supabase as any).from('habitaciones').select('id, impuestos_default').eq('hotel_id', hotelId),
    ]);
    if (hotelRes.error || tiposRes.error || habsRes.error) return; // columna aún no existe: se usa el caché
    const apply = (table: 'hotels' | 'tipos_habitacion' | 'habitaciones', key: string, id: string, value: unknown) => {
      const db = clean(value);
      if (db !== null) { write(key, db); return; }
      const local = read(key);
      if (local !== null) void persist(table, id, local, true);
    };
    if (hotelRes.data) apply('hotels', `impuestos_default:hotel:${hotelId}`, hotelId, hotelRes.data.impuestos_default);
    (tiposRes.data || []).forEach((t: any) => apply('tipos_habitacion', `impuestos_default:tipo:${t.id}`, t.id, t.impuestos_default));
    (habsRes.data || []).forEach((h: any) => apply('habitaciones', `impuestos_default:hab:${h.id}`, h.id, h.impuestos_default));
  })().finally(() => { setTimeout(() => { syncPromise = null; }, 30_000); });
  return syncPromise;
};

// Resuelve la lista efectiva: habitación → tipo → hotel → [].
export const resolveImpuestosDefault = (
  tipoId?: string,
  habId?: string,
): ImpuestoDefault[] => {
  if (habId) {
    const h = getHabDefault(habId);
    if (h && h.length >= 0) return h; // permite lista vacía como "sin impuestos" explícito
  }
  if (tipoId) {
    const t = getTipoDefault(tipoId);
    if (t) return t;
  }
  const g = getHotelDefault();
  return g || [];
};

export const IMPUESTOS_SUGERIDOS: ImpuestoDefault[] = [
  { nombre: 'IVA 16%', tasa: 16 },
  { nombre: 'IVA Frontera 8%', tasa: 8 },
  { nombre: 'ISH 3%', tasa: 3 },
  { nombre: 'ISH 2%', tasa: 2 },
  { nombre: 'ISH 5%', tasa: 5 },
];