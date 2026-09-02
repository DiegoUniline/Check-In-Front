import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/useAuth';
import api from '@/lib/api';

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
  prioridad?: 'Baja' | 'Normal' | 'Alta' | 'Crítica';
  titulo: string;
  detalle: string;
  responsable?: string;
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
  const hotelId = api.getHotelId() || 'default';
  const [entradas, setEntradas] = useState<BitacoraEntrada[]>(() => readAll(hotelId));

  useEffect(() => {
    setEntradas(readAll(hotelId));
    void api.getBitacoraOperativa()
      .then((rows) => {
        const remote = rows.map((row: any): BitacoraEntrada => ({
          id: row.id,
          hotelId: row.hotel_id,
          fecha: row.created_at,
          autor: row.autor_nombre || 'Usuario',
          autorId: row.autor_id || 'anon',
          categoria: row.categoria as BitacoraCategoria,
          prioridad: row.prioridad || 'Normal',
          titulo: row.titulo,
          detalle: row.detalle || '',
          responsable: row.responsable || undefined,
          turnoId: row.turno_id || undefined,
          resuelto: row.estado === 'Resuelto',
        }));
        writeAll(hotelId, remote);
      })
      .catch(() => {
        // Sin conexión o migración pendiente: se conserva la copia local.
      });
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
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        hotelId,
        fecha: new Date().toISOString(),
        autor: user?.nombre || user?.email || 'Usuario',
        autorId: user?.id || 'anon',
        ...data,
      };
      const list = [nueva, ...readAll(hotelId)];
      writeAll(hotelId, list);
      void api.createBitacoraOperativa({
        id: nueva.id,
        turno_id: nueva.turnoId || null,
        categoria: nueva.categoria,
        prioridad: nueva.prioridad || 'Normal',
        titulo: nueva.titulo,
        detalle: nueva.detalle || null,
        responsable: nueva.responsable || null,
        estado: nueva.resuelto ? 'Resuelto' : 'Abierto',
        autor_id: nueva.autorId,
        autor_nombre: nueva.autor,
      }).catch(() => {
        // La entrada permanece disponible localmente y podrá reintentarse después.
      });
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
      const updated = list.find((entry) => entry.id === id);
      if (updated) {
        void api.updateBitacoraOperativa(id, {
          estado: updated.resuelto ? 'Resuelto' : 'Abierto',
          resuelto_at: updated.resuelto ? new Date().toISOString() : null,
          resuelto_por: updated.resuelto ? (user?.nombre || user?.email || 'Usuario') : null,
        }).catch(() => null);
      }
    },
    [hotelId, user],
  );

  const eliminar = useCallback(
    (id: string) => {
      writeAll(hotelId, readAll(hotelId).filter((e) => e.id !== id));
      void api.deleteBitacoraOperativa(id).catch(() => null);
    },
    [hotelId],
  );

  return { entradas, agregar, togglePendiente, eliminar, hotelId };
}
