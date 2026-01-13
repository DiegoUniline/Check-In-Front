import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TimelineToolbar } from '@/components/reservas/TimelineToolbar';
import { TimelineGrid } from '@/components/reservas/TimelineGrid';
import { TimelineLegend } from '@/components/reservas/TimelineLegend';
import { NuevaReservaModal, ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { ReservaDetalleModal } from '@/components/reservas/ReservaDetalleModal';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function Reservas() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [startDate, setStartDate] = useState(new Date());
  const [tipoFilter, setTipoFilter] = useState('all');
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [reservationPreload, setReservationPreload] = useState<ReservationPreload | undefined>();
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);

  // Data from API
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [habData, resData, tiposData] = await Promise.all([
        api.getHabitaciones(),
        api.getReservas(),
        api.getTiposHabitacion()
      ]);
      setHabitaciones(habData);
      setReservas(resData);
      setTiposHabitacion(tiposData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const daysToShow = useMemo(() => {
    switch (viewMode) {
      case 'dia': return 7;
      case 'semana': return 14;
      case 'mes': return 30;
      default: return 14;
    }
  }, [viewMode]);

  const filteredHabitaciones = useMemo(() => {
    if (tipoFilter === 'all') return habitaciones;
    return habitaciones.filter(h => h.tipo_id === tipoFilter);
  }, [habitaciones, tipoFilter]);

  const handleReservationClick = (reserva: any) => {
    setSelectedReserva(reserva);
    setIsDetalleOpen(true);
  };

  const handleNewReservation = () => {
    setReservationPreload(undefined);
    setIsNewReservationOpen(true);
  };

  const handleCreateFromDrag = (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => {
    setReservationPreload({ habitacion, fechaCheckin, fechaCheckout });
    setIsNewReservationOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsNewReservationOpen(open);
    if (!open) setReservationPreload(undefined);
  };

  const handleReservationSuccess = () => {
    cargarDatos();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <TimelineToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        startDate={startDate}
        onDateChange={setStartDate}
        tipoFilter={tipoFilter}
        onTipoFilterChange={setTipoFilter}
        onNewReservation={handleNewReservation}
        tiposHabitacion={tiposHabitacion}
      />
      <TimelineGrid
        habitaciones={filteredHabitaciones}
        reservas={reservas}
        startDate={startDate}
        daysToShow={daysToShow}
        onReservationClick={handleReservationClick}
        onCreateReservation={handleCreateFromDrag}
      />
      <TimelineLegend
        totalRooms={habitaciones.length}
        visibleRooms={filteredHabitaciones.length}
        lastUpdate={new Date()}
      />
      <NuevaReservaModal
        open={isNewReservationOpen}
        onOpenChange={handleCloseModal}
        preload={reservationPreload}
        onSuccess={handleReservationSuccess}
      />
      <ReservaDetalleModal
        open={isDetalleOpen}
        onOpenChange={setIsDetalleOpen}
        reserva={selectedReserva}
        onUpdate={cargarDatos}
      />
    </MainLayout>
  );
}
