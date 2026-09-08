import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RealtimeSyncEvent = {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
  newRecord: Record<string, unknown>;
  oldRecord: Record<string, unknown>;
  receivedAt: string;
};

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type SupabaseRealtimePayload = {
  eventType?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

/**
 * Suscribe a cambios realtime en una tabla y dispara `onChange` con cada evento.
 * Útil para refrescar listas cuando otro usuario (o la web pública) crea/edita registros.
 *
 * Los eventos se agrupan (debounce) para evitar tormentas de re-fetch cuando
 * llegan muchos cambios seguidos.
 */
export function useRealtimeSync(
  table: string,
  onChange: (event: RealtimeSyncEvent) => void,
  opts: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; enabled?: boolean; debounceMs?: number } = {}
) {
  const { event = '*', enabled = true, debounceMs = 200 } = opts;
  const [status, setStatus] = useState<RealtimeConnectionStatus>(enabled ? 'connecting' : 'disconnected');
  // Guardamos onChange en un ref para invocar siempre la última versión
  // sin re-suscribir el canal en cada render.
  const handlerRef = useRef(onChange);
  useEffect(() => { handlerRef.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected');
      return;
    }
    setStatus('connecting');
    let timer: ReturnType<typeof setTimeout> | null = null;
    let latestEvent: RealtimeSyncEvent | null = null;
    const trigger = (payload: SupabaseRealtimePayload) => {
      const eventType = ['INSERT', 'UPDATE', 'DELETE'].includes(String(payload.eventType))
        ? payload.eventType as RealtimeSyncEvent['eventType']
        : 'UNKNOWN';
      latestEvent = {
        table,
        eventType,
        newRecord: payload.new || {},
        oldRecord: payload.old || {},
        receivedAt: new Date().toISOString(),
      };
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const pendingEvent = latestEvent;
        latestEvent = null;
        if (!pendingEvent) return;
        try { handlerRef.current(pendingEvent); } catch { /* swallow */ }
      }, debounceMs);
    };
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes' as never,
        { event, schema: 'public', table } as never,
        (payload: SupabaseRealtimePayload) => trigger(payload)
      )
      .subscribe((channelStatus) => {
        setStatus(channelStatus === 'SUBSCRIBED' ? 'connected' : channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT' || channelStatus === 'CLOSED' ? 'disconnected' : 'connecting');
      });
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [table, event, enabled, debounceMs]);
  return status;
}
