import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, Calendar, Eye, Download, RefreshCw, 
  BedDouble, CreditCard, Clock, MapPin, Phone, Mail,
  FileText, DollarSign, X, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, LogIn, LogOut,
  User, Globe, Wallet
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

export default function HistorialReservas() {
  const { toast } = useToast();
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [origenFiltro, setOrigenFiltro] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>();
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>();
  
  // Paginación
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(20);
  
  // Modal detalle
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleCompleto, setDetalleCompleto] = useState<any>(null);

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
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setPagina(1);
  };

  // Filtrar por búsqueda local
  const reservasFiltradas = reservas.filter(r => {
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
      <Badge className={`${c.color} gap-1 hover:${c.color}`}>
        <Icon className="h-3 w-3" />
        {estado}
      </Badge>
    );
  };

  const getOrigenBadge = (origen: string) => {
    return origen === 'Recepcion' 
      ? <Badge variant="outline" className="border-green-500 text-green-600">Walk-in</Badge>
      : <Badge variant="outline" className="border-blue-500 text-blue-600">Online</Badge>;
  };

  const safeNumber = (val: any, def: number = 0): number => {
    const n = parseFloat(val);
    return isNaN(n) ? def : n;
  };

  // Estadísticas rápidas
  const stats = {
    total: reservas.length,
    checkin: reservas.filter(r => r.estado === 'CheckIn').length,
    checkout: reservas.filter(r => r.estado === 'CheckOut').length,
    canceladas: reservas.filter(r => r.estado === 'Cancelada').length,
    ingresos: reservas.filter(r => r.estado === 'CheckOut').reduce((sum, r) => sum + safeNumber(r.total_pagado), 0),
  };

  return (
    <MainLayout title="Historial de Reservas" subtitle="Consulta todas las reservas del sistema">
      
      {/* Stats Cards - Grid responsivo corregido */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Estadía</p>
                <p className="text-2xl font-bold text-green-600">{stats.checkin}</p>
              </div>
              <LogIn className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-slate-600">{stats.checkout}</p>
              </div>
              <LogOut className="h-8 w-8 text-slate-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{stats.canceladas}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos (Est.)</p>
                <p className="text-xl font-bold text-primary">${stats.ingresos.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 items-end">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="# reserva, cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="CheckIn">Check-In</SelectItem>
                  <SelectItem value="CheckOut">Check-Out</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                  <SelectItem value="NoShow">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Origen</Label>
              <Select value={origenFiltro} onValueChange={setOrigenFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Recepcion">Walk-in</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10 px-3">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                        {fechaDesde ? format(fechaDesde, 'd MMM', { locale: es }) : 'Desde'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fechaDesde}
                    onSelect={setFechaDesde}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10 px-3">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                        {fechaHasta ? format(fechaHasta, 'd MMM', { locale: es }) : 'Hasta'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fechaHasta}
                    onSelect={setFechaHasta}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={limpiarFiltros} className="h-10 w-10 shrink-0">
                <X className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={cargarReservas} disabled={loading} className="h-10 w-10 shrink-0">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla Principal con Overflow Fix */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Reservas ({reservasFiltradas.length})</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
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
                      <TableHead className="w-[100px]"># Reserva</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Hab.</TableHead>
                      <TableHead className="whitespace-nowrap">Check-in</TableHead>
                      <TableHead className="whitespace-nowrap">Check-out</TableHead>
                      <TableHead>Noches</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead className="text-right">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservasPaginadas.map(reserva => (
                      <TableRow 
                        key={reserva.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => abrirDetalle(reserva)}
                      >
                        <TableCell>
                          <span className="font-mono font-medium text-primary text-sm">
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
                            <Badge variant="outline">{reserva.habitacion_numero}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(reserva.fecha_checkin), 'd MMM yy', { locale: es })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(reserva.fecha_checkout), 'd MMM yy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          {reserva.noches || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium">${safeNumber(reserva.total).toLocaleString()}</span>
                        </TableCell>
                        <TableCell>{getEstadoBadge(reserva.estado)}</TableCell>
                        <TableCell>{getOrigenBadge(reserva.origen)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); abrirDetalle(reserva); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reservasPaginadas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                          No se encontraron reservas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
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
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="text-xl">
                #{detalleCompleto?.numero_reserva || reservaSeleccionada?.id?.slice(0, 8)}
              </DialogTitle>
              {detalleCompleto && getEstadoBadge(detalleCompleto.estado)}
              {detalleCompleto && getOrigenBadge(detalleCompleto.origen)}
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
                            {format(new Date(detalleCompleto.fecha_checkin), "EEE d MMM yyyy", { locale: es })}
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
                            {format(new Date(detalleCompleto.fecha_checkout), "EEE d MMM yyyy", { locale: es })}
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
                            ${safeNumber(detalleCompleto.tarifa_noche).toLocaleString()} /noche
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
                            {detalleCompleto.personas_extra} x ${safeNumber(detalleCompleto.cargo_persona_extra).toLocaleString()}
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
                        <p className="text-base font-bold">${safeNumber(detalleCompleto.subtotal_hospedaje).toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Extras</p>
                        <p className="text-base font-bold">
                          ${(detalleCompleto.cargos?.reduce((s: number, c: any) => s + safeNumber(c.total), 0) || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Descuento</p>
                        <p className="text-base font-bold text-green-600">
                          -${safeNumber(detalleCompleto.descuento_monto).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">IVA</p>
                        <p className="text-base font-bold">${safeNumber(detalleCompleto.total_impuestos).toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-primary text-primary-foreground rounded-lg col-span-2 sm:col-span-1">
                        <p className="text-xs opacity-80">Total</p>
                        <p className="text-lg font-bold">${safeNumber(detalleCompleto.total).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-800 flex justify-between items-center">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Pagado</p>
                        <p className="text-xl font-bold text-green-600">${safeNumber(detalleCompleto.total_pagado).toLocaleString()}</p>
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
                          ${(safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado)).toLocaleString()}
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
                                  {cargo.fecha ? format(new Date(cargo.fecha), 'd MMM HH:mm', { locale: es }) : '-'}
                                </TableCell>
                                <TableCell>{cargo.concepto}</TableCell>
                                <TableCell>{cargo.cantidad}</TableCell>
                                <TableCell className="text-right font-medium">
                                  ${safeNumber(cargo.total).toLocaleString()}
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
                        Total: ${safeNumber(detalleCompleto.total_pagado).toLocaleString()}
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
                                  {pago.fecha ? format(new Date(pago.fecha), 'd MMM HH:mm', { locale: es }) : '-'}
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
                                  ${safeNumber(pago.monto).toLocaleString()}
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
    </MainLayout>
  );
}
