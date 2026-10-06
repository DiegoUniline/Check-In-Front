import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, Calendar, Eye, Download, RefreshCw, 
  BedDouble, CreditCard, Clock, MapPin, Phone, Mail,
  FileText, DollarSign, X, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, LogIn, LogOut,
  User, Globe, Wallet, Trash2, CalendarRange, Filter
} from 'lucide-react';
import { MoreVertical, Printer, FileDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, currencyCode } from '@/lib/currency';
import { ExportButton } from '@/components/ExportButton';
import { formatDate as fmtDate } from '@/lib/dateFormat';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { exportarComprobanteReserva, exportarRegistroHuesped } from '@/lib/pdfExport';
import ReservaDetalle from '@/pages/ReservaDetalle';

export default function HistorialReservas() {
  const { toast } = useToast();
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [origenFiltro, setOrigenFiltro] = useState('todos');
  const [habitacionFiltro, setHabitacionFiltro] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>();
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>();
  const [rangoBorrador, setRangoBorrador] = useState<{ from?: Date; to?: Date }>({});
  const [rangoPopoverOpen, setRangoPopoverOpen] = useState(false);
  
  // Paginación
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(20);
  
  // Modal detalle
  const [reservaDetalleId, setReservaDetalleId] = useState<string | null>(null);

  // Selección múltiple
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    cargarReservas();
  }, [pagina, estadoFiltro, origenFiltro, fechaDesde, fechaHasta]);

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      
      if (estadoFiltro !== 'todos') params.estado = estadoFiltro;
      if (origenFiltro !== 'todos') params.origen = origenFiltro;
      if (fechaDesde) params.fecha_desde = format(fechaDesde, 'yyyy-MM-dd');
      if (fechaHasta) params.fecha_hasta = format(fechaHasta, 'yyyy-MM-dd');
      
      const data = await api.getReservas(params);
      setReservas(data);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las reservas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = (reserva: any) => setReservaDetalleId(reserva.id);

  const limpiarFiltros = () => {
    setBusqueda('');
    setEstadoFiltro('todos');
    setOrigenFiltro('todos');
    setHabitacionFiltro('todos');
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setRangoBorrador({});
    setPagina(1);
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSeleccionarTodasPagina = (checked: boolean) => {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      reservasPaginadas.forEach(r => {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      });
      return next;
    });
  };

  const limpiarSeleccion = () => setSeleccionadas(new Set());

  const eliminarSeleccionadas = async () => {
    if (seleccionadas.size === 0) return;
    setEliminando(true);
    try {
      // Las reservas nunca se borran: se cancelan para conservar quién,
      // cuándo y por qué. Sólo aplica a reservas que aún no inician.
      const ids = reservas
        .filter((r: any) => seleccionadas.has(r.id) && ['Pendiente', 'Confirmada'].includes(r.estado) && !r.checkin_realizado)
        .map((r: any) => r.id);
      const omitidas = seleccionadas.size - ids.length;
      if (ids.length > 0) {
        const { error } = await supabase.from('reservas')
          .update({ estado: 'Cancelada', motivo_cancelacion: 'Cancelación desde historial de reservas' } as any)
          .in('id', ids);
        if (error) throw error;
      }
      toast({
        title: 'Reservas canceladas',
        description: `Se cancelaron ${ids.length} reserva(s).${omitidas > 0 ? ` ${omitidas} no se modificaron porque ya iniciaron, terminaron o estaban canceladas.` : ''}`,
      });
      limpiarSeleccion();
      setConfirmarBorrado(false);
      await cargarReservas();
    } catch (err: any) {
      toast({
        title: 'Error al eliminar',
        description: err.message || 'No se pudieron eliminar las reservas.',
        variant: 'destructive',
      });
    } finally {
      setEliminando(false);
    }
  };

  // Filtrar por búsqueda local
  const reservasFiltradas = reservas.filter(r => {
    if (habitacionFiltro !== 'todos' && String(r.habitacion_numero) !== habitacionFiltro) return false;
    // Filtro por fecha de check-in (rango inclusivo)
    if (fechaDesde || fechaHasta) {
      const ci = r.fecha_checkin ? String(r.fecha_checkin).slice(0, 10) : null;
      if (!ci) return false;
      if (fechaDesde && ci < format(fechaDesde, 'yyyy-MM-dd')) return false;
      if (fechaHasta && ci > format(fechaHasta, 'yyyy-MM-dd')) return false;
    }
    if (!busqueda) return true;
    const texto = busqueda.toLowerCase();
    return (
      r.numero_reserva?.toLowerCase().includes(texto) ||
      r.cliente_nombre?.toLowerCase().includes(texto) ||
      r.apellido_paterno?.toLowerCase().includes(texto) ||
      r.cliente_email?.toLowerCase().includes(texto) ||
      r.cliente_telefono?.includes(texto) ||
      r.habitacion_numero?.toString().includes(texto)
    );
  });

  // Paginación logic
  const totalPaginas = Math.ceil(reservasFiltradas.length / porPagina);
  const reservasPaginadas = reservasFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  const todasPaginaSeleccionadas =
    reservasPaginadas.length > 0 &&
    reservasPaginadas.every(r => seleccionadas.has(r.id));
  const algunaPaginaSeleccionada =
    reservasPaginadas.some(r => seleccionadas.has(r.id)) && !todasPaginaSeleccionadas;

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      'Pendiente': { color: 'bg-yellow-500', icon: Clock },
      'Confirmada': { color: 'bg-blue-500', icon: CheckCircle },
      'CheckIn': { color: 'bg-green-500', icon: LogIn },
      'CheckOut': { color: 'bg-slate-500', icon: LogOut },
      'Cancelada': { color: 'bg-red-500', icon: XCircle },
      'NoShow': { color: 'bg-orange-500', icon: AlertCircle },
    };
    const c = config[estado] || { color: 'bg-muted', icon: AlertCircle };
    const Icon = c.icon;
    return (
      <Badge className={`${c.color} gap-1 rounded-[8px] hover:${c.color}`}>
        <Icon className="h-3 w-3" />
        {estado}
      </Badge>
    );
  };

  const getOrigenBadge = (origen: string) => {
    return origen === 'Recepcion'
      ? <Badge variant="outline" className="rounded-[8px] border-green-500 text-green-600">Recepción</Badge>
      : <Badge variant="outline" className="rounded-[8px] border-blue-500 text-blue-600">Online</Badge>;
  };

  const safeNumber = (val: any, def: number = 0): number => {
    const n = parseFloat(val);
    return isNaN(n) ? def : n;
  };

  // Estadísticas rápidas
  const stats = {
    total: reservas.length,
    recepcion: reservas.filter(r => r.origen === 'Recepcion').length,
    online: reservas.filter(r => r.origen && r.origen !== 'Recepcion').length,
    checkin: reservas.filter(r => r.estado === 'CheckIn').length,
    checkout: reservas.filter(r => r.estado === 'CheckOut').length,
    canceladas: reservas.filter(r => r.estado === 'Cancelada').length,
    ingresos: reservas.filter(r => r.estado === 'CheckOut').reduce((sum, r) => sum + safeNumber(r.total_pagado), 0),
  };

  // Habitaciones únicas para el filtro
  const habitacionesUnicas = Array.from(
    new Set(reservas.map(r => r.habitacion_numero).filter(Boolean))
  ).sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  // Presets de rango de fechas
  const hoy = new Date();
  const presetsRango: { label: string; range: () => { from: Date; to: Date } }[] = [
    { label: 'Hoy', range: () => ({ from: startOfDay(hoy), to: endOfDay(hoy) }) },
    { label: 'Ayer', range: () => ({ from: startOfDay(subDays(hoy, 1)), to: endOfDay(subDays(hoy, 1)) }) },
    { label: 'Últimos 7 días', range: () => ({ from: startOfDay(subDays(hoy, 6)), to: endOfDay(hoy) }) },
    { label: 'Últimos 30 días', range: () => ({ from: startOfDay(subDays(hoy, 29)), to: endOfDay(hoy) }) },
    { label: 'Esta semana', range: () => ({ from: startOfWeek(hoy, { weekStartsOn: 1 }), to: endOfWeek(hoy, { weekStartsOn: 1 }) }) },
    { label: 'Este mes', range: () => ({ from: startOfMonth(hoy), to: endOfMonth(hoy) }) },
    { label: 'Mes pasado', range: () => ({ from: startOfMonth(subMonths(hoy, 1)), to: endOfMonth(subMonths(hoy, 1)) }) },
    { label: 'Este año', range: () => ({ from: startOfYear(hoy), to: endOfYear(hoy) }) },
  ];

  const aplicarRango = () => {
    setFechaDesde(rangoBorrador.from);
    setFechaHasta(rangoBorrador.to);
    setRangoPopoverOpen(false);
    setPagina(1);
  };

  const limpiarRango = () => {
    setRangoBorrador({});
    setFechaDesde(undefined);
    setFechaHasta(undefined);
  };

  const etiquetaRango = fechaDesde && fechaHasta
    ? `${formatDate(fechaDesde)} — ${formatDate(fechaHasta)}`
    : fechaDesde
    ? `Desde ${formatDate(fechaDesde)}`
    : fechaHasta
    ? `Hasta ${formatDate(fechaHasta)}`
    : 'Seleccionar rango';

  return (
    <MainLayout title="Histórico Entradas" subtitle="Reservas online y walk-ins registrados en recepción">
      
      {/* Filtros - barra superior */}
      <Card className="mb-6">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtros izquierda */}
            <Popover open={rangoPopoverOpen} onOpenChange={(o) => {
              setRangoPopoverOpen(o);
              if (o) setRangoBorrador({ from: fechaDesde, to: fechaHasta });
            }}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 justify-start font-normal gap-2 !rounded-[8px]">
                  <CalendarRange className="h-4 w-4" />
                  <span className="truncate max-w-[240px]">{etiquetaRango}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col sm:flex-row">
                  <div className="border-b sm:border-b-0 sm:border-r p-2 flex sm:flex-col gap-1 min-w-[160px] overflow-x-auto sm:overflow-visible">
                    {presetsRango.map((p) => (
                      <Button
                        key={p.label}
                        variant="ghost"
                        size="sm"
                        className="justify-start whitespace-nowrap"
                        onClick={() => setRangoBorrador(p.range())}
                      >
                        {p.label}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start whitespace-nowrap text-muted-foreground"
                      onClick={() => setRangoBorrador({})}
                    >
                      Personalizado
                    </Button>
                  </div>
                  <div className="p-2 flex flex-col">
                    <CalendarComponent
                      mode="range"
                      selected={rangoBorrador as any}
                      onSelect={(r: any) => setRangoBorrador(r || {})}
                      numberOfMonths={2}
                      initialFocus
                      className="pointer-events-auto"
                    />
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        {rangoBorrador.from ? formatDate(rangoBorrador.from) : '—'}
                        {' → '}
                        {rangoBorrador.to ? formatDate(rangoBorrador.to) : '—'}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={limpiarRango}>Limpiar</Button>
                        <Button size="sm" onClick={aplicarRango}>Aplicar</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Estado */}
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="h-10 w-[150px] !rounded-[8px]">
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

            {/* Origen */}
            <Select value={origenFiltro} onValueChange={setOrigenFiltro}>
              <SelectTrigger className="h-10 w-[150px] !rounded-[8px]">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los orígenes</SelectItem>
                <SelectItem value="Recepcion">Recepción</SelectItem>
                <SelectItem value="Web">Online</SelectItem>
              </SelectContent>
            </Select>

            {/* Habitación */}
            <Select value={habitacionFiltro} onValueChange={setHabitacionFiltro}>
              <SelectTrigger className="h-10 w-[140px] !rounded-[8px]">
                <SelectValue placeholder="Habitación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las hab.</SelectItem>
                {habitacionesUnicas.map((h: any) => (
                  <SelectItem key={String(h)} value={String(h)}>Hab. {h}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Búsqueda centrada */}
            <div className="relative flex-1 min-w-[220px] mx-auto max-w-2xl order-last md:order-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar: # reserva, cliente, teléfono, email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 h-10 !rounded-[8px]"
              />
            </div>

            {/* Acciones derecha */}
            <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-10 gap-1">
              <X className="h-4 w-4" /> Limpiar
            </Button>
            <Button variant="outline" size="icon" onClick={cargarReservas} disabled={loading} className="h-10 w-10 shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla Principal con Overflow Fix */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Reservas ({reservasFiltradas.length})</CardTitle>
            <ExportButton
              rows={() => reservasFiltradas.map((r: any) => ({
                'Número': r.numero_reserva ?? r.id,
                'Cliente': r.cliente_nombre ?? r.clientes?.nombre ?? '',
                'Habitación': r.habitacion_numero ?? r.habitaciones?.numero ?? '',
                'Check-in': r.fecha_checkin ? fmtDate(r.fecha_checkin) : '',
                'Check-out': r.fecha_checkout ? fmtDate(r.fecha_checkout) : '',
                'Noches': r.noches ?? '',
                'Total': r.total ?? r.monto_total ?? 0,
                'Estado': r.estado ?? '',
                'Origen': r.origen ?? '',
              }))}
              filename="reservas"
              sheetName="Reservas"
              label="Exportar"
            />
          </div>
          {seleccionadas.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 p-2 rounded-md bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium">
                {seleccionadas.size} reserva(s) seleccionada(s)
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={limpiarSeleccion}>
                  Limpiar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmarBorrado(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Cancelar reservas
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Contenedor relativo para scroll horizontal seguro */}
              <div className="relative w-full overflow-x-auto">
                <Table className="min-w-[800px] [&_th]:h-9 [&_th]:py-1 [&_td]:py-1.5 [&_td]:px-2 sm:[&_td]:px-3 [&_th]:px-2 sm:[&_th]:px-3 text-[13px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={
                            todasPaginaSeleccionadas
                              ? true
                              : algunaPaginaSeleccionada
                              ? 'indeterminate'
                              : false
                          }
                          onCheckedChange={(v) => toggleSeleccionarTodasPagina(!!v)}
                          aria-label="Seleccionar todas"
                        />
                      </TableHead>
                      <TableHead className="w-[100px]"># Reserva</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Hab.</TableHead>
                      <TableHead className="whitespace-nowrap">Check-in</TableHead>
                      <TableHead className="whitespace-nowrap">Check-out</TableHead>
                      <TableHead>Noches</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead className="whitespace-nowrap">Creada por</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead className="text-right w-[60px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservasPaginadas.map(reserva => (
                      <TableRow 
                        key={reserva.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${seleccionadas.has(reserva.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => abrirDetalle(reserva)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={seleccionadas.has(reserva.id)}
                            onCheckedChange={() => toggleSeleccion(reserva.id)}
                            aria-label={`Seleccionar reserva ${reserva.numero_reserva}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-mono font-medium text-primary text-sm whitespace-nowrap">
                            #{reserva.numero_reserva || reserva.id?.slice(0, 6)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px]">
                            <p className="font-medium truncate">{reserva.cliente_nombre} {reserva.apellido_paterno}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {reserva.habitacion_numero ? (
                            <Badge variant="outline" className="rounded-md">{reserva.habitacion_numero}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(reserva.fecha_checkin)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(reserva.fecha_checkout)}
                        </TableCell>
                        <TableCell>
                          {reserva.noches || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium">{formatCurrency(safeNumber(reserva.total))}</span>
                        </TableCell>
                        <TableCell>{getEstadoBadge(reserva.estado)}</TableCell>
                        <TableCell>{getOrigenBadge(reserva.origen)}</TableCell>
                        <TableCell className="text-xs">
                          <p className="max-w-[140px] truncate">{reserva.creado_por_nombre || '—'}</p>
                          {reserva.created_at && <p className="whitespace-nowrap text-muted-foreground">{formatDateTime(reserva.created_at)}</p>}
                          {['Cancelada', 'NoShow'].includes(reserva.estado) && reserva.cancelada_por_nombre && (
                            <p className="max-w-[140px] truncate text-red-700">Canceló: {reserva.cancelada_por_nombre}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {reserva.requiere_factura
                            ? <Badge variant="outline" className={reserva.factura_estado === 'Enviada' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : reserva.factura_estado === 'Realizada' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>{reserva.factura_estado || 'Pendiente'}</Badge>
                            : <span className="text-muted-foreground">No</span>}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Acciones">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                #{reserva.numero_reserva || reserva.id?.slice(0, 6)}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => abrirDetalle(reserva)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                try {
                                  const det = await api.getReserva(reserva.id);
                                  const cli = det.cliente || det.clientes || {};
                                  await exportarComprobanteReserva({
                                    hotel: det.hotel?.nombre,
                                    hotelDireccion: det.hotel?.direccion,
                                    hotelTelefono: det.hotel?.telefono,
                                    hotelEmail: det.hotel?.email,
                                    hotelCiudad: det.hotel?.ciudad,
                                    hotelLogoUrl: det.hotel?.logo_url,
                                    currency: det.hotel?.moneda_codigo || det.hotel?.moneda || currencyCode(),
                                    reserva: det,
                                    cliente: cli,
                                  });
                                } catch {
                                  toast({ title: 'Error', description: 'No se pudo generar el comprobante', variant: 'destructive' });
                                }
                              }}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Descargar comprobante
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                try {
                                  const det = await api.getReserva(reserva.id);
                                  const cli = det.cliente || det.clientes || {};
                                  await exportarRegistroHuesped({
                                    hotel: det.hotel?.nombre,
                                    hotelDireccion: det.hotel?.direccion,
                                    hotelTelefono: det.hotel?.telefono,
                                    hotelEmail: det.hotel?.email,
                                    hotelCiudad: det.hotel?.ciudad,
                                    hotelLogoUrl: det.hotel?.logo_url,
                                    currency: det.hotel?.moneda_codigo || det.hotel?.moneda || currencyCode(),
                                    reserva: det,
                                    cliente: cli,
                                    firmaDataUrl: det.firma_digital || null,
                                    aceptaTerminos: !!det.acepta_terminos,
                                  });
                                } catch {
                                  toast({ title: 'Error', description: 'No se pudo generar el registro', variant: 'destructive' });
                                }
                              }}>
                                <Printer className="h-4 w-4 mr-2" />
                                Tarjeta de registro
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reservasPaginadas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground py-12">
                          No se encontraron reservas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {reservasFiltradas.length > 0 && (
                    <TableFooter>
                      <TableRow className="font-medium bg-muted/40">
                        <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                          Totales
                        </TableCell>
                        <TableCell className="text-sm">
                          {reservasFiltradas.length}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Set(reservasFiltradas.map((r: any) => r.cliente_id || r.cliente_nombre)).size} únicos
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Set(reservasFiltradas.map((r: any) => r.habitacion_numero).filter(Boolean)).size} hab.
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {reservasFiltradas.filter((r: any) => r.fecha_checkin).length} check-ins
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {reservasFiltradas.filter((r: any) => r.fecha_checkout).length} check-outs
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {reservasFiltradas.reduce((s: number, r: any) => s + (Number(r.noches) || 0), 0)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-primary">
                          {formatCurrency(reservasFiltradas.reduce((s: number, r: any) => s + safeNumber(r.total), 0))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {stats.checkin}/{stats.checkout}/{stats.canceladas}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {stats.recepcion}/{stats.online}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {seleccionadas.size > 0 ? `${seleccionadas.size} sel.` : '—'}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground order-2 sm:order-1">
                    {((pagina - 1) * porPagina) + 1} - {Math.min(pagina * porPagina, reservasFiltradas.length)} de {reservasFiltradas.length}
                  </p>
                  <div className="flex gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {/* Paginación simplificada para móvil */}
                      <span className="text-sm font-medium mx-2">
                        Página {pagina} de {totalPaginas}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Mismo expediente que en Reservas */}
      <Dialog open={Boolean(reservaDetalleId)} onOpenChange={(open) => { if (!open) { setReservaDetalleId(null); void cargarReservas(); } }}>
        <DialogContent className="max-w-[min(1400px,96vw)] w-[96vw] p-0 overflow-hidden gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalle de la reservación</DialogTitle>
          </DialogHeader>
          {reservaDetalleId && (
            <ReservaDetalle
              key={reservaDetalleId}
              reservaId={reservaDetalleId}
              embedded
              onClose={() => { setReservaDetalleId(null); void cargarReservas(); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación masiva */}
      <AlertDialog open={confirmarBorrado} onOpenChange={setConfirmarBorrado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar {seleccionadas.size} reserva(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Las reservas pendientes o confirmadas quedarán canceladas con tu usuario, fecha y hora. No se borra ningún registro, pago ni cargo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); eliminarSeleccionadas(); }}
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminando ? 'Cancelando...' : 'Cancelar reservas'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
