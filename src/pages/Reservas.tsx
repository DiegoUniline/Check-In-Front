import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Search, 
  CalendarDays, BedDouble, Users, RefreshCw, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { TimelineGrid } from '@/components/reservas/TimelineGrid';
import { NuevaReservaModal, ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { ReservaDetalleModal } from '@/components/reservas/ReservaDetalleModal';

type ViewMode = 'Dia' | 'Semana' | 'Mes';

export default function Reservas() {
  const [loading, setLoading] = useState(true);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const { toast } = useToast();

  const [startDate, setStartDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Semana');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [busqueda, setBusqueda] = useState('');

  const [modalNuevaReserva, setModalNuevaReserva] = useState(false);
  const [preloadReserva, setPreloadReserva] = useState<ReservationPreload | undefined>();
  const [modalDetalle, setModalDetalle] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null);

  const daysToShow = viewMode === 'Dia' ? 7 : viewMode === 'Semana' ? 14 : 31;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
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

  const navegarFecha = (direccion: 'prev' | 'next' | 'today') => {
    if (direccion === 'today') {
      setStartDate(new Date());
      return;
    }
    const dias = viewMode === 'Dia' ? 7 : viewMode === 'Semana' ? 7 : 30;
    setStartDate(prev => direccion === 'next' ? addDays(prev, dias) : subDays(prev, dias));
  };

  const habitacionesFiltradas = habitaciones.filter(h => {
    if (filtroTipo !== 'all' && h.tipo_id !== filtroTipo) return false;
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return h.numero?.toLowerCase().includes(search) || h.tipo_nombre?.toLowerCase().includes(search);
    }
    return true;
  });

  const handleCreateReservation = (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => {
    setPreloadReserva({ habitacion, fechaCheckin, fechaCheckout });
    setModalNuevaReserva(true);
  };

  const handleReservationClick = (reserva: any) => {
    setReservaSeleccionada(reserva);
    setModalDetalle(true);
  };

  const totalHabitaciones = habitaciones.length;
  const habitacionesOcupadas = reservas.filter(r => ['CheckIn', 'Hospedado'].includes(r.estado)).length;
  const llegadasHoy = reservas.filter(r => {
    const checkin = r.fecha_checkin?.substring(0, 10);
    const hoy = format(new Date(), 'yyyy-MM-dd');
    return checkin === hoy && ['Pendiente', 'Confirmada'].includes(r.estado);
  }).length;
  const salidasHoy = reservas.filter(r => {
    const checkout = r.fecha_checkout?.substring(0, 10);
    const hoy = format(new Date(), 'yyyy-MM-dd');
    return checkout === hoy && ['CheckIn', 'Hospedado'].includes(r.estado);
  }).length;

  return (
    <MainLayout title="Recepción" subtitle="Gestión de reservas">
      {/* Layout principal con altura fija */}
      <div className="h-[calc(100vh-80px)] flex flex-col gap-3 overflow-hidden">
        
        {/* Header - NO crece */}
        <div className="shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Recepción</h1>
              <p className="text-xs text-muted-foreground">Gestión de reservas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cargarDatos} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => { setPreloadReserva(undefined); setModalNuevaReserva(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva Reserva
            </Button>
          </div>
        </div>

        {/* Stats - NO crece */}
        <div className="shrink-0 grid grid-cols-4 gap-2">
          <Card className="p-2">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-bold">{habitacionesOcupadas}/{totalHabitaciones}</p>
                <p className="text-[10px] text-muted-foreground">Ocupadas</p>
              </div>
            </div>
          </Card>
          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-600">{llegadasHoy}</p>
                <p className="text-[10px] text-muted-foreground">Llegadas</p>
              </div>
            </div>
          </Card>
          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-bold text-orange-600">{salidasHoy}</p>
                <p className="text-[10px] text-muted-foreground">Salidas</p>
              </div>
            </div>
          </Card>
          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-bold text-blue-600">
                  {totalHabitaciones > 0 ? Math.round((habitacionesOcupadas / totalHabitaciones) * 100) : 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">Ocupación</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Controles - NO crece */}
        <Card className="shrink-0">
          <CardContent className="p-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navegarFecha('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => navegarFecha('today')}>
                  Hoy
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navegarFecha('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium ml-1 hidden sm:inline">
                  {format(startDate, "d MMM yyyy", { locale: es })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-muted p-0.5 rounded">
                  {(['Dia', 'Semana', 'Mes'] as ViewMode[]).map(mode => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setViewMode(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
                
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[90px] h-7 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {tiposHabitacion.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar..." 
                    className="pl-6 h-7 w-[80px] text-xs"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline - CRECE y contiene scroll interno */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <Card className="h-full flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </Card>
          ) : (
            <TimelineGrid
              habitaciones={habitacionesFiltradas}
              reservas={reservas}
              startDate={startDate}
              daysToShow={daysToShow}
              onReservationClick={handleReservationClick}
              onCreateReservation={handleCreateReservation}
            />
          )}
        </div>
      </div>

      {/* Modales */}
      <NuevaReservaModal
        open={modalNuevaReserva}
        onOpenChange={setModalNuevaReserva}
        preload={preloadReserva}
        onSuccess={cargarDatos}
      />
      <ReservaDetalleModal
        open={modalDetalle}
        onOpenChange={setModalDetalle}
        reserva={reservaSeleccionada}
        onUpdate={cargarDatos}
      />
    </MainLayout>
  );
}
