import { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Search, Filter,
  LayoutGrid, List, CalendarDays, BedDouble, Users, RefreshCw
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { TimelineGrid } from '@/components/reservas/TimelineGrid';
import { NuevaReservaModal, ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { DetalleReservaModal } from '@/components/reservas/DetalleReservaModal';

type ViewMode = 'Dia' | 'Semana' | 'Mes';

export default function Reservas() {
  const [loading, setLoading] = useState(true);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const { toast } = useToast();

  // Estado del timeline
  const [startDate, setStartDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Semana');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalNuevaReserva, setModalNuevaReserva] = useState(false);
  const [preloadReserva, setPreloadReserva] = useState<ReservationPreload | undefined>();
  const [modalDetalle, setModalDetalle] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null);

  // Días a mostrar según vista
  const daysToShow = viewMode === 'Dia' ? 1 : viewMode === 'Semana' ? 14 : 31;

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
      toast({ 
        title: 'Error', 
        description: 'No se pudieron cargar los datos', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Navegación del timeline
  const navegarFecha = (direccion: 'prev' | 'next' | 'today') => {
    if (direccion === 'today') {
      setStartDate(new Date());
      return;
    }
    
    const dias = viewMode === 'Dia' ? 1 : viewMode === 'Semana' ? 7 : 30;
    setStartDate(prev => 
      direccion === 'next' ? addDays(prev, dias) : subDays(prev, dias)
    );
  };

  // Filtrar habitaciones
  const habitacionesFiltradas = habitaciones.filter(h => {
    if (filtroTipo !== 'all' && h.tipo_id !== filtroTipo) return false;
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return h.numero?.toLowerCase().includes(search) || 
             h.tipo_nombre?.toLowerCase().includes(search);
    }
    return true;
  });

  // Handlers de modales
  const handleCreateReservation = (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => {
    setPreloadReserva({
      habitacion,
      fechaCheckin,
      fechaCheckout
    });
    setModalNuevaReserva(true);
  };

  const handleReservationClick = (reserva: any) => {
    setReservaSeleccionada(reserva);
    setModalDetalle(true);
  };

  const handleSuccess = () => {
    cargarDatos();
  };

  // Stats rápidos
  const totalHabitaciones = habitaciones.length;
  const habitacionesOcupadas = reservas.filter(r => 
    ['CheckIn', 'Hospedado'].includes(r.estado)
  ).length;
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
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Recepción
          </h1>
          <p className="text-muted-foreground">Gestión de reservas y check-in/out</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => { setPreloadReserva(undefined); setModalNuevaReserva(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Reserva
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BedDouble className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{habitacionesOcupadas}/{totalHabitaciones}</p>
              <p className="text-xs text-muted-foreground">Ocupadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{llegadasHoy}</p>
              <p className="text-xs text-muted-foreground">Llegadas hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{salidasHoy}</p>
              <p className="text-xs text-muted-foreground">Salidas hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {totalHabitaciones > 0 ? Math.round((habitacionesOcupadas / totalHabitaciones) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Ocupación</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles del Timeline */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Navegación de fechas */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navegarFecha('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navegarFecha('today')}>
                Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={() => navegarFecha('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="ml-2 font-medium">
                {format(startDate, "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>

            {/* Vista */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                {(['Dia', 'Semana', 'Mes'] as ViewMode[]).map(mode => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todas las hab." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las hab.</SelectItem>
                  {tiposHabitacion.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9 w-40"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Cargando...</p>
          </CardContent>
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

      {/* Modales */}
      <NuevaReservaModal
        open={modalNuevaReserva}
        onOpenChange={setModalNuevaReserva}
        preload={preloadReserva}
        onSuccess={handleSuccess}
      />

      <DetalleReservaModal
        open={modalDetalle}
        onOpenChange={setModalDetalle}
        reserva={reservaSeleccionada}
        habitaciones={habitaciones}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
