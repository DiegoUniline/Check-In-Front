import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { format, addDays, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Search, 
  CalendarDays, BedDouble, Users, RefreshCw, Calendar,
  LogIn, LogOut, Clock, ArrowRight, X, Eye, History, SlidersHorizontal,
  CheckCircle, XCircle, AlertCircle, Wrench, DollarSign
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
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api, { todayLocal } from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { TimelineGrid, type TimelineReservationAction } from '@/components/reservas/TimelineGrid';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import type { ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { RecepcionGrid } from '@/components/reservas/RecepcionGrid';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateFormat';
import { ReservaCard } from '@/components/reservas/ReservaCard';
import {
  ReservasFiltersSheet,
  countActiveFilters,
  defaultFilters,
  type ReservasFilters,
} from '@/components/reservas/ReservasFiltersSheet';
import { getEstadoConfig } from '@/components/reservas/estadoConfig';
import { cn } from '@/lib/utils';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addMonths } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useShift } from '@/contexts/useShift';

const RESERVAS_VIEW_KEY = 'vulo:reservas:view-state';
const readReservasViewState = (): Record<string, any> => {
  try { return JSON.parse(sessionStorage.getItem(RESERVAS_VIEW_KEY) || '{}'); }
  catch { return {}; }
};

// Chips reutilizables para filtro de tipo de habitación
const TipoChips = ({
  value,
  onChange,
  tipos,
}: {
  value: string;
  onChange: (v: string) => void;
  tipos: any[];
}) => (
  <div className="inline-flex items-center gap-1 bg-muted p-1 rounded-xl overflow-x-auto max-w-full">
    <button
      type="button"
      onClick={() => onChange('all')}
      className={cn(
        'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
        value === 'all'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      Todas
    </button>
    {tipos.map(t => (
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        className={cn(
          'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
          value === t.id
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t.nombre}
      </button>
    ))}
  </div>
);

// Chips para filtro de piso
const PisoChips = ({
  value,
  onChange,
  pisos,
}: {
  value: string;
  onChange: (v: string) => void;
  pisos: (string | number)[];
}) => {
  if (pisos.length === 0) return null;
  return (
    <div className="inline-flex items-center gap-1 bg-muted p-1 rounded-xl overflow-x-auto max-w-full">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={cn(
          'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
          value === 'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Todos los pisos
      </button>
      {pisos.map(p => (
        <button
          key={String(p)}
          type="button"
          onClick={() => onChange(String(p))}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
            value === String(p)
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Piso {p}
        </button>
      ))}
    </div>
  );
};

type ViewMode = 'Dia' | 'Semana' | 'Mes';
type OperationalFilter = 'all' | 'available' | 'occupied' | 'arrivals' | 'departures' | 'balance' | 'pending' | 'maintenance';

export default function Reservas() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { viewOnlyMode } = useShift();
  const savedView = useRef(readReservasViewState()).current;
  const mobileViewInitialized = useRef(Boolean(savedView.reservasSubView));
  const { vista } = useParams<{ vista?: string }>();
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

  const [startDate, setStartDate] = useState(() => parseISO(savedView.startDate || todayLocal()));
  const [viewMode, setViewMode] = useState<ViewMode>(savedView.viewMode || 'Semana');
  const [filtroTipo, setFiltroTipo] = useState<string>(savedView.filtroTipo || 'all');
  const [filtroPiso, setFiltroPiso] = useState<string>(savedView.filtroPiso || 'all');
  const [busqueda, setBusqueda] = useState(savedView.busqueda || '');
  const [operationalFilter, setOperationalFilter] = useState<OperationalFilter>(savedView.operationalFilter || 'all');
  const [focusReservationId, setFocusReservationId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const validViews = ['recepcion', 'checkin', 'checkout', 'timeline', 'historico'] as const;
  type Vista = typeof validViews[number];
  const tabActiva: Vista = (validViews as readonly string[]).includes(vista || '')
    ? (vista as Vista)
    : 'timeline';
  // Sub-vista dentro de "Reservas": timeline (default) | card | tabla
  type ReservasSubView = 'timeline' | 'card' | 'tabla';
  const [reservasSubView, setReservasSubView] = useState<ReservasSubView>(savedView.reservasSubView || 'timeline');
  const navigationParams = new URLSearchParams(location.search);
  const navigationFocus = navigationParams.get('focus');
  const navigationFrom = navigationParams.get('from');
  const navigationTo = navigationParams.get('to');
  const [busquedaCheckin, setBusquedaCheckin] = useState('');
  const [busquedaCheckout, setBusquedaCheckout] = useState('');
  const hoyISO = todayLocal();
  const ayerISO = format(subDays(parseISO(hoyISO), 1), 'yyyy-MM-dd');
  const [desdeCheckin, setDesdeCheckin] = useState(() => navigationFrom ?? (navigationFocus === 'overdue' ? '' : hoyISO));
  const [hastaCheckin, setHastaCheckin] = useState(() => navigationTo ?? (navigationFocus === 'overdue' ? ayerISO : hoyISO));
  const [desdeCheckout, setDesdeCheckout] = useState(() => navigationFrom ?? (navigationFocus === 'overdue' ? '' : hoyISO));
  const [hastaCheckout, setHastaCheckout] = useState(() => navigationTo ?? hoyISO);
  const [busquedaHistorico, setBusquedaHistorico] = useState('');
  const [estadoHistorico, setEstadoHistorico] = useState<string>('todos');
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [filtros, setFiltros] = useState<ReservasFilters>(savedView.filtros || defaultFilters);
  const activeFilterCount = countActiveFilters(filtros);

  const daysToShow = viewMode === 'Dia' ? 7 : viewMode === 'Semana' ? 14 : 31;

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    sessionStorage.setItem(RESERVAS_VIEW_KEY, JSON.stringify({
      startDate: format(startDate, 'yyyy-MM-dd'), viewMode, filtroTipo, filtroPiso,
      busqueda, reservasSubView, filtros, operationalFilter,
    }));
  }, [startDate, viewMode, filtroTipo, filtroPiso, busqueda, reservasSubView, filtros, operationalFilter]);

  // En teléfono la lista de habitaciones es la vista operativa más clara.
  // El calendario continúa disponible, pero ya no obliga a desplazarse al entrar.
  useEffect(() => {
    if (isMobile && !mobileViewInitialized.current) {
      mobileViewInitialized.current = true;
      setReservasSubView('card');
    }
  }, [isMobile]);

  // Realtime: refresca cuando cambian reservas o estados de habitación
  useRealtimeSync('reservas', () => cargarDatos());
  useRealtimeSync('habitaciones', () => cargarDatos());

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
      setStartDate(parseISO(todayLocal()));
      return;
    }
    const dias = viewMode === 'Dia' ? 7 : viewMode === 'Semana' ? 7 : 30;
    setStartDate(prev => direccion === 'next' ? addDays(prev, dias) : subDays(prev, dias));
  };

  const reservationSearchText = (reservation: any) => [
    reservation.numero_reserva,
    reservation.cliente_nombre,
    reservation.clientes?.nombre,
    reservation.clientes?.apellido_paterno,
    reservation.clientes?.apellido_materno,
    reservation.clientes?.telefono,
    reservation.clientes?.email,
    reservation.cliente_telefono,
    reservation.cliente_email,
    reservation.habitacion_numero,
    reservation.habitaciones?.numero,
  ].filter(Boolean).join(' ').toLowerCase();

  const matchingReservations = useMemo(() => {
    const search = busqueda.trim().toLowerCase();
    if (search.length < 2) return [];
    return reservas.filter((reservation) => reservationSearchText(reservation).includes(search)).slice(0, 6);
  }, [busqueda, reservas]);

  const habitacionesFiltradas = habitaciones.filter(h => {
    if (filtroTipo !== 'all' && h.tipo_habitacion_id !== filtroTipo) return false;
    if (filtroPiso !== 'all' && (h.piso == null || h.piso.toString() !== filtroPiso)) return false;
    const today = todayLocal();
    const roomReservations = reservas.filter((reservation) => {
      const roomId = reservation.habitacion_id || reservation.habitaciones?.id;
      return roomId === h.id && !['Cancelada', 'NoShow'].includes(String(reservation.estado || ''));
    });
    const occupiedToday = roomReservations.some((reservation) => {
      const checkin = String(reservation.fecha_checkin || '').slice(0, 10);
      const checkout = String(reservation.fecha_checkout || '').slice(0, 10);
      return checkin <= today && today < checkout;
    });
    const maintenance = String(h.estado_mantenimiento || 'OK').toLowerCase() !== 'ok'
      || String(h.estado_habitacion || '').toLowerCase().includes('mantenimiento');
    if (operationalFilter === 'available' && (occupiedToday || maintenance)) return false;
    if (operationalFilter === 'occupied' && !occupiedToday) return false;
    if (operationalFilter === 'arrivals' && !roomReservations.some((r) => String(r.fecha_checkin || '').slice(0, 10) === today)) return false;
    if (operationalFilter === 'departures' && !roomReservations.some((r) => String(r.fecha_checkout || '').slice(0, 10) === today)) return false;
    if (operationalFilter === 'balance' && !roomReservations.some((r) => Number(r.saldo_pendiente || 0) > 0)) return false;
    if (operationalFilter === 'pending' && !roomReservations.some((r) => r.estado === 'Pendiente')) return false;
    if (operationalFilter === 'maintenance' && !maintenance) return false;
    if (busqueda) {
      const search = busqueda.toLowerCase();
      const roomMatches = String(h.numero || '').toLowerCase().includes(search)
        || String(h.tipo_nombre || '').toLowerCase().includes(search);
      return roomMatches || roomReservations.some((reservation) => reservationSearchText(reservation).includes(search));
    }
    return true;
  });

  const pisosDisponibles = [...new Set(
    habitaciones.map(h => h.piso).filter(p => p != null && p !== '')
  )].sort((a: any, b: any) => Number(a) - Number(b));

  const openNewReservation = (preload?: ReservationPreload) => {
    if (viewOnlyMode) {
      toast({ title: 'Modo sólo consulta', description: 'Abre un turno para crear reservaciones.' });
      return;
    }
    const params = new URLSearchParams();
    if (preload?.habitacion?.id) params.set('roomId', preload.habitacion.id);
    if (preload?.fechaCheckin) params.set('checkin', format(preload.fechaCheckin, 'yyyy-MM-dd'));
    if (preload?.fechaCheckout) params.set('checkout', format(preload.fechaCheckout, 'yyyy-MM-dd'));
    if (preload?.origen) params.set('origin', preload.origen);
    navigate(`/reservas/nueva${params.size ? `?${params.toString()}` : ''}`, {
      state: {
        reservationPreload: {
          habitacion: preload?.habitacion,
          fechaCheckin: preload?.fechaCheckin ? format(preload.fechaCheckin, 'yyyy-MM-dd') : undefined,
          fechaCheckout: preload?.fechaCheckout ? format(preload.fechaCheckout, 'yyyy-MM-dd') : undefined,
          origen: preload?.origen,
        },
      },
    });
  };

  const handleCreateReservation = (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => {
    openNewReservation({ habitacion, fechaCheckin, fechaCheckout });
  };

  const handleReservationClick = (reserva: any) => {
    navigate(`/reservas/detalle/${reserva.id}`);
  };

  const handleTimelineAction = (
    reserva: any,
    action: TimelineReservationAction,
    params: Record<string, string> = {},
  ) => {
    if (action === 'view') {
      const operation = params.operation;
      if (!operation) return handleReservationClick(reserva);
      const query = new URLSearchParams({ operation, ...(params.checkout ? { checkout: params.checkout } : {}) });
      navigate(`/reservas/detalle/${reserva.id}?${query.toString()}`);
      return;
    }
    if (action === 'checkin') return navigate(`/checkin/${reserva.id}`);
    if (action === 'checkout') return navigate(`/checkout/${reserva.id}`);
    if (viewOnlyMode) {
      toast({ title: 'Modo sólo consulta', description: 'Abre un turno para realizar esta operación.' });
      return;
    }
    const query = new URLSearchParams({ operation: action });
    if (params.checkout) query.set('checkout', params.checkout);
    if (params.roomId) query.set('roomId', params.roomId);
    navigate(`/reservas/detalle/${reserva.id}?${query.toString()}`);
  };

  const focusReservation = (reserva: any) => {
    if (reserva.fecha_checkin) setStartDate(subDays(parseISO(String(reserva.fecha_checkin).slice(0, 10)), 1));
    setViewMode('Semana');
    setFiltroTipo('all');
    setFiltroPiso('all');
    setOperationalFilter('all');
    setFocusReservationId(reserva.id);
    setSearchOpen(false);
  };

  const handleRecepcionLibreClick = (habitacion: any) => {
    if (viewOnlyMode) {
      toast({ title: 'Modo sólo consulta', description: 'Abre un turno para registrar una entrada.' });
      return;
    }
    const hoy = parseISO(todayLocal());
    openNewReservation({
      habitacion,
      fechaCheckin: hoy,
      fechaCheckout: addDays(hoy, 1),
      origen: 'Recepcion',
    });
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
      <div
        className="space-y-3"
        style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
      >
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <Button
            className="col-span-2 h-12 justify-center text-sm font-semibold shadow-sm"
            disabled={viewOnlyMode}
            title={viewOnlyMode ? 'Abre un turno para crear reservaciones' : undefined}
            onClick={() => {
              openNewReservation();
            }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Nueva reserva
          </Button>
          <Button variant="outline" className="h-11" onClick={() => navigate('/reservas/checkin')}>
            <LogIn className="mr-2 h-4 w-4 text-emerald-600" />
            Llegadas ({llegadasHoy})
          </Button>
          <Button variant="outline" className="h-11" onClick={() => navigate('/reservas/checkout')}>
            <LogOut className="mr-2 h-4 w-4 text-orange-600" />
            Salidas ({salidasHoy})
          </Button>
        </div>

        {/* KPI compactos, mobile-first */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <BedDouble className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold tabular-nums leading-tight">
                  {habitacionesOcupadas}<span className="text-xs text-muted-foreground font-normal">/{totalHabitaciones}</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ocupadas</p>
              </div>
            </div>
          </Card>
          <Card
            className="p-3 cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="button"
            tabIndex={0}
            aria-label="Ver llegadas de hoy"
            onClick={() => setModalLlegadas(true)}
            onKeyDown={(e) => handleCardKeyDown(e, () => setModalLlegadas(true))}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <LogIn className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold tabular-nums leading-tight text-emerald-600 dark:text-emerald-400">{llegadasHoy}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Llegadas hoy</p>
              </div>
            </div>
          </Card>
          <Card
            className="p-3 cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="button"
            tabIndex={0}
            aria-label="Ver salidas de hoy"
            onClick={() => setModalSalidas(true)}
            onKeyDown={(e) => handleCardKeyDown(e, () => setModalSalidas(true))}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold tabular-nums leading-tight text-orange-600 dark:text-orange-400">{salidasHoy}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Salidas hoy</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold tabular-nums leading-tight text-sky-600 dark:text-sky-400">
                  {totalHabitaciones > 0 ? Math.round((habitacionesOcupadas / totalHabitaciones) * 100) : 0}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ocupación</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Vistas seleccionables desde el sidebar */}
        <Tabs value={tabActiva}>

          {/* TAB RECEPCIÓN: Cards por habitación */}
          <TabsContent value="recepcion" className="space-y-3 mt-3">
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TipoChips value={filtroTipo} onChange={setFiltroTipo} tipos={tiposHabitacion} />
                    <PisoChips value={filtroPiso} onChange={setFiltroPiso} pisos={pisosDisponibles} />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Buscar habitación..."
                      className="h-10 w-full pl-8 text-sm sm:h-8 sm:w-[200px] sm:text-xs"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-12 border rounded-lg bg-card">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RecepcionGrid
                habitaciones={habitacionesFiltradas}
                reservas={reservas}
                onLibreClick={handleRecepcionLibreClick}
                onOcupadaClick={handleReservationClick}
                onReservadaClick={handleReservationClick}
              />
            )}
          </TabsContent>

          {/* TAB CHECK-IN PENDIENTES */}
          <TabsContent value="checkin" className="space-y-3 mt-3">
            <CheckInOutPanel
              tipo="checkin"
              data={reservas.filter((r: any) =>
                !r.checkin_realizado &&
                !['Cancelada', 'NoShow'].includes(r.estado) &&
                !(r.origen === 'Web' && r.estado === 'Pendiente')
              )}
              loading={loading}
              busqueda={busquedaCheckin}
              onBusquedaChange={setBusquedaCheckin}
              desde={desdeCheckin}
              hasta={hastaCheckin}
              onDesdeChange={setDesdeCheckin}
              onHastaChange={setHastaCheckin}
              onAction={(id) => navigate(`/checkin/${id}`)}
              onRefresh={cargarDatos}
            />
          </TabsContent>

          {/* TAB CHECK-OUT PENDIENTES */}
          <TabsContent value="checkout" className="space-y-3 mt-3">
            <CheckInOutPanel
              tipo="checkout"
              data={reservas.filter((r: any) =>
                r.checkin_realizado &&
                !r.checkout_realizado &&
                !['Cancelada', 'NoShow'].includes(r.estado)
              )}
              loading={loading}
              busqueda={busquedaCheckout}
              onBusquedaChange={setBusquedaCheckout}
              desde={desdeCheckout}
              hasta={hastaCheckout}
              onDesdeChange={setDesdeCheckout}
              onHastaChange={setHastaCheckout}
              onAction={(id) => navigate(`/checkout/${id}`)}
              onRefresh={cargarDatos}
            />
          </TabsContent>

          {/* TAB RESERVAS: Timeline existente */}
          <TabsContent value="timeline" className="space-y-3 mt-3">
            {/* Selector Timeline / Card / Tabla */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="grid w-full grid-cols-3 rounded-xl bg-muted p-1 sm:inline-flex sm:w-auto">
                {([
                  { key: 'timeline', label: 'Calendario' },
                  { key: 'card', label: 'Card' },
                  { key: 'tabla', label: 'Tabla' },
                ] as { key: ReservasSubView; label: string }[]).map(opt => (
                  <Button
                    key={opt.key}
                    variant={reservasSubView === opt.key ? 'default' : 'ghost'}
                    size="sm"
                    className="h-10 w-full px-2 text-xs font-medium sm:w-32 sm:px-4 sm:text-sm"
                    onClick={() => setReservasSubView(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {reservasSubView === 'timeline' && (
            <>
            <Card>
          <CardContent className="p-3 space-y-2">
            {/* Fila 1: navegación de fecha + vista */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarFecha('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium" onClick={() => navegarFecha('today')}>
                  Hoy
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarFecha('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium ml-1 gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(startDate, "d MMM yyyy", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      locale={es}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="inline-flex items-center gap-1 bg-muted p-1 rounded-xl">
                {(['Dia', 'Semana', 'Mes'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                      viewMode === mode
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Fila 2: filtros de tipo + búsqueda */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <TipoChips value={filtroTipo} onChange={setFiltroTipo} tipos={tiposHabitacion} />
                <PisoChips value={filtroPiso} onChange={setFiltroPiso} pisos={pisosDisponibles} />
              </div>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Huésped, folio, teléfono o habitación…"
                  className="h-10 w-full pl-8 pr-8 text-sm sm:h-9 sm:w-[320px] sm:text-xs"
                  value={busqueda}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                  onChange={(e) => { setBusqueda(e.target.value); setSearchOpen(true); setFocusReservationId(null); }}
                />
                {busqueda && <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" onMouseDown={(event) => event.preventDefault()} onClick={() => { setBusqueda(''); setFocusReservationId(null); }} aria-label="Limpiar búsqueda"><X className="h-3.5 w-3.5" /></button>}
                {searchOpen && matchingReservations.length > 0 && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[320px] overflow-hidden rounded-xl border bg-white shadow-xl">
                    <p className="border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reservas encontradas</p>
                    {matchingReservations.map((reservation) => {
                      const name = reservation.cliente_nombre || [reservation.clientes?.nombre, reservation.clientes?.apellido_paterno, reservation.clientes?.apellido_materno].filter(Boolean).join(' ') || 'Sin nombre';
                      return <button key={reservation.id} type="button" className="flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted/50" onMouseDown={(event) => event.preventDefault()} onClick={() => focusReservation(reservation)}>
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#10233F]">{name}</span><span className="block truncate text-xs text-muted-foreground">Hab. {reservation.habitacion_numero || reservation.habitaciones?.numero || '—'} · {reservation.numero_reserva || 'Sin folio'}</span></span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(reservation.fecha_checkin)}</span>
                      </button>;
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {([
                ['all', 'Todas', CalendarDays],
                ['available', 'Disponibles hoy', CheckCircle],
                ['occupied', 'Ocupadas hoy', BedDouble],
                ['arrivals', 'Llegadas hoy', LogIn],
                ['departures', 'Salidas hoy', LogOut],
                ['balance', 'Con saldo', DollarSign],
                ['pending', 'Pendientes', Clock],
                ['maintenance', 'Mantenimiento', Wrench],
              ] as [OperationalFilter, string, typeof CalendarDays][]).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOperationalFilter(value)}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                    operationalFilter === value
                      ? 'border-[#10233F] bg-[#10233F] text-white'
                      : 'border-[#10233F]/10 bg-white text-[#10233F] hover:border-[#10233F]/30 hover:bg-[#10233F]/[0.03]',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Container - CLAVE: position relative con altura fija */}
        <div className="relative" style={{ height: 'calc(100vh - 320px)', minHeight: '300px' }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center border rounded-lg bg-card">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : habitacionesFiltradas.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg border bg-card p-6 text-center">
              <div><Search className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 font-semibold text-[#10233F]">No hay habitaciones con estos filtros</p><p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o vuelve a mostrar toda la operación.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => { setBusqueda(''); setFiltroTipo('all'); setFiltroPiso('all'); setOperationalFilter('all'); }}>Limpiar filtros</Button></div>
            </div>
          ) : (
            <TimelineGrid
              habitaciones={habitacionesFiltradas}
              reservas={reservas}
              startDate={startDate}
              daysToShow={daysToShow}
              onReservationClick={handleReservationClick}
              onReservationAction={handleTimelineAction}
              onCreateReservation={handleCreateReservation}
              focusReservationId={focusReservationId}
              canCreate={!viewOnlyMode}
            />
          )}
        </div>
            </>
            )}

            {reservasSubView === 'card' && (
              <>
                <Card>
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TipoChips value={filtroTipo} onChange={setFiltroTipo} tipos={tiposHabitacion} />
                        <PisoChips value={filtroPiso} onChange={setFiltroPiso} pisos={pisosDisponibles} />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Buscar habitación..."
                          className="pl-7 h-8 w-[200px] text-xs"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {loading ? (
                  <div className="flex items-center justify-center py-12 border rounded-lg bg-card">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <RecepcionGrid
                    habitaciones={habitacionesFiltradas}
                    reservas={reservas}
                    onLibreClick={handleRecepcionLibreClick}
                    onOcupadaClick={handleReservationClick}
                    onReservadaClick={handleReservationClick}
                  />
                )}
              </>
            )}

            {reservasSubView === 'tabla' && (
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar habitación..."
                      className="pl-8 h-9 text-sm"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Habitación</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Huésped actual</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const rows = habitacionesFiltradas;
                          if (rows.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                  Sin habitaciones
                                </TableCell>
                              </TableRow>
                            );
                          }
                          const hoy = todayLocal();
                          return rows.map((h: any) => {
                            const activa = reservas.find((r: any) => {
                              const rid = r.habitacion_id || r.habitaciones?.id;
                              if (rid !== h.id) return false;
                              if (['Cancelada', 'NoShow'].includes(r.estado)) return false;
                              const ci = (r.fecha_checkin || '').substring(0, 10);
                              const co = (r.fecha_checkout || '').substring(0, 10);
                              return ci <= hoy && hoy < co;
                            });
                            const est = getEstadoConfig(activa?.estado || h.estado_habitacion || 'Libre');
                            const cliente = activa
                              ? (activa.clientes
                                  ? `${activa.clientes.nombre || ''} ${activa.clientes.apellido_paterno || ''}`.trim()
                                  : activa.cliente_nombre || '—')
                              : '—';
                            return (
                              <TableRow
                                key={h.id}
                                className="cursor-pointer"
                                onClick={() => activa
                                  ? handleReservationClick(activa)
                                  : handleRecepcionLibreClick(h)}
                              >
                                <TableCell className="font-medium">{h.numero || '—'}</TableCell>
                                <TableCell>{h.tipo_nombre || '—'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={est.badge}>{est.label}</Badge>
                                </TableCell>
                                <TableCell>{cliente}</TableCell>
                                <TableCell>{formatDate(activa?.fecha_checkin)}</TableCell>
                                <TableCell>{formatDate(activa?.fecha_checkout)}</TableCell>
                                <TableCell>
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB HISTÓRICO: Tabla con todas las reservas */}
          <TabsContent value="historico" className="space-y-3 mt-3">
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[180px] sm:flex-initial sm:min-w-[260px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar reserva, cliente, habitación..."
                      className="pl-8 h-10 text-sm w-full"
                      value={busquedaHistorico}
                      onChange={(e) => setBusquedaHistorico(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2 relative"
                    onClick={() => setFiltrosOpen(true)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtros</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-[10px] rounded-full">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
                    {(() => {
                      const f = reservas.filter(r => {
                        if (filtros.estado !== 'todos' && r.estado !== filtros.estado) return false;
                        if (filtros.tipoHabitacion !== 'all' && r.tipo_id !== filtros.tipoHabitacion && r.habitaciones?.tipo_id !== filtros.tipoHabitacion) return false;
                        if (filtros.origen !== 'todos' && r.origen !== filtros.origen) return false;
                        if (filtros.soloConSaldo && !(Number(r.saldo_pendiente || 0) > 0)) return false;
                        if (filtros.desde && (!r.fecha_checkin || r.fecha_checkin.substring(0, 10) < filtros.desde)) return false;
                        if (filtros.hasta && (!r.fecha_checkin || r.fecha_checkin.substring(0, 10) > filtros.hasta)) return false;
                        if (!busquedaHistorico) return true;
                        const t = busquedaHistorico.toLowerCase();
                        return (
                          r.numero_reserva?.toLowerCase().includes(t) ||
                          r.cliente_nombre?.toLowerCase().includes(t) ||
                          r.clientes?.nombre?.toLowerCase().includes(t) ||
                          r.clientes?.apellido_paterno?.toLowerCase().includes(t) ||
                          r.habitacion_numero?.toString().includes(t) ||
                          r.habitaciones?.numero?.toString().includes(t)
                        );
                      });
                      return `${f.length} reserva(s)`;
                    })()}
                  </span>
                </div>

                {/* Chips de filtros activos */}
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {filtros.desde && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        Desde {filtros.desde}
                        <button
                          className="ml-0.5 hover:bg-background/60 rounded p-0.5"
                          onClick={() => setFiltros({ ...filtros, desde: '' })}
                          aria-label="Quitar filtro desde"
                        ><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {filtros.hasta && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        Hasta {filtros.hasta}
                        <button
                          className="ml-0.5 hover:bg-background/60 rounded p-0.5"
                          onClick={() => setFiltros({ ...filtros, hasta: '' })}
                          aria-label="Quitar filtro hasta"
                        ><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {filtros.estado !== 'todos' && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        {filtros.estado}
                        <button
                          className="ml-0.5 hover:bg-background/60 rounded p-0.5"
                          onClick={() => setFiltros({ ...filtros, estado: 'todos' })}
                          aria-label="Quitar filtro estado"
                        ><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {filtros.tipoHabitacion !== 'all' && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        {tiposHabitacion.find(t => t.id === filtros.tipoHabitacion)?.nombre || 'Tipo'}
                        <button
                          className="ml-0.5 hover:bg-background/60 rounded p-0.5"
                          onClick={() => setFiltros({ ...filtros, tipoHabitacion: 'all' })}
                          aria-label="Quitar filtro tipo"
                        ><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {filtros.origen !== 'todos' && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        {filtros.origen}
                        <button
                          className="ml-0.5 hover:bg-background/60 rounded p-0.5"
                          onClick={() => setFiltros({ ...filtros, origen: 'todos' })}
                          aria-label="Quitar filtro origen"
                        ><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {filtros.soloConSaldo && (
                      <Badge variant="secondary" className="gap-1 pr-1">
                        Con saldo
                        <button
                          className="ml-0.5 hover:bg-background/60 rounded p-0.5"
                          onClick={() => setFiltros({ ...filtros, soloConSaldo: false })}
                          aria-label="Quitar filtro saldo"
                        ><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFiltros(defaultFilters)}
                    >
                      Limpiar todo
                    </Button>
                  </div>
                )}

                {/* Desktop: tabla — Móvil: tarjetas */}
                <div className="hidden md:block relative w-full overflow-x-auto rounded-md border">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reserva</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Habitación</TableHead>
                        <TableHead>Check-In</TableHead>
                        <TableHead>Check-Out</TableHead>
                        <TableHead className="text-center">Noches</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Pagado</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center py-8">
                            <RefreshCw className="h-5 w-5 animate-spin inline-block text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : (() => {
                        const filtradas = reservas
                          .filter(r => {
                            if (filtros.estado !== 'todos' && r.estado !== filtros.estado) return false;
                            if (filtros.tipoHabitacion !== 'all' && r.tipo_id !== filtros.tipoHabitacion && r.habitaciones?.tipo_id !== filtros.tipoHabitacion) return false;
                            if (filtros.origen !== 'todos' && r.origen !== filtros.origen) return false;
                            if (filtros.soloConSaldo && !(Number(r.saldo_pendiente || 0) > 0)) return false;
                            if (filtros.desde && (!r.fecha_checkin || r.fecha_checkin.substring(0, 10) < filtros.desde)) return false;
                            if (filtros.hasta && (!r.fecha_checkin || r.fecha_checkin.substring(0, 10) > filtros.hasta)) return false;
                            if (!busquedaHistorico) return true;
                            const t = busquedaHistorico.toLowerCase();
                            return (
                              r.numero_reserva?.toLowerCase().includes(t) ||
                              r.cliente_nombre?.toLowerCase().includes(t) ||
                              r.clientes?.nombre?.toLowerCase().includes(t) ||
                              r.clientes?.apellido_paterno?.toLowerCase().includes(t) ||
                              r.habitacion_numero?.toString().includes(t) ||
                              r.habitaciones?.numero?.toString().includes(t)
                            );
                          })
                          .sort((a, b) => new Date(b.fecha_checkin).getTime() - new Date(a.fecha_checkin).getTime());

                        if (filtradas.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={12} className="text-center py-8 text-muted-foreground text-sm">
                                No se encontraron reservas
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return filtradas.map((r) => {
                          const cliente = r.cliente_nombre
                            || `${r.clientes?.nombre || ''} ${r.clientes?.apellido_paterno || ''}`.trim()
                            || '—';
                          const habNum = r.habitacion_numero || r.habitaciones?.numero || '—';
                          const total = Number(r.total || 0);
                          const pagado = Number(r.total_pagado || 0);
                          const saldo = Number(r.saldo_pendiente ?? Math.max(0, total - pagado));
                          const estCfg = getEstadoConfig(r.estado);
                          const EstIcon = estCfg.icon;
                          return (
                            <TableRow key={r.id} className="hover:bg-muted/50">
                              <TableCell className="font-mono text-xs">
                                {r.numero_reserva || r.id?.slice(0, 8)}
                              </TableCell>
                              <TableCell className="font-medium">{cliente}</TableCell>
                              <TableCell>Hab. {habNum}</TableCell>
                              <TableCell className="text-xs">{formatDate(r.fecha_checkin)}</TableCell>
                              <TableCell className="text-xs">{formatDate(r.fecha_checkout)}</TableCell>
                              <TableCell className="text-center">{r.noches || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`${estCfg.badge} text-[10px] gap-1`}>
                                  <EstIcon className="h-3 w-3" aria-hidden="true" />
                                  {estCfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {r.origen || 'Reserva'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(total)}</TableCell>
                              <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(pagado)}</TableCell>
                              <TableCell className={`text-right tabular-nums ${saldo > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                                {formatCurrency(saldo)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  aria-label="Ver detalle"
                                  onClick={() => handleReservationClick(r)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (() => {
                    const filtradas = reservas
                      .filter(r => {
                        if (filtros.estado !== 'todos' && r.estado !== filtros.estado) return false;
                        if (filtros.tipoHabitacion !== 'all' && r.tipo_id !== filtros.tipoHabitacion && r.habitaciones?.tipo_id !== filtros.tipoHabitacion) return false;
                        if (filtros.origen !== 'todos' && r.origen !== filtros.origen) return false;
                        if (filtros.soloConSaldo && !(Number(r.saldo_pendiente || 0) > 0)) return false;
                        if (filtros.desde && (!r.fecha_checkin || r.fecha_checkin.substring(0, 10) < filtros.desde)) return false;
                        if (filtros.hasta && (!r.fecha_checkin || r.fecha_checkin.substring(0, 10) > filtros.hasta)) return false;
                        if (!busquedaHistorico) return true;
                        const t = busquedaHistorico.toLowerCase();
                        return (
                          r.numero_reserva?.toLowerCase().includes(t) ||
                          r.cliente_nombre?.toLowerCase().includes(t) ||
                          r.clientes?.nombre?.toLowerCase().includes(t) ||
                          r.clientes?.apellido_paterno?.toLowerCase().includes(t) ||
                          r.habitacion_numero?.toString().includes(t) ||
                          r.habitaciones?.numero?.toString().includes(t)
                        );
                      })
                      .sort((a, b) => new Date(b.fecha_checkin).getTime() - new Date(a.fecha_checkin).getTime());

                    if (filtradas.length === 0) {
                      return (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          {activeFilterCount > 0 || busquedaHistorico
                            ? 'No encontramos reservas con estos filtros'
                            : 'Todavía no hay reservas registradas'}
                          {(activeFilterCount > 0 || busquedaHistorico) && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setFiltros(defaultFilters); setBusquedaHistorico(''); }}
                              >
                                Limpiar filtros
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return filtradas.map((r) => (
                      <ReservaCard key={r.id} reserva={r} onClick={handleReservationClick} />
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Filtros */}
      <ReservasFiltersSheet
        open={filtrosOpen}
        onOpenChange={setFiltrosOpen}
        value={filtros}
        onApply={setFiltros}
        tiposHabitacion={tiposHabitacion}
      />

      {/* Modal: Llegadas de hoy */}
      <Dialog open={modalLlegadas} onOpenChange={setModalLlegadas}>
        <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-auto max-h-[calc(100dvh-1rem)] sm:max-h-[80dvh] overflow-y-auto">
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
        <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] sm:w-auto max-h-[calc(100dvh-1rem)] sm:max-h-[80dvh] overflow-y-auto">
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

/* ===================== Check-In / Check-Out Panel ===================== */

interface CheckInOutPanelProps {
  tipo: 'checkin' | 'checkout';
  data: any[];
  loading: boolean;
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  desde: string;
  hasta: string;
  onDesdeChange: (value: string) => void;
  onHastaChange: (value: string) => void;
  onAction: (id: string) => void;
  onRefresh: () => void;
}

function CheckInOutPanel({
  tipo,
  data,
  loading,
  busqueda,
  onBusquedaChange,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
  onAction,
  onRefresh,
}: CheckInOutPanelProps) {
  const esCheckin = tipo === 'checkin';
  const Icon = esCheckin ? LogIn : LogOut;
  const palette = esCheckin
    ? {
        cardBorder: 'border-emerald-200 dark:border-emerald-900',
        cardBg: 'bg-emerald-50/40 dark:bg-emerald-950/10',
        iconBg: 'bg-emerald-500/10',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        bigText: 'text-emerald-600 dark:text-emerald-400',
        avatarBg: 'bg-emerald-100 dark:bg-emerald-950/40',
        avatarText: 'text-emerald-700 dark:text-emerald-300',
      }
    : {
        cardBorder: 'border-orange-200 dark:border-orange-900',
        cardBg: 'bg-orange-50/40 dark:bg-orange-950/10',
        iconBg: 'bg-orange-500/10',
        iconText: 'text-orange-600 dark:text-orange-400',
        bigText: 'text-orange-600 dark:text-orange-400',
        avatarBg: 'bg-orange-100 dark:bg-orange-950/40',
        avatarText: 'text-orange-700 dark:text-orange-300',
      };
  const titulo = esCheckin ? 'Check-In pendientes' : 'Check-Out pendientes';
  const subtitulo = esCheckin
    ? 'Reservas pendientes de check-in (incluye atrasadas)'
    : 'Huéspedes pendientes de check-out (incluye atrasados)';
  const ctaLabel = esCheckin ? 'Iniciar Check-In' : 'Iniciar Check-Out';
  const emptyText = esCheckin
    ? 'No hay check-ins pendientes en el rango seleccionado.'
    : 'No hay check-outs pendientes en el rango seleccionado.';

  const fechaCampo = esCheckin ? 'fecha_checkin' : 'fecha_checkout';

  const filtrados = data.filter((r: any) => {
    const f = r[fechaCampo];
    if (desde && (!f || f < desde)) return false;
    if (hasta && (!f || f > hasta)) return false;
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    const nombre = `${r.cliente_nombre || r.nombre || ''} ${r.apellido_paterno || ''}`.toLowerCase();
    const hab = String(r.habitacion_numero || '').toLowerCase();
    const num = String(r.numero_reserva || r.id || '').toLowerCase();
    return nombre.includes(q) || hab.includes(q) || num.includes(q);
  });

  const totalPersonas = filtrados.reduce(
    (acc: number, r: any) => acc + (Number(r.adultos) || 0) + (Number(r.ninos) || 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className={`${palette.cardBorder} ${palette.cardBg}`}>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${palette.iconBg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${palette.iconText}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-tight">{titulo}</h3>
              <p className="text-xs text-muted-foreground">{subtitulo}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
            <div className="text-right">
              <p className={`text-2xl font-light tabular-nums leading-none ${palette.bigText}`}>
                {filtrados.length}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                Reservas
              </p>
            </div>
            <div className="text-right border-l pl-4">
              <p className="text-2xl font-light tabular-nums leading-none">
                {totalPersonas}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                Personas
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
        <div className="relative col-span-2 min-w-0 sm:flex-1 sm:min-w-[220px] sm:max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por huésped, habitación o número…"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {busqueda && (
            <button
              onClick={() => onBusquedaChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Desde</label>
          <Input type="date" value={desde} onChange={(e) => onDesdeChange(e.target.value)} className="h-10 w-full min-w-0 text-sm sm:h-9 sm:w-[150px]" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => onHastaChange(e.target.value)} className="h-10 w-full min-w-0 text-sm sm:h-9 sm:w-[150px]" />
        </div>
        {(desde || hasta) && (
          <Button
            variant="ghost"
            size="sm"
            className="col-span-2 h-9 sm:col-auto"
            onClick={() => { onDesdeChange(''); onHastaChange(''); }}
          >
            Limpiar fechas
          </Button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12 border rounded-lg bg-card">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <Card className="p-8 text-center sm:p-12">
          <Icon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {busqueda ? 'No se encontraron reservas con ese término' : emptyText}
          </p>
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtrados.map((r: any) => {
            const nombre = `${r.cliente_nombre || r.nombre || ''} ${r.apellido_paterno || ''}`.trim() || 'Sin nombre';
            const personas = (Number(r.adultos) || 0) + (Number(r.ninos) || 0);
            const saldo = Number(r.saldo_pendiente) || 0;
            const initials = nombre
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((s: string) => s[0]?.toUpperCase())
              .join('');

            return (
              <Card
                key={r.id}
                className="p-3 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onAction(r.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-full ${palette.avatarBg} ${palette.avatarText} flex items-center justify-center font-semibold text-sm flex-shrink-0`}
                  >
                    {initials || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{nombre}</p>
                      {saldo > 0 && (
                        <span className="text-[10px] font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          {formatCurrency(saldo)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3 w-3" />
                        {r.habitacion_numero ? `Hab. ${r.habitacion_numero}` : 'Sin asignar'}
                      </span>
                      {personas > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {personas} pax
                        </span>
                      )}
                      {esCheckin && r.hora_llegada && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.hora_llegada}
                        </span>
                      )}
                      <span className="text-muted-foreground/60">
                        · {r.numero_reserva || r.id?.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hidden opacity-60 transition-opacity group-hover:opacity-100 sm:inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(r.id);
                    }}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="mt-3 h-10 w-full sm:hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(r.id);
                  }}
                >
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
