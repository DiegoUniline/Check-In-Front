import { useEffect } from 'react';
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
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes' as never,
        { event, schema: 'public', table } as never,
        () => onChange()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, enabled]);
}