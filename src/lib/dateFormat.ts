// Formateo universal de fechas en VULO: siempre dd/MM/yyyy.
// Regla: cualquier fecha visible en UI (tablas, cards, detalle, listas) usa `formatDate`.
// Para fecha + hora usar `formatDateTime` (dd/MM/yyyy HH:mm).

function toDate(input: unknown): Date | null {
  if (input == null || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    // Soporta 'YYYY-MM-DD' evitando corrimiento por timezone.
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const [, y, mo, d, hh, mm, ss] = m;
      return new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(hh || 0),
        Number(mm || 0),
        Number(ss || 0),
      );
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Formatea cualquier fecha como dd/MM/yyyy. Devuelve '—' si no hay valor. */
export function formatDate(input: unknown, fallback = '—'): string {
  const d = toDate(input);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Formatea fecha + hora como dd/MM/yyyy HH:mm. */
export function formatDateTime(input: unknown, fallback = '—'): string {
  const d = toDate(input);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Formatea sólo la hora como HH:mm. */
export function formatTime(input: unknown, fallback = '—'): string {
  const d = toDate(input);
  if (!d) return fallback;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}