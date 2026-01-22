import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { TimelineGrid } from '@/components/reservas/TimelineGrid';
import { NuevaReservaModal, ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { ReservaDetalleModal } from '@/components/reservas/ReservaDetalleModal';

type ViewMode = 'Dia' | 'Semana' | 'Mes';

export default function Reservas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);

  // Relacionado con `check-in-back/src/routes/reservas.js` (GET `/reservas/checkins-hoy`):
  // Este arreglo contiene las "llegadas de hoy" ya filtradas por backend (fecha + estado).
  // Se usa para poder "visualizar" las llegadas (no solo contarlas).
  const [llegadasHoyData, setLlegadasHoyData] = useState<any[]>([]);
  const [modalLlegadas, setModalLlegadas] = useState(false);

  // Relacionado con `check-in-back/src/routes/reservas.js` (GET `/reservas/checkouts-hoy`):
  // Este arreglo contiene las "salidas de hoy" ya filtradas por backend (fecha + estado).
  // Se usa para poder "visualizar" las salidas (no solo contarlas).
  const [salidasHoyData, setSalidasHoyData] = useState<any[]>([]);
  const [modalSalidas, setModalSalidas] = useState(false);
  const { toast } = useToast();

  const handleCardKeyDown = (
    e: React.KeyboardEvent,
    onOpen: () => void
  ) => {
    // Accesibilidad: permitir abrir el modal con Enter o Espacio.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

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
      const [habData, resData, tiposData, llegadasData, salidasData] = await Promise.all([
        api.getHabitaciones(),
        api.getReservas(),
        api.getTiposHabitacion(),
        // Consumido por este archivo para mostrar el listado de llegadas.
        api.getCheckinsHoy().catch(() => []),
        // Consumido por este archivo para mostrar el listado de salidas.
        api.getCheckoutsHoy().catch(() => [])
      ]);
      setHabitaciones(habData);
      setReservas(resData);
      setTiposHabitacion(tiposData);
      setLlegadasHoyData(Array.isArray(llegadasData) ? llegadasData : []);
      setSalidasHoyData(Array.isArray(salidasData) ? salidasData : []);
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
  // Las "llegadas" se obtienen desde backend (más confiable y permite listarlas).
  // Relacionado con `check-in-back/src/routes/reservas.js` (GET `/reservas/checkins-hoy`).
  const llegadasHoy = llegadasHoyData.length;
  // Las "salidas" se obtienen desde backend (más confiable y permite listarlas).
  // Relacionado con `check-in-back/src/routes/reservas.js` (GET `/reservas/checkouts-hoy`).
  const salidasHoy = salidasHoyData.length;

  return (
    <MainLayout title="Recepción" subtitle="Gestión de reservas">
      <div className="space-y-3">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-bold">{habitacionesOcupadas}/{totalHabitaciones}</p>
                <p className="text-[10px] text-muted-foreground">Ocupadas</p>
              </div>
            </div>
          </Card>
          <Card
            className="p-2 cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            role="button"
            tabIndex={0}
            aria-label="Ver llegadas de hoy"
            // Relacionado con `check-in-back/src/routes/reservas.js`:
            // Abre el listado de llegadas de hoy para "visualizarlas".
            onClick={() => setModalLlegadas(true)}
            onKeyDown={(e) => handleCardKeyDown(e, () => setModalLlegadas(true))}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-600">{llegadasHoy}</p>
                <p className="text-[10px] text-muted-foreground">Llegadas</p>
              </div>
            </div>
          </Card>
          <Card
            className="p-2 cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            role="button"
            tabIndex={0}
            aria-label="Ver salidas de hoy"
            // Relacionado con `check-in-back/src/routes/reservas.js`:
            // Abre el listado de salidas de hoy para "visualizarlas".
            onClick={() => setModalSalidas(true)}
            onKeyDown={(e) => handleCardKeyDown(e, () => setModalSalidas(true))}
          >
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

        {/* Controles */}
        <Card>
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

        {/* Timeline Container - CLAVE: position relative con altura fija */}
        <div className="relative" style={{ height: 'calc(100vh - 320px)', minHeight: '300px' }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center border rounded-lg bg-card">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
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

      {/* Modal: Llegadas de hoy */}
      <Dialog open={modalLlegadas} onOpenChange={setModalLlegadas}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Llegadas de hoy</DialogTitle>
          </DialogHeader>

          {llegadasHoyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay llegadas pendientes para hoy.</p>
          ) : (
            <div className="space-y-2">
              {llegadasHoyData.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded border p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {r.cliente_nombre || r.nombre} {r.apellido_paterno || ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.habitacion_numero ? `Hab. ${r.habitacion_numero}` : 'Hab. por asignar'} · {r.hora_llegada || '—'} · {r.numero_reserva || r.id?.slice(0, 8)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    // Relacionado con `Check-In-Front/src/pages/CheckIn.tsx`:
                    // Navega al flujo de check-in de la reserva seleccionada.
                    onClick={() => navigate(`/checkin/${r.id}`)}
                  >
                    Ir a Check-in
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Salidas de hoy */}
      <Dialog open={modalSalidas} onOpenChange={setModalSalidas}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salidas de hoy</DialogTitle>
          </DialogHeader>

          {salidasHoyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay salidas programadas para hoy.</p>
          ) : (
            <div className="space-y-2">
              {salidasHoyData.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded border p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {r.cliente_nombre || r.nombre} {r.apellido_paterno || ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.habitacion_numero ? `Hab. ${r.habitacion_numero}` : 'Hab. —'} · {r.numero_reserva || r.id?.slice(0, 8)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    // Relacionado con `Check-In-Front/src/pages/CheckOut.tsx`:
                    // Navega al flujo de check-out de la reserva seleccionada.
                    onClick={() => navigate(`/checkout/${r.id}`)}
                  >
                    Ir a Check-out
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
