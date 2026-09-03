import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { NuevaReservaModal, type ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { useShift } from '@/contexts/useShift';

type NavigationState = {
  reservationPreload?: {
    habitacion?: any;
    fechaCheckin?: string;
    fechaCheckout?: string;
    origen?: 'Reserva' | 'Recepcion';
  };
};

export default function NuevaReserva() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { viewOnlyMode } = useShift();
  const navigationPreload = (location.state as NavigationState | null)?.reservationPreload;
  const roomId = searchParams.get('roomId');
  const [room, setRoom] = useState<any | null>(navigationPreload?.habitacion || null);
  const [loadingRoom, setLoadingRoom] = useState(Boolean(roomId && !navigationPreload?.habitacion));

  useEffect(() => {
    if (!roomId || room?.id === roomId) return;
    let cancelled = false;
    setLoadingRoom(true);
    void api.getHabitaciones()
      .then((rooms) => { if (!cancelled) setRoom((rooms || []).find((item: any) => item.id === roomId) || null); })
      .finally(() => { if (!cancelled) setLoadingRoom(false); });
    return () => { cancelled = true; };
  }, [room?.id, roomId]);

  const preload = useMemo<ReservationPreload>(() => {
    const checkin = navigationPreload?.fechaCheckin || searchParams.get('checkin');
    const checkout = navigationPreload?.fechaCheckout || searchParams.get('checkout');
    return {
      habitacion: navigationPreload?.habitacion || room || undefined,
      fechaCheckin: checkin ? parseISO(checkin) : undefined,
      fechaCheckout: checkout ? parseISO(checkout) : undefined,
      origen: navigationPreload?.origen || (searchParams.get('origin') === 'Recepcion' ? 'Recepcion' : 'Reserva'),
    };
  }, [navigationPreload, room, searchParams]);

  if (viewOnlyMode) return <Navigate to="/reservas" replace />;

  return <MainLayout fitViewport>
    {loadingRoom ? <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#10233F]" /><p className="mt-3 text-sm text-muted-foreground">Preparando la reservación…</p></div></div> : (
      <NuevaReservaModal
        open
        pageMode
        preload={preload}
        onOpenChange={(open) => { if (!open) navigate(-1); }}
        onSuccess={(reservation) => navigate(reservation?.id ? `/reservas/detalle/${reservation.id}` : '/reservas', { replace: true })}
      />
    )}
  </MainLayout>;
}
