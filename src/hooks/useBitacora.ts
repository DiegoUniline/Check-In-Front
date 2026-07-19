import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/useAuth';

export type BitacoraCategoria =
  | 'General'
  | 'Pendiente'
  | 'Incidente'
  | 'Huésped'
  | 'Mantenimiento'
  | 'Caja'
  | 'Entrega de turno';

export interface BitacoraEntrada {
  id: string;
  hotelId: string;
  fecha: string; // ISO
  autor: string;
  autorId: string;
  categoria: BitacoraCategoria;
  titulo: string;
  detalle: string;
  turnoId?: string; // se enlaza al turno actual si existe
  resuelto?: boolean;
}

function key(hotelId: string) {
  return `vulo:bitacora:${hotelId}`;
}

function readAll(hotelId: string): BitacoraEntrada[] {
  try {
    const raw = localStorage.getItem(key(hotelId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as BitacoraEntrada[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(hotelId: string, list: BitacoraEntrada[]) {
  localStorage.setItem(key(hotelId), JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('vulo:bitacora-updated', { detail: { hotelId } }));
}

export function useBitacora() {
  const { user } = useAuth();
  const hotelId = user?.hotelId || 'default';
  const [entradas, setEntradas] = useState<BitacoraEntrada[]>(() => readAll(hotelId));

  useEffect(() => {
    setEntradas(readAll(hotelId));
    const onUpdate = (e: any) => {
      if (e?.detail?.hotelId === hotelId) setEntradas(readAll(hotelId));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key(hotelId)) setEntradas(readAll(hotelId));
    };
    window.addEventListener('vulo:bitacora-updated', onUpdate);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('vulo:bitacora-updated', onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, [hotelId]);

  const agregar = useCallback(
    (data: Omit<BitacoraEntrada, 'id' | 'hotelId' | 'fecha' | 'autor' | 'autorId'>) => {
      const nueva: BitacoraEntrada = {
        id: `bit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        hotelId,
        fecha: new Date().toISOString(),
        autor: user?.nombre || user?.email || 'Usuario',
        autorId: user?.id || 'anon',
        ...data,
      };
      const list = [nueva, ...readAll(hotelId)];
      writeAll(hotelId, list);
      return nueva;
    },
    [hotelId, user],
  );

  const togglePendiente = useCallback(
    (id: string) => {
      const list = readAll(hotelId).map((e) =>
        e.id === id ? { ...e, resuelto: !e.resuelto } : e,
      );
      writeAll(hotelId, list);
    },
    [hotelId],
  );

  const eliminar = useCallback(
    (id: string) => {
      writeAll(hotelId, readAll(hotelId).filter((e) => e.id !== id));
    },
    [hotelId],
  );

  return { entradas, agregar, togglePendiente, eliminar, hotelId };
}
