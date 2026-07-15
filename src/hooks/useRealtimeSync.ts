import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Suscribe a cambios realtime en una tabla y dispara `onChange` con cada evento.
 * Útil para refrescar listas cuando otro usuario (o la web pública) crea/edita registros.
 */
export function useRealtimeSync(
  table: string,
  onChange: () => void,
  opts: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; enabled?: boolean } = {}
) {
  const { event = '*', enabled = true } = opts;
  // Guardamos onChange en un ref para invocar siempre la última versión
  // sin re-suscribir el canal en cada render.
  const handlerRef = useRef(onChange);
  useEffect(() => { handlerRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes' as never,
        { event, schema: 'public', table } as never,
        () => handlerRef.current()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, enabled]);
}