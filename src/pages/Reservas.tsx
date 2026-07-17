import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Search, 
  CalendarDays, BedDouble, Users, RefreshCw, Calendar,
  LogIn, LogOut, Clock, ArrowRight, X, Eye, History, SlidersHorizontal,
  CheckCircle, XCircle, AlertCircle
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
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { TimelineGrid } from '@/components/reservas/TimelineGrid';
import { PublicLinkBanner } from '@/components/PublicLinkBanner';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { NuevaReservaModal, ReservationPreload } from '@/components/reservas/NuevaReservaModal';
import { ReservaDetalleModal } from '@/components/reservas/ReservaDetalleModal';
import { RecepcionGrid } from '@/components/reservas/RecepcionGrid';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/currency';
import { ReservaCard } from '@/components/reservas/ReservaCard';
import {
  ReservasFiltersSheet,
  countActiveFilters,
  defaultFilters,
  type ReservasFilters,
} from '@/components/reservas/ReservasFiltersSheet';
import { getEstadoConfig } from '@/components/reservas/estadoConfig';

type ViewMode = 'Dia' | 'Semana' | 'Mes';

export default function Reservas() {
  const navigate = useNavigate();
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

  const [startDate, setStartDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Semana');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [busqueda, setBusqueda] = useState('');

  const [modalNuevaReserva, setModalNuevaReserva] = useState(false);
  const [preloadReserva, setPreloadReserva] = useState<ReservationPreload | undefined>();
  const [modalDetalle, setModalDetalle] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null);
  const validViews = ['recepcion', 'checkin', 'checkout', 'timeline', 'historico'] as const;
  type Vista = typeof validViews[number];
  const tabActiva: Vista = (validViews as readonly string[]).includes(vista || '')
    ? (vista as Vista)
    : 'recepcion';
  const [busquedaCheckin, setBusquedaCheckin] = useState('');
  const [busquedaCheckout, setBusquedaCheckout] = useState('');
  const hoyISO = new Date().toISOString().slice(0, 10);
  const [desdeCheckin, setDesdeCheckin] = useState(hoyISO);
  const [hastaCheckin, setHastaCheckin] = useState(hoyISO);
  const [desdeCheckout, setDesdeCheckout] = useState(hoyISO);
  const [hastaCheckout, setHastaCheckout] = useState(hoyISO);
  const [busquedaHistorico, setBusquedaHistorico] = useState('');
  const [estadoHistorico, setEstadoHistorico] = useState<string>('todos');

  const daysToShow = viewMode === 'Dia' ? 7 : viewMode === 'Semana' ? 14 : 31;

  useEffect(() => {
    cargarDatos();
  }, []);

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

  const handleRecepcionLibreClick = (habitacion: any) => {
    const hoy = new Date();
    setPreloadReserva({
      habitacion,
      fechaCheckin: hoy,
      fechaCheckout: addDays(hoy, 1),
      origen: 'Recepcion',
    });
    setModalNuevaReserva(true);
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
        <PublicLinkBanner />
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

        {/* Vistas seleccionables desde el sidebar */}
        <Tabs value={tabActiva}>

          {/* TAB RECEPCIÓN: Cards por habitación */}
          <TabsContent value="recepcion" className="space-y-3 mt-3">
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
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
          </TabsContent>

          {/* TAB HISTÓRICO: Tabla con todas las reservas */}
          <TabsContent value="historico" className="space-y-3 mt-3">
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar reserva, cliente, habitación..."
                        className="pl-8 h-9 w-[260px] text-sm"
                        value={busquedaHistorico}
                        onChange={(e) => setBusquedaHistorico(e.target.value)}
                      />
                    </div>
                    <Select value={estadoHistorico} onValueChange={setEstadoHistorico}>
                      <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los estados</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Confirmada">Confirmada</SelectItem>
                        <SelectItem value="CheckIn">Check-In</SelectItem>
                        <SelectItem value="CheckOut">Check-Out</SelectItem>
                        <SelectItem value="Cancelada">Cancelada</SelectItem>
                        <SelectItem value="NoShow">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      const f = reservas.filter(r => {
                        if (estadoHistorico !== 'todos' && r.estado !== estadoHistorico) return false;
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

                <div className="relative w-full overflow-x-auto rounded-md border">
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
                            if (estadoHistorico !== 'todos' && r.estado !== estadoHistorico) return false;
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

                        const estadoColor: Record<string, string> = {
                          Pendiente: 'bg-yellow-500',
                          Confirmada: 'bg-blue-500',
                          CheckIn: 'bg-green-500',
                          CheckOut: 'bg-slate-500',
                          Cancelada: 'bg-red-500',
                          NoShow: 'bg-orange-500',
                        };

                        return filtradas.map((r) => {
                          const cliente = r.cliente_nombre
                            || `${r.clientes?.nombre || ''} ${r.clientes?.apellido_paterno || ''}`.trim()
                            || '—';
                          const habNum = r.habitacion_numero || r.habitaciones?.numero || '—';
                          const total = Number(r.total || 0);
                          const pagado = Number(r.total_pagado || 0);
                          const saldo = Number(r.saldo_pendiente ?? Math.max(0, total - pagado));
                          return (
                            <TableRow key={r.id} className="hover:bg-muted/50">
                              <TableCell className="font-mono text-xs">
                                {r.numero_reserva || r.id?.slice(0, 8)}
                              </TableCell>
                              <TableCell className="font-medium">{cliente}</TableCell>
                              <TableCell>Hab. {habNum}</TableCell>
                              <TableCell className="text-xs">
                                {r.fecha_checkin ? format(new Date(r.fecha_checkin), 'd MMM yyyy', { locale: es }) : '—'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.fecha_checkout ? format(new Date(r.fecha_checkout), 'd MMM yyyy', { locale: es }) : '—'}
                              </TableCell>
                              <TableCell className="text-center">{r.noches || '—'}</TableCell>
                              <TableCell>
                                <Badge className={`${estadoColor[r.estado] || 'bg-muted'} hover:${estadoColor[r.estado] || 'bg-muted'} text-white text-[10px]`}>
                                  {r.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {r.origen || 'Reserva'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{formatCurrency(total)}</TableCell>
                              <TableCell className="text-right tabular-nums text-green-600">{formatCurrency(pagado)}</TableCell>
                              <TableCell className={`text-right tabular-nums ${saldo > 0 ? 'text-orange-600 font-semibold' : ''}`}>
                                {formatCurrency(saldo)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${palette.iconBg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${palette.iconText}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-tight">{titulo}</h3>
              <p className="text-xs text-muted-foreground">{subtitulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
      <div className="flex items-end gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
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
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Desde</label>
          <Input type="date" value={desde} onChange={(e) => onDesdeChange(e.target.value)} className="h-9 text-sm w-[150px]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => onHastaChange(e.target.value)} className="h-9 text-sm w-[150px]" />
        </div>
        {(desde || hasta) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
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
        <Card className="p-12 text-center">
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
                    className="opacity-60 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(r.id);
                    }}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
