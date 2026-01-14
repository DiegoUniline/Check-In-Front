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
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      console.log('=== INICIANDO CARGA DE DATOS ===');
      
      const [habData, resData, tiposData] = await Promise.all([
        api.getHabitaciones(),
        api.getReservas(),
        api.getTiposHabitacion()
      ]);
      
      console.log('=== DATOS CARGADOS ===');
      console.log('Fecha actual del sistema:', new Date().toISOString());
      console.log('StartDate del timeline:', startDate.toISOString());
      
      console.log('--- HABITACIONES ---');
      console.log('Total habitaciones:', habData.length);
      habData.forEach((h: any) => {
        console.log(`  Hab ${h.numero}: id=${h.id}, tipo=${h.tipo_id}`);
      });
      
      console.log('--- RESERVAS ---');
      console.log('Total reservas:', resData.length);
      resData.forEach((r: any) => {
        console.log(`  ${r.numero_reserva}:`, {
          habitacion_id: r.habitacion_id,
          checkin: r.fecha_checkin,
          checkout: r.fecha_checkout,
          estado: r.estado,
          origen: r.origen,
          cliente: r.cliente_nombre
        });
      });
      
      console.log('--- TIPOS HABITACION ---');
      console.log('Total tipos:', tiposData.length);
      
      setHabitaciones(habData);
      setReservas(resData);
      setTiposHabitacion(tiposData);
      
      console.log('=== DATOS GUARDADOS EN STATE ===');
      
    } catch (error) {
      console.error('=== ERROR CARGANDO DATOS ===', error);
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

  // Log cuando cambian las reservas o habitaciones
  useEffect(() => {
    console.log('=== STATE ACTUALIZADO ===');
    console.log('Habitaciones en state:', habitaciones.length);
    console.log('Reservas en state:', reservas.length);
    console.log('StartDate actual:', startDate.toISOString());
    
    if (reservas.length > 0 && habitaciones.length > 0) {
      console.log('--- VERIFICACIÓN DE MATCH ---');
      reservas.forEach(r => {
        const habMatch = habitaciones.find(h => h.id === r.habitacion_id);
        console.log(`Reserva ${r.numero_reserva} -> Habitación ${habMatch?.numero || 'NO ENCONTRADA'} (${r.habitacion_id})`);
      });
    }
  }, [habitaciones, reservas, startDate]);

  const handleReservationClick = (reserva: any) => {
    console.log('Click en reserva:', reserva);
    setSelectedReserva(reserva);
    setIsDetalleOpen(true);
  };

  const handleNewReservation = () => {
    setReservationPreload(undefined);
    setIsNewReservationOpen(true);
  };

  const handleCreateFromDrag = (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => {
    console.log('Crear desde drag:', { habitacion, fechaCheckin, fechaCheckout });
    setReservationPreload({ habitacion, fechaCheckin, fechaCheckout });
    setIsNewReservationOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsNewReservationOpen(open);
    if (!open) setReservationPreload(undefined);
  };

  const handleSuccess = () => {
    console.log('=== RECARGANDO DATOS DESPUÉS DE ÉXITO ===');
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
        onDateChange={(date) => {
          console.log('Cambio de fecha:', date.toISOString());
          setStartDate(date);
        }}
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
        onSuccess={handleSuccess}
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
