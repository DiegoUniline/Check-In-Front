import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { ShiftContext } from './shift-context';

const SHIFT_ROLES = new Set(['Admin', 'Gerente', 'Recepcion']);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const shiftRequired = Boolean(user && SHIFT_ROLES.has(user.rol));
  const [openShift, setOpenShift] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshShift = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !shiftRequired) {
      setOpenShift(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const current = await api.getOpenShift(user.id);
      setOpenShift(current);
      return current;
    } catch {
      setOpenShift(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, shiftRequired, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void refreshShift();
  }, [authLoading, refreshShift]);

  useRealtimeSync('turnos_operativos', () => void refreshShift(), {
    enabled: isAuthenticated && shiftRequired,
    debounceMs: 100,
  });

  useEffect(() => {
    const handleShiftChange = () => void refreshShift();
    window.addEventListener('vulo:shift-changed', handleShiftChange);
    return () => window.removeEventListener('vulo:shift-changed', handleShiftChange);
  }, [refreshShift]);

  const value = useMemo(() => ({
    openShift,
    loading: authLoading || loading,
    shiftRequired,
    hasOpenShift: !shiftRequired || Boolean(openShift),
    refreshShift,
  }), [authLoading, loading, openShift, refreshShift, shiftRequired]);

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}
