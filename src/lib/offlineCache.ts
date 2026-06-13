/**
 * Cache offline simple basado en localStorage.
 *
 * Uso:
 *   const data = await withOfflineCache('reservas', () => api.getReservas());
 *
 * Comportamiento:
 * - Intenta ejecutar el fetcher (red).
 * - Si tiene éxito, guarda el resultado en localStorage y lo retorna.
 * - Si falla (sin red, timeout, error) y hay valor cacheado, retorna el cache.
 * - Si falla y NO hay cache, propaga el error.
 *
 * Por qué localStorage y no IndexedDB: simplicidad. Los datasets son pequeños
 * (cientos de reservas/habitaciones, < 1MB). Si crecen, migrar a idb-keyval.
 */

const PREFIX = "hospedapp:cache:";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 días, descartar entries muy viejos

interface CachedEntry<T> {
  data: T;
  ts: number;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    const entry: CachedEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // QuotaExceeded — limpiar cache antiguo y reintentar una vez
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
      const entry: CachedEntry<T> = { data, ts: Date.now() };
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      /* dar por perdido */
    }
  }
}

export async function withOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const fresh = await fetcher();
    writeCache(key, fresh);
    return fresh;
  } catch (err) {
    const cached = readCache<T>(key);
    if (cached !== null) {
      console.warn(`[offlineCache] usando cache para "${key}":`, err);
      return cached;
    }
    throw err;
  }
}

/** Lee el cache sin disparar la red. Útil para hidratación instantánea en mount. */
export function getCached<T>(key: string): T | null {
  return readCache<T>(key);
}

/** Limpia todo el cache offline (logout, cambio de hotel, etc.). */
export function clearOfflineCache() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

/**
 * Cola de mutaciones offline (idempotentes).
 * Se reintenta cuando vuelve la conexión.
 */
const QUEUE_KEY = "hospedapp:mutation-queue";

export interface QueuedMutation {
  id: string;
  kind: string; // ej: "habitacion.cambiarEstado", "limpieza.completar"
  payload: unknown;
  ts: number;
}

export function readQueue(): QueuedMutation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function enqueueMutation(m: Omit<QueuedMutation, "id" | "ts">) {
  const queue = readQueue();
  queue.push({ ...m, id: crypto.randomUUID(), ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeMutation(id: string) {
  const queue = readQueue().filter((m) => m.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}