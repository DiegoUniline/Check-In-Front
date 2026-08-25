import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

const PATCH_KEY = '__hospedapp_dashboard_integrity_patch_v1__';
const root = globalThis as any;

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;
  const client = api as any;
  const db = supabase as any;

  client.getDashboardTareasCriticas = async () => {
    const hotelId = client.getHotelId?.();
    const [{ data: limpieza, error: limpiezaError }, { data: mantenimiento, error: mantenimientoError }] = await Promise.all([
      db.from('tareas_limpieza')
        .select('*, habitaciones(numero)')
        .eq('hotel_id', hotelId)
        .in('prioridad', ['Alta', 'Urgente'])
        .not('estado', 'in', '(Completada,Verificada)')
        .order('fecha', { ascending: true })
        .limit(5),
      db.from('tareas_mantenimiento')
        .select('*, habitaciones(numero)')
        .eq('hotel_id', hotelId)
        .in('prioridad', ['Alta', 'Urgente'])
        .neq('estado', 'Completada')
        .order('fecha_reporte', { ascending: true })
        .limit(5),
    ]);

    if (limpiezaError) throw limpiezaError;
    if (mantenimientoError) throw mantenimientoError;

    return {
      limpieza: (limpieza || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero })),
      mantenimiento: (mantenimiento || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero })),
    };
  };
}

export {};
