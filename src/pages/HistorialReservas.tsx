import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, Filter, Calendar, Eye, Download, RefreshCw, 
  Users, BedDouble, CreditCard, Clock, MapPin, Phone, Mail,
  FileText, Package, DollarSign, X, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, LogIn, LogOut
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
  const [totalReservas, setTotalReservas] = useState(0);
  
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
      setTotalReservas(data.length);
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
      toast({ title: 'Error', description: 'No se pudo cargar el detalle', variant: 'destructive' });
      setDetalleCompleto(reserva);
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

  // Paginación
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
      <Badge className={`${c.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {estado}
      </Badge>
    );
  };

  const getOrigenBadge = (origen: string) => {
    return origen === 'Recepcion' 
      ? <Badge variant="outline" className="border-green-500 text-green-600">Walk-in</Badge>
      : <Badge variant="outline">Reserva Online</Badge>;
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
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Estadía</p>
                <p className="text-2xl font-bold text-green-600">{stats.checkin}</p>
              </div>
              <LogIn className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-slate-600">{stats.checkout}</p>
              </div>
              <LogOut className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{stats.canceladas}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold text-primary">${stats.ingresos.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="# reserva, cliente, teléfono, habitación..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="w-[150px]">
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
            
            <div className="w-[150px]">
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
            
            <div className="w-[150px]">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {fechaDesde ? format(fechaDesde, 'd MMM yy', { locale: es }) : 'Desde'}
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
            
            <div className="w-[150px]">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {fechaHasta ? format(fechaHasta, 'd MMM yy', { locale: es }) : 'Hasta'}
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
            
            <Button variant="outline" onClick={limpiarFiltros}>
              <X className="h-4 w-4 mr-1" /> Limpiar
            </Button>
            
            <Button variant="outline" onClick={cargarReservas} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Reservas ({reservasFiltradas.length})</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Exportar
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead># Reserva</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Habitación</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Noches</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
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
                        <span className="font-mono font-medium text-primary">
                          #{reserva.numero_reserva || reserva.id?.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reserva.cliente_nombre} {reserva.apellido_paterno}</p>
                          <p className="text-xs text-muted-foreground">{reserva.cliente_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reserva.habitacion_numero ? (
                          <Badge variant="outline" className="text-lg">{reserva.habitacion_numero}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{format(new Date(reserva.fecha_checkin), 'd MMM yy', { locale: es })}</p>
                          {reserva.hora_llegada && (
                            <p className="text-xs text-muted-foreground">{reserva.hora_llegada}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(reserva.fecha_checkout), 'd MMM yy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{reserva.noches || '-'}</Badge>
                      </TableCell>
                      <TableCell>
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
                        No se encontraron reservas con los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((pagina - 1) * porPagina) + 1} - {Math.min(pagina * porPagina, reservasFiltradas.length)} de {reservasFiltradas.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                        let pageNum;
                        if (totalPaginas <= 5) {
                          pageNum = i + 1;
                        } else if (pagina <= 3) {
                          pageNum = i + 1;
                        } else if (pagina >= totalPaginas - 2) {
                          pageNum = totalPaginas - 4 + i;
                        } else {
                          pageNum = pagina - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={pagina === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8"
                            onClick={() => setPagina(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
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

      {/* Modal Detalle Completo */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">
                Reserva #{detalleCompleto?.numero_reserva || reservaSeleccionada?.numero_reserva || reservaSeleccionada?.id?.slice(0, 8)}
              </DialogTitle>
              {detalleCompleto && getEstadoBadge(detalleCompleto.estado)}
              {detalleCompleto && getOrigenBadge(detalleCompleto.origen)}
              {loadingDetalle && <RefreshCw className="h-4 w-4 animate-spin" />}
            </div>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : detalleCompleto && (
            <Tabs defaultValue="general" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
                <TabsTrigger value="cargos">Cargos ({detalleCompleto.cargos?.length || 0})</TabsTrigger>
                <TabsTrigger value="pagos">Pagos ({detalleCompleto.pagos?.length || 0})</TabsTrigger>
              </TabsList>

              {/* Tab General */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
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
                          <p className="font-medium">
                            {format(new Date(detalleCompleto.fecha_checkin), "EEEE d MMMM yyyy", { locale: es })}
                          </p>
                          {detalleCompleto.hora_llegada && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {detalleCompleto.hora_llegada}
                            </p>
                          )}
                          {detalleCompleto.checkin_real && (
                            <p className="text-xs text-green-600">
                              ✓ Realizado: {format(new Date(detalleCompleto.checkin_real), "d MMM HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Check-out</Label>
                          <p className="font-medium">
                            {format(new Date(detalleCompleto.fecha_checkout), "EEEE d MMMM yyyy", { locale: es })}
                          </p>
                          {detalleCompleto.checkout_real && (
                            <p className="text-xs text-green-600">
                              ✓ Realizado: {format(new Date(detalleCompleto.checkout_real), "d MMM HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{detalleCompleto.noches}</p>
                          <p className="text-xs text-muted-foreground">Noches</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{detalleCompleto.adultos}</p>
                          <p className="text-xs text-muted-foreground">Adultos</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{detalleCompleto.ninos || 0}</p>
                          <p className="text-xs text-muted-foreground">Niños</p>
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
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-medium">{detalleCompleto.tipo_habitacion_nombre || 'Sin tipo'}</p>
                          <p className="text-sm text-muted-foreground">
                            ${safeNumber(detalleCompleto.tarifa_noche).toLocaleString()} /noche
                          </p>
                        </div>
                        {detalleCompleto.habitacion_numero ? (
                          <Badge variant="outline" className="text-3xl px-4 py-2">
                            {detalleCompleto.habitacion_numero}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sin asignar</Badge>
                        )}
                      </div>
                      {detalleCompleto.personas_extra > 0 && (
                        <div className="p-2 bg-muted rounded text-sm">
                          <span className="text-muted-foreground">Personas extra:</span>{' '}
                          <span className="font-medium">{detalleCompleto.personas_extra}</span>
                          <span className="text-muted-foreground"> × ${safeNumber(detalleCompleto.cargo_persona_extra).toLocaleString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Resumen Financiero */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Resumen Financiero
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-lg font-bold">${safeNumber(detalleCompleto.subtotal_hospedaje).toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Cargos Extra</p>
                        <p className="text-lg font-bold">
                          ${(detalleCompleto.cargos?.reduce((s: number, c: any) => s + safeNumber(c.total), 0) || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Descuento</p>
                        <p className="text-lg font-bold text-green-600">
                          -${safeNumber(detalleCompleto.descuento_monto).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">IVA</p>
                        <p className="text-lg font-bold">${safeNumber(detalleCompleto.total_impuestos).toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-primary text-primary-foreground rounded-lg">
                        <p className="text-xs opacity-80">Total</p>
                        <p className="text-xl font-bold">${safeNumber(detalleCompleto.total).toLocaleString()}</p>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300">Total Pagado</p>
                        <p className="text-2xl font-bold text-green-600">${safeNumber(detalleCompleto.total_pagado).toLocaleString()}</p>
                      </div>
                      <div className={`p-4 rounded-lg border ${
                        safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado) > 0
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                          : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800'
                      }`}>
                        <p className={`text-sm ${
                          safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado) > 0
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>Saldo Pendiente</p>
                        <p className={`text-2xl font-bold ${
                          safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado) > 0
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}>
                          ${(safeNumber(detalleCompleto.total) - safeNumber(detalleCompleto.total_pagado)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notas */}
                {(detalleCompleto.solicitudes_especiales || detalleCompleto.notas_internas) && (
                  <div className="grid grid-cols-2 gap-4">
                    {detalleCompleto.solicitudes_especiales && (
                      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <CardContent className="p-4">
                          <p className="font-medium text-sm mb-1">Solicitudes Especiales</p>
                          <p className="text-sm text-muted-foreground">{detalleCompleto.solicitudes_especiales}</p>
                        </CardContent>
                      </Card>
                    )}
                    {detalleCompleto.notas_internas && (
                      <Card className="border-slate-200 bg-slate-50 dark:bg-slate-950/20">
                        <CardContent className="p-4">
                          <p className="font-medium text-sm mb-1">Notas Internas</p>
                          <p className="text-sm text-muted-foreground">{detalleCompleto.notas_internas}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
                      {detalleCompleto.created_at && (
                        <span>Creada: {format(new Date(detalleCompleto.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                      )}
                      {detalleCompleto.updated_at && (
                        <span>Actualizada: {format(new Date(detalleCompleto.updated_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                      )}
                      {detalleCompleto.created_by_name && (
                        <span>Creada por: {detalleCompleto.created_by_name}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Cliente */}
              <TabsContent value="cliente" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                        {detalleCompleto.cliente_nombre?.charAt(0)}{detalleCompleto.apellido_paterno?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">
                          {detalleCompleto.cliente_nombre} {detalleCompleto.apellido_paterno} {detalleCompleto.apellido_materno}
                        </h3>
                        <div className="flex gap-2 mt-2">
                          {detalleCompleto.es_vip && <Badge className="bg-yellow-500">VIP</Badge>}
                          {detalleCompleto.total_estancias > 0 && (
                            <Badge variant="outline">{detalleCompleto.total_estancias} estancias previas</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="font-medium">{detalleCompleto.cliente_email || 'No registrado'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Teléfono</p>
                              <p className="font-medium">{detalleCompleto.cliente_telefono || 'No registrado'}</p>
                            </div>
                          </div>
                          {detalleCompleto.cliente_direccion && (
                            <div className="flex items-center gap-3 col-span-2">
                              <MapPin className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Dirección</p>
                                <p className="font-medium">{detalleCompleto.cliente_direccion}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Cargos */}
              <TabsContent value="cargos" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {detalleCompleto.cargos && detalleCompleto.cargos.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Precio Unit.</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead>IVA</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Fecha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalleCompleto.cargos.map((cargo: any, idx: number) => (
                            <TableRow key={cargo.id || idx}>
                              <TableCell>
                                <p className="font-medium">{cargo.concepto || cargo.producto_nombre}</p>
                                {cargo.notas && <p className="text-xs text-muted-foreground">{cargo.notas}</p>}
                              </TableCell>
                              <TableCell>{cargo.cantidad}</TableCell>
                              <TableCell>${safeNumber(cargo.precio_unitario).toLocaleString()}</TableCell>
                              <TableCell>${safeNumber(cargo.subtotal).toLocaleString()}</TableCell>
                              <TableCell>${safeNumber(cargo.impuesto).toLocaleString()}</TableCell>
                              <TableCell className="font-bold">${safeNumber(cargo.total).toLocaleString()}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {cargo.created_at ? format(new Date(cargo.created_at), 'd MMM HH:mm', { locale: es }) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={5} className="text-right font-bold">Total Cargos:</TableCell>
                            <TableCell className="font-bold text-lg">
                              ${detalleCompleto.cargos.reduce((s: number, c: any) => s + safeNumber(c.total), 0).toLocaleString()}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Sin cargos adicionales registrados</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Pagos */}
              <TabsContent value="pagos" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {detalleCompleto.pagos && detalleCompleto.pagos.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Registrado por</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalleCompleto.pagos.map((pago: any, idx: number) => (
                            <TableRow key={pago.id || idx}>
                              <TableCell className="font-medium">{pago.concepto || 'Pago'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{pago.metodo_pago}</Badge>
                              </TableCell>
                              <TableCell className="font-bold text-green-600">
                                ${safeNumber(pago.monto).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {pago.referencia || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {pago.created_at ? format(new Date(pago.created_at), 'd MMM yyyy HH:mm', { locale: es }) : '-'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {pago.created_by_name || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={2} className="text-right font-bold">Total Pagado:</TableCell>
                            <TableCell className="font-bold text-lg text-green-600">
                              ${detalleCompleto.pagos.reduce((s: number, p: any) => s + safeNumber(p.monto), 0).toLocaleString()}
                            </TableCell>
                            <TableCell colSpan={3}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Sin pagos registrados</p>
                    )}
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
