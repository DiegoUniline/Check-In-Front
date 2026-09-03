import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { ShiftContext } from './shift-context';
import { setShiftViewOnlyActive } from '@/lib/shiftAccess';

const SHIFT_ROLES = new Set(['Admin', 'Gerente', 'Recepcion']);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const shiftRequired = Boolean(user && SHIFT_ROLES.has(user.rol));
  const [openShift, setOpenShift] = useState<any | null>(null);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const viewOnlyStorageKey = user?.id
    ? `vulo:view-only-without-shift:${user.id}:${typeof window !== 'undefined' ? localStorage.getItem('hotel_id') || 'hotel' : 'hotel'}`
    : '';

  useEffect(() => {
    if (!viewOnlyStorageKey) {
      setViewOnlyMode(false);
      setShiftViewOnlyActive(false);
      return;
    }
    const restored = sessionStorage.getItem(viewOnlyStorageKey) === '1';
    setViewOnlyMode(restored);
    setShiftViewOnlyActive(restored);
  }, [viewOnlyStorageKey]);

  const exitViewOnlyMode = useCallback(() => {
    if (viewOnlyStorageKey) sessionStorage.removeItem(viewOnlyStorageKey);
    setViewOnlyMode(false);
    setShiftViewOnlyActive(false);
  }, [viewOnlyStorageKey]);

  const continueWithoutShift = useCallback(() => {
    if (viewOnlyStorageKey) sessionStorage.setItem(viewOnlyStorageKey, '1');
    setViewOnlyMode(true);
    setShiftViewOnlyActive(true);
  }, [viewOnlyStorageKey]);

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
      if (current) {
        if (viewOnlyStorageKey) sessionStorage.removeItem(viewOnlyStorageKey);
        setViewOnlyMode(false);
        setShiftViewOnlyActive(false);
      }
      return current;
    } catch {
      setOpenShift(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, shiftRequired, user?.id, viewOnlyStorageKey]);

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
    viewOnlyMode: shiftRequired && !openShift && viewOnlyMode,
    continueWithoutShift,
    exitViewOnlyMode,
    refreshShift,
  }), [authLoading, continueWithoutShift, exitViewOnlyMode, loading, openShift, refreshShift, shiftRequired, viewOnlyMode]);

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}
