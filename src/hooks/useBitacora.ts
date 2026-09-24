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

const fromRow = (row: any): BitacoraEntrada => ({
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
});

const notify = (hotelId: string) =>
  window.dispatchEvent(new CustomEvent('vulo:bitacora-updated', { detail: { hotelId } }));

// La bitácora vive sólo en la base de datos; cada cambio se guarda ahí primero.
export function useBitacora() {
  const { user } = useAuth();
  const hotelId = api.getHotelId() || 'default';
  const [entradas, setEntradas] = useState<BitacoraEntrada[]>([]);

  const cargar = useCallback(async () => {
    const rows = await api.getBitacoraOperativa();
    setEntradas((rows || []).map(fromRow));
  }, []);

  useEffect(() => {
    void cargar().catch(() => setEntradas([]));
    const onUpdate = (e: any) => {
      if (e?.detail?.hotelId === hotelId) void cargar().catch(() => undefined);
    };
    window.addEventListener('vulo:bitacora-updated', onUpdate);
    return () => window.removeEventListener('vulo:bitacora-updated', onUpdate);
  }, [hotelId, cargar]);

  const agregar = useCallback(
    async (data: Omit<BitacoraEntrada, 'id' | 'hotelId' | 'fecha' | 'autor' | 'autorId'>) => {
      const row = await api.createBitacoraOperativa({
        turno_id: data.turnoId || null,
        categoria: data.categoria,
        prioridad: data.prioridad || 'Normal',
        titulo: data.titulo,
        detalle: data.detalle || null,
        responsable: data.responsable || null,
        estado: data.resuelto ? 'Resuelto' : 'Abierto',
        autor_id: user?.id || null,
        autor_nombre: user?.nombre || user?.email || 'Usuario',
      });
      await cargar();
      notify(hotelId);
      return row ? fromRow(row) : null;
    },
    [hotelId, user, cargar],
  );

  const togglePendiente = useCallback(
    async (id: string) => {
      const actual = entradas.find((entry) => entry.id === id);
      if (!actual) return;
      const resuelto = !actual.resuelto;
      await api.updateBitacoraOperativa(id, {
        estado: resuelto ? 'Resuelto' : 'Abierto',
        resuelto_at: resuelto ? new Date().toISOString() : null,
        resuelto_por: resuelto ? (user?.nombre || user?.email || 'Usuario') : null,
      });
      await cargar();
      notify(hotelId);
    },
    [entradas, hotelId, user, cargar],
  );

  const eliminar = useCallback(
    async (id: string) => {
      await api.deleteBitacoraOperativa(id);
      await cargar();
      notify(hotelId);
    },
    [hotelId, cargar],
  );

  return { entradas, agregar, togglePendiente, eliminar, hotelId };
}
