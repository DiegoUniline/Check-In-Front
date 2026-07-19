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
import { formatCurrency } from '@/lib/currency';
import { ExportButton } from '@/components/ExportButton';
import { formatDate as fmtDate } from '@/lib/dateFormat';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { exportarComprobanteReserva, exportarRegistroHuesped } from '@/lib/pdfExport';

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
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleCompleto, setDetalleCompleto] = useState<any>(null);

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

  const abrirDetalle = async (reserva: any) => {
    setReservaSeleccionada(reserva);
    setModalDetalleOpen(true);
    setLoadingDetalle(true);
    
    try {
      const detalle = await api.getReserva(reserva.id);
      setDetalleCompleto(detalle);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo cargar el detalle completo', variant: 'destructive' });
      setDetalleCompleto(reserva); // Fallback a datos básicos
    } finally {
      setLoadingDetalle(false);
    }
  };

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
      const ids = Array.from(seleccionadas);
      // Limpiar dependencias primero (cargos / pagos asociados)
      await supabase.from('cargos').delete().in('reserva_id', ids);
      await supabase.from('pagos').delete().in('reserva_id', ids);
      const { error } = await supabase.from('reservas').delete().in('id', ids);
      if (error) throw error;
      toast({
        title: 'Reservas eliminadas',
        description: `Se eliminaron ${ids.length} reserva(s).`,
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
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
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
                <Table className="min-w-[800px]">
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
                                  exportarComprobanteReserva({
                                    hotel: det.hotel?.nombre,
                                    hotelDireccion: det.hotel?.direccion,
                                    hotelTelefono: det.hotel?.telefono,
                                    currency: det.hotel?.moneda || 'MXN',
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
                                  exportarRegistroHuesped({
                                    hotel: det.hotel?.nombre,
                                    hotelDireccion: det.hotel?.direccion,
                                    hotelTelefono: det.hotel?.telefono,
                                    currency: det.hotel?.moneda || 'MXN',
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
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
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

      {/* Modal Detalle CORREGIDO */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        {/* Aquí está el arreglo del ancho: w-[95vw] y overflow-y-auto */}
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="text-xl">
                #{detalleCompleto?.numero_reserva || reservaSeleccionada?.id?.slice(0, 8)}
              </DialogTitle>
              {detalleCompleto && getEstadoBadge(detalleCompleto.estado)}
              {detalleCompleto && getOrigenBadge(detalleCompleto.origen)}
              {detalleCompleto && (
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="!rounded-[8px] h-8"
                    onClick={() => {
                      const cli = detalleCompleto.cliente || detalleCompleto.clientes || {};
                      exportarComprobanteReserva({
                        hotel: detalleCompleto.hotel?.nombre,
                        hotelDireccion: detalleCompleto.hotel?.direccion,
                        hotelTelefono: detalleCompleto.hotel?.telefono,
                        currency: detalleCompleto.hotel?.moneda || 'MXN',
                        reserva: detalleCompleto,
                        cliente: cli,
                      });
                    }}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    Comprobante
                  </Button>
                  <Button
                    size="sm"
                    className="!rounded-[8px] h-8"
                    onClick={() => {
                      const cli = detalleCompleto.cliente || detalleCompleto.clientes || {};
                      exportarRegistroHuesped({
                        hotel: detalleCompleto.hotel?.nombre,
                        hotelDireccion: detalleCompleto.hotel?.direccion,
                        hotelTelefono: detalleCompleto.hotel?.telefono,
                        currency: detalleCompleto.hotel?.moneda || 'MXN',
                        reserva: detalleCompleto,
                        cliente: cli,
                        firmaDataUrl: detalleCompleto.firma_digital || null,
                        aceptaTerminos: !!detalleCompleto.acepta_terminos,
                      });
                    }}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Registro / Imprimir
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : detalleCompleto && (
            <Tabs defaultValue="general" className="mt-2">
              {/* Arreglo de Tabs: Scroll horizontal en móviles */}
              <div className="w-full overflow-x-auto pb-2 mb-2">
                <TabsList className="w-full justify-start md:grid md:grid-cols-4 inline-flex h-auto p-1">
                  <TabsTrigger value="general" className="flex-1 min-w-[100px]">General</TabsTrigger>
                  <TabsTrigger value="cliente" className="flex-1 min-w-[100px]">Cliente</TabsTrigger>
                  <TabsTrigger value="cargos" className="flex-1 min-w-[100px]">Cargos ({detalleCompleto.cargos?.length || 0})</TabsTrigger>
                  <TabsTrigger value="pagos" className="flex-1 min-w-[100px]">Pagos ({detalleCompleto.pagos?.length || 0})</TabsTrigger>
                </TabsList>
              </div>

              {/* === TAB GENERAL === */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Estancia
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Check-in</Label>
                          <p className="font-medium text-sm">
                            {formatDate(detalleCompleto.fecha_checkin)}
                          </p>
                          {detalleCompleto.checkin_real && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ {format(new Date(detalleCompleto.checkin_real), "HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Check-out</Label>
                          <p className="font-medium text-sm">
                            {formatDate(detalleCompleto.fecha_checkout)}
                          </p>
                          {detalleCompleto.checkout_real && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ {format(new Date(detalleCompleto.checkout_real), "HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xl font-bold">{detalleCompleto.noches}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">Noches</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold">{detalleCompleto.adultos}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">Adultos</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold">{detalleCompleto.ninos || 0}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">Niños</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BedDouble className="h-4 w-4" /> Habitación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-medium">{detalleCompleto.tipo_habitacion_nombre || 'Sin tipo'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(safeNumber(detalleCompleto.tarifa_noche))} /noche
                          </p>
                        </div>
                        {detalleCompleto.habitacion_numero ? (
                          <Badge variant="outline" className="text-xl px-3 py-1 font-bold">
                            {detalleCompleto.habitacion_numero}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sin asignar</Badge>
                        )}
                      </div>
                      {detalleCompleto.personas_extra > 0 && (
                        <div className="p-2 bg-muted rounded text-sm flex justify-between items-center">
                          <span className="text-muted-foreground">Pers. Extra:</span>
                          <span className="font-medium">
                            {detalleCompleto.personas_extra} x {formatCurrency(safeNumber(detalleCompleto.cargo_persona_extra))}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Resumen Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-center mb-4">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-base font-bold">{formatCurrency(safeNumber(detalleCompleto.subtotal_hospedaje))}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Extras</p>
                        <p className="text-base font-bold">
                          {formatCurrency((detalleCompleto.cargos?.reduce((s: number, c: any) => s + safeNumber(c.total), 0) || 0))}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Descuento</p>
                        <p className="text-base font-bold text-green-600">
                          -{formatCurrency(safeNumber(detalleCompleto.descuento_monto))}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">IVA</p>
                        <p className="text-base font-bold">{formatCurrency(safeNumber(detalleCompleto.total_impuestos))}</p>
                      </div>
                      <div className="p-2 bg-primary text-primary-foreground rounded-lg col-span-2 sm:col-span-1">
                        <p className="text-xs opacity-80">Total</p>
                        <p className="text-lg font-bold">{formatCurrency(safeNumber(detalleCompleto.total))}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-800 flex justify-between items-center">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Pagado</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(safeNumber(detalleCompleto.total_pagado))}</p>
                      </div>
                      <div className={`p-3 rounded-lg border flex justify-between items-center ${
                        safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado) > 0.1
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-800'
                          : 'bg-slate-50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800'
                      }`}>
                        <p className="text-sm font-medium">Pendiente</p>
                        <p className={`text-xl font-bold ${
                          safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado) > 0.1 ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {formatCurrency((safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado)))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notas */}
                {(detalleCompleto.solicitudes_especiales || detalleCompleto.notas_internas) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detalleCompleto.solicitudes_especiales && (
                      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <CardContent className="p-3">
                          <p className="font-medium text-xs text-amber-800 mb-1">Solicitudes Especiales</p>
                          <p className="text-sm text-amber-900">{detalleCompleto.solicitudes_especiales}</p>
                        </CardContent>
                      </Card>
                    )}
                    {detalleCompleto.notas_internas && (
                      <Card className="border-slate-200 bg-slate-50 dark:bg-slate-950/20">
                        <CardContent className="p-3">
                          <p className="font-medium text-xs text-slate-800 mb-1">Notas Internas</p>
                          <p className="text-sm text-slate-900">{detalleCompleto.notas_internas}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* === TAB CLIENTE === */}
              <TabsContent value="cliente" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b">
                          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                            {detalleCompleto.cliente_nombre?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-lg">
                              {detalleCompleto.cliente_nombre} {detalleCompleto.apellido_paterno}
                            </p>
                            <Badge variant="secondary" className="mt-1">Huésped Principal</Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Correo Electrónico</p>
                              <p className="text-sm text-muted-foreground">{detalleCompleto.cliente_email || 'No registrado'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Teléfono</p>
                              <p className="text-sm text-muted-foreground">{detalleCompleto.cliente_telefono || 'No registrado'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Nacionalidad</p>
                              <p className="text-sm text-muted-foreground">{detalleCompleto.pais || 'No registrado'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="pb-4 border-b">
                          <p className="font-semibold text-base">Datos de Facturación / Identificación</p>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Documento ID</p>
                              <p className="text-sm text-muted-foreground">
                                {detalleCompleto.tipo_documento}: {detalleCompleto.numero_documento || 'No registrado'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Dirección</p>
                              <p className="text-sm text-muted-foreground">
                                {detalleCompleto.direccion_calle || ''} 
                                {detalleCompleto.direccion_numero ? `, ${detalleCompleto.direccion_numero}` : ''}
                                <br />
                                {detalleCompleto.direccion_ciudad ? `${detalleCompleto.direccion_ciudad}, ` : ''}
                                {detalleCompleto.direccion_estado || ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* === TAB CARGOS === */}
              <TabsContent value="cargos" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Detalle de Cargos Extra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Cant.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalleCompleto.cargos && detalleCompleto.cargos.length > 0 ? (
                            detalleCompleto.cargos.map((cargo: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="whitespace-nowrap">
                                  {cargo.fecha ? formatDateTime(cargo.fecha) : '-'}
                                </TableCell>
                                <TableCell>{cargo.concepto}</TableCell>
                                <TableCell>{cargo.cantidad}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(safeNumber(cargo.total))}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No hay cargos extra registrados
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* === TAB PAGOS === */}
              <TabsContent value="pagos" className="mt-4">
                 <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>Historial de Pagos</span>
                      <Badge variant="outline" className="font-normal">
                        Total: {formatCurrency(safeNumber(detalleCompleto.total_pagado))}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalleCompleto.pagos && detalleCompleto.pagos.length > 0 ? (
                            detalleCompleto.pagos.map((pago: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="whitespace-nowrap">
                                  {pago.fecha ? formatDateTime(pago.fecha) : '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Wallet className="h-3 w-3 text-muted-foreground" />
                                    {pago.metodo_pago}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {pago.referencia || '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {formatCurrency(safeNumber(pago.monto))}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No hay pagos registrados
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación masiva */}
      <AlertDialog open={confirmarBorrado} onOpenChange={setConfirmarBorrado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {seleccionadas.size} reserva(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también los cargos y pagos asociados a estas reservas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); eliminarSeleccionadas(); }}
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
