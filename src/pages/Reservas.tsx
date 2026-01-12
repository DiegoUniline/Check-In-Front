import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TimelineToolbar } from '@/components/reservas/TimelineToolbar';
import { TimelineGrid } from '@/components/reservas/TimelineGrid';
import { TimelineLegend } from '@/components/reservas/TimelineLegend';
import { NuevaReservaModal, ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { ReservaDetalleModal } from '@/components/reservas/ReservaDetalleModal';
import { mockHabitaciones, mockReservas, Reserva, Habitacion } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function Reservas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [startDate, setStartDate] = useState(new Date());
  const [tipoFilter, setTipoFilter] = useState('all');
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [reservationPreload, setReservationPreload] = useState<ReservationPreload | undefined>();
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);

  // Calculate days to show based on view mode
  const daysToShow = useMemo(() => {
    switch (viewMode) {
      case 'dia': return 7;
      case 'semana': return 14;
      case 'mes': return 30;
      default: return 14;
    }
  }, [viewMode]);

  // Filter rooms by type
  const filteredHabitaciones = useMemo(() => {
    if (tipoFilter === 'all') return mockHabitaciones;
    return mockHabitaciones.filter(h => h.tipoId === tipoFilter);
  }, [tipoFilter]);

  const handleReservationClick = (reserva: Reserva) => {
    setSelectedReserva(reserva);
    setIsDetalleOpen(true);
  };

  const handleNewReservation = () => {
    setReservationPreload(undefined);
    setIsNewReservationOpen(true);
  };

  const handleCreateFromDrag = (habitacion: Habitacion, fechaCheckin: Date, fechaCheckout: Date) => {
    setReservationPreload({
      habitacion,
      fechaCheckin,
      fechaCheckout,
    });
    setIsNewReservationOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsNewReservationOpen(open);
    if (!open) {
      setReservationPreload(undefined);
    }
  };

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
      />

      <TimelineGrid
        habitaciones={filteredHabitaciones}
        reservas={mockReservas}
        startDate={startDate}
        daysToShow={daysToShow}
        onReservationClick={handleReservationClick}
        onCreateReservation={handleCreateFromDrag}
      />

      <TimelineLegend
        totalRooms={mockHabitaciones.length}
        visibleRooms={filteredHabitaciones.length}
        lastUpdate={new Date()}
      />

      <NuevaReservaModal
        open={isNewReservationOpen}
        onOpenChange={handleCloseModal}
        preload={reservationPreload}
      />

      <ReservaDetalleModal
        open={isDetalleOpen}
        onOpenChange={setIsDetalleOpen}
        reserva={selectedReserva}
      />
    </MainLayout>
  );
}