import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';

/**
 * Puente realtime global. Suscribe a cambios en las tablas críticas y
 * dispara eventos `window` (`data:changed`) para que las páginas puedan
 * refrescar sin necesidad de que cada una monte su propio canal.
 *
 * También limpia entradas del cache offline para forzar refetch en la
 * próxima navegación.
 *
 * Sólo se monta cuando hay usuario autenticado.
 */
const TABLES = [
  'reservas',
  'habitaciones',
  'pagos',
  'cargos',
  'clientes',
  'tareas_limpieza',
  'tareas_mantenimiento',
  'notificaciones',
];

function invalidateCacheFor(table: string) {
  try {
    const prefix = 'hospedapp:cache:';
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix) && k.includes(`:${table}:`) || k.startsWith(`${prefix}${table}:`))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

export function RealtimeBridge() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const channels = TABLES.map((table) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const trigger = (payload: unknown) => {
        if (timer) return;
        timer = setTimeout(() => {
          timer = null;
          invalidateCacheFor(table);
          window.dispatchEvent(
            new CustomEvent('data:changed', { detail: { table, payload } }),
          );
        }, 200);
      };
      return supabase
        .channel(`rt-global-${table}`)
        .on(
          'postgres_changes' as never,
          { event: '*', schema: 'public', table } as never,
          trigger,
        )
        .subscribe();
    });
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [user]);
  return null;
}