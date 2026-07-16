import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Suscribe a cambios realtime en una tabla y dispara `onChange` con cada evento.
 * Útil para refrescar listas cuando otro usuario (o la web pública) crea/edita registros.
 *
 * Los eventos se agrupan (debounce) para evitar tormentas de re-fetch cuando
 * llegan muchos cambios seguidos.
 */
export function useRealtimeSync(
  table: string,
  onChange: () => void,
  opts: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; enabled?: boolean; debounceMs?: number } = {}
) {
  const { event = '*', enabled = true, debounceMs = 200 } = opts;
  // Guardamos onChange en un ref para invocar siempre la última versión
  // sin re-suscribir el canal en cada render.
  const handlerRef = useRef(onChange);
  useEffect(() => { handlerRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        try { handlerRef.current(); } catch { /* swallow */ }
      }, debounceMs);
    };
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes' as never,
        { event, schema: 'public', table } as never,
        () => trigger()
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [table, event, enabled, debounceMs]);
}