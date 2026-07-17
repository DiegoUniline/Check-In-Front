// Configuración de impuestos por defecto para prellenar en Nueva Reserva.
// Se guarda en localStorage por hotel/tipo/habitación para que cada hotel
// decida qué impuestos aplicar sin cambios de schema.
//
// Prioridad al pre-cargar: habitación > tipo > hotel > [].

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

export const getHotelDefault = (): ImpuestoDefault[] | null =>
  read(`impuestos_default:hotel:${getHotelId()}`);
export const setHotelDefault = (list: ImpuestoDefault[] | null) =>
  write(`impuestos_default:hotel:${getHotelId()}`, list);

export const getTipoDefault = (tipoId: string): ImpuestoDefault[] | null =>
  tipoId ? read(`impuestos_default:tipo:${tipoId}`) : null;
export const setTipoDefault = (tipoId: string, list: ImpuestoDefault[] | null) =>
  write(`impuestos_default:tipo:${tipoId}`, list);

export const getHabDefault = (habId: string): ImpuestoDefault[] | null =>
  habId ? read(`impuestos_default:hab:${habId}`) : null;
export const setHabDefault = (habId: string, list: ImpuestoDefault[] | null) =>
  write(`impuestos_default:hab:${habId}`, list);

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