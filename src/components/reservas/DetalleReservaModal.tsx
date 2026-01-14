import { useState, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BedDouble, X, Calendar, Users, Phone, Mail, CreditCard, Plus, Trash2,
  ChevronRight, ChevronLeft, Clock, Receipt, ArrowRight, AlertTriangle,
  UserPlus, CalendarPlus, Edit3, Save, RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface DetalleReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: any;
  habitaciones: any[];
  onSuccess?: () => void;
}

// Helper para parsear números de forma segura
const safeParseFloat = (value: any, defaultValue: number = 0): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

export function DetalleReservaModal({ 
  open, 
  onOpenChange, 
  reserva, 
  habitaciones,
  onSuccess 
}: DetalleReservaModalProps) {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();

  // Estados editables
  const [fechaCheckout, setFechaCheckout] = useState<Date>(new Date());
  const [habitacionId, setHabitacionId] = useState('');
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<any[]>([]);

  // Cargos y pagos
  const [cargos, setCargos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loadingCargos, setLoadingCargos] = useState(false);

  // Nuevo pago
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('Efectivo');

  // Nuevo cargo
  const [conceptosCargo, setConceptosCargo] = useState<any[]>([]);
  const [cargoConcepto, setCargoConcepto] = useState('');
  const [cargoCantidad, setCargoCantidad] = useState('1');
  const [cargoMonto, setCargoMonto] = useState('');

  useEffect(() => {
    if (open && reserva) {
      setFechaCheckout(new Date(reserva.fecha_checkout));
      setHabitacionId(reserva.habitacion_id || '');
      setEditMode(false);
      cargarDetalles();
    }
  }, [open, reserva]);

  const cargarDetalles = async () => {
    if (!reserva?.id) return;
    setLoadingCargos(true);
    try {
      const [cargosData, pagosData, conceptosData] = await Promise.all([
        api.getCargos?.(reserva.id) || Promise.resolve([]),
        api.getPagos?.(reserva.id) || Promise.resolve([]),
        api.getConceptosCargo?.() || Promise.resolve([])
      ]);
      setCargos(Array.isArray(cargosData) ? cargosData : []);
      setPagos(Array.isArray(pagosData) ? pagosData : []);
      setConceptosCargo(Array.isArray(conceptosData) ? conceptosData : []);
    } catch (error) {
      console.error('Error cargando detalles:', error);
    } finally {
      setLoadingCargos(false);
    }
  };

  const buscarHabitacionesDisponibles = async () => {
    try {
      const checkin = format(new Date(reserva.fecha_checkin), 'yyyy-MM-dd');
      const checkout = format(fechaCheckout, 'yyyy-MM-dd');
      const data = await api.getHabitacionesDisponibles(checkin, checkout);
      // Incluir la habitación actual
      const disponibles = data.filter((h: any) => h.id !== reserva.habitacion_id);
      const actual = habitaciones.find(h => h.id === reserva.habitacion_id);
      if (actual) disponibles.unshift({ ...actual, esActual: true });
      setHabitacionesDisponibles(disponibles);
    } catch (error) {
      // Fallback: mostrar todas las habitaciones
      setHabitacionesDisponibles(habitaciones);
    }
  };

  useEffect(() => {
    if (editMode && reserva) {
      buscarHabitacionesDisponibles();
    }
  }, [editMode, fechaCheckout]);

  // Cálculos con valores seguros
  const fechaCheckin = reserva ? new Date(reserva.fecha_checkin) : new Date();
  const nochesOriginales = reserva ? differenceInDays(new Date(reserva.fecha_checkout), fechaCheckin) : 0;
  const nochesNuevas = differenceInDays(fechaCheckout, fechaCheckin) || 1; // Mínimo 1 noche
  const diferenciasNoches = nochesNuevas - nochesOriginales;

  const tarifaNoche = safeParseFloat(reserva?.tarifa_noche, 0);
  const subtotalHospedaje = tarifaNoche * nochesNuevas;
  const totalCargos = cargos.reduce((sum, c) => sum + safeParseFloat(c.total, 0), 0);
  const subtotal = subtotalHospedaje + totalCargos;
  
  // Descuento
  let descuentoMonto = 0;
  if (reserva?.descuento_tipo === 'Monto') {
    descuentoMonto = safeParseFloat(reserva.descuento_valor, 0);
  } else if (reserva?.descuento_tipo === 'Porcentaje') {
    descuentoMonto = subtotal * (safeParseFloat(reserva.descuento_valor, 0) / 100);
  }
  
  const subtotalConDescuento = subtotal - descuentoMonto;
  const impuestos = subtotalConDescuento * 0.16;
  const totalGeneral = subtotalConDescuento + impuestos;
  const totalPagado = pagos.reduce((sum, p) => sum + safeParseFloat(p.monto, 0), 0);
  const saldoPendiente = totalGeneral - totalPagado;

  // Handlers
  const handleAgregarPago = async () => {
    const monto = safeParseFloat(pagoMonto, 0);
    if (monto <= 0) {
      toast({ title: 'Monto inválido', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      await api.createPago({
        reserva_id: reserva.id,
        monto,
        metodo_pago: pagoMetodo,
        concepto: 'Pago adicional',
      });
      toast({ title: '✅ Pago registrado', description: `$${monto.toLocaleString()} - ${pagoMetodo}` });
      setPagoMonto('');
      cargarDetalles();
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPago = async (pagoId: string) => {
    try {
      await api.deletePago?.(pagoId);
      toast({ title: 'Pago eliminado' });
      cargarDetalles();
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAgregarCargo = async () => {
    if (!cargoConcepto || !cargoMonto) {
      toast({ title: 'Completa los campos', variant: 'destructive' });
      return;
    }
    
    const concepto = conceptosCargo.find(c => c.id === cargoConcepto);
    const cantidad = safeParseFloat(cargoCantidad, 1);
    const precioUnitario = safeParseFloat(cargoMonto, 0);
    
    if (precioUnitario <= 0) {
      toast({ title: 'Precio inválido', variant: 'destructive' });
      return;
    }
    
    const subtotalCargo = cantidad * precioUnitario;
    const aplicaIva = concepto?.aplica_iva ?? true;
    const impuestoCargo = aplicaIva ? subtotalCargo * 0.16 : 0;

    setLoading(true);
    try {
      await api.createCargo({
        reserva_id: reserva.id,
        concepto_id: cargoConcepto,
        concepto: concepto?.nombre || 'Cargo',
        cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotalCargo,
        impuesto: impuestoCargo,
        total: subtotalCargo + impuestoCargo,
      });
      toast({ title: '✅ Cargo agregado' });
      setCargoConcepto('');
      setCargoCantidad('1');
      setCargoMonto('');
      cargarDetalles();
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCargo = async (cargoId: string) => {
    try {
      await api.deleteCargo?.(cargoId);
      toast({ title: 'Cargo eliminado' });
      cargarDetalles();
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

const handleGuardarCambios = async () => {
  setLoading(true);
  try {
    const updates: any = {};
    
    const checkoutOriginal = format(new Date(reserva.fecha_checkout), 'yyyy-MM-dd');
    const checkoutNuevo = format(fechaCheckout, 'yyyy-MM-dd');
    
    if (checkoutNuevo !== checkoutOriginal) {
      updates.fecha_checkout = checkoutNuevo;
    }
    
    if (habitacionId && habitacionId !== reserva.habitacion_id) {
      updates.habitacion_id = habitacionId;
    }

    if (Object.keys(updates).length > 0) {
      await api.updateReserva(reserva.id, updates);
      toast({ title: '✅ Reserva actualizada' });
      
      // Recargar datos frescos del servidor
      const reservaActualizada = await api.getReserva(reserva.id);
      
      // Actualizar estado local con datos nuevos
      Object.assign(reserva, reservaActualizada);
      setFechaCheckout(new Date(reservaActualizada.fecha_checkout));
      setHabitacionId(reservaActualizada.habitacion_id || '');
      
      // Recargar cargos y pagos
      await cargarDetalles();
      
      setEditMode(false);
      onSuccess?.();
    } else {
      toast({ title: 'Sin cambios' });
      setEditMode(false);
    }
  } catch (error: any) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  } finally {
    setLoading(false);
  }
};

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await api.checkin(reserva.id, reserva.habitacion_id);
      toast({ title: '✅ Check-in realizado' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (saldoPendiente > 0.01) { // Tolerancia para decimales
      toast({ 
        title: '⚠️ Saldo pendiente', 
        description: `Hay un saldo de $${saldoPendiente.toLocaleString()} por cobrar`,
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    try {
      await api.checkout(reserva.id);
      toast({ title: '✅ Check-out realizado' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    setLoading(true);
    try {
      await api.updateReserva(reserva.id, { estado: 'Cancelada' });
      toast({ title: 'Reserva cancelada' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!reserva) return null;

  const estadoColor = {
    'Pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Confirmada': 'bg-blue-100 text-blue-800 border-blue-300',
    'CheckIn': 'bg-orange-100 text-orange-800 border-orange-300',
    'Hospedado': 'bg-orange-100 text-orange-800 border-orange-300',
    'CheckOut': 'bg-slate-100 text-slate-800 border-slate-300',
    'Cancelada': 'bg-red-100 text-red-800 border-red-300',
    'NoShow': 'bg-red-100 text-red-800 border-red-300',
  }[reserva.estado] || 'bg-gray-100 text-gray-800';

  const puedeHacerCheckin = ['Pendiente', 'Confirmada'].includes(reserva.estado);
  const puedeHacerCheckout = ['CheckIn', 'Hospedado'].includes(reserva.estado);
  const puedeEditar = !['CheckOut', 'Cancelada', 'NoShow'].includes(reserva.estado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BedDouble className="h-6 w-6" />
              <span>Reserva {reserva.numero_reserva}</span>
              <Badge className={cn("ml-2", estadoColor)}>{reserva.estado}</Badge>
              {reserva.origen === 'Recepcion' && (
                <Badge variant="outline" className="border-green-500 text-green-700">
                  <UserPlus className="h-3 w-3 mr-1" />Walk-in
                </Badge>
              )}
            </div>
            {puedeEditar && (
              <Button 
                variant={editMode ? "default" : "outline"} 
                size="sm"
                onClick={() => editMode ? handleGuardarCambios() : setEditMode(true)}
                disabled={loading}
              >
                {editMode ? <><Save className="h-4 w-4 mr-1" /> Guardar</> : <><Edit3 className="h-4 w-4 mr-1" /> Editar</>}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Gestiona los detalles de la reserva, cargos y pagos
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detalle" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detalle">Detalle</TabsTrigger>
            <TabsTrigger value="cargos">Cargos ({cargos.length})</TabsTrigger>
            <TabsTrigger value="pagos">Pagos ({pagos.length})</TabsTrigger>
          </TabsList>

          {/* TAB DETALLE */}
          <TabsContent value="detalle" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Info Habitación y Fechas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Habitación</CardTitle>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <Select value={habitacionId} onValueChange={setHabitacionId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {habitacionesDisponibles.map(h => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.numero} - {h.tipo_nombre} {h.esActual && '(actual)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BedDouble className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Hab. {reserva.habitacion_numero}</p>
                        <p className="text-sm text-muted-foreground">{reserva.tipo_nombre}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Huésped */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Huésped</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {reserva.cliente_nombre?.charAt(0)}{reserva.apellido_paterno?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{reserva.cliente_nombre} {reserva.apellido_paterno}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {reserva.cliente_telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{reserva.cliente_telefono}</span>}
                        {reserva.cliente_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{reserva.cliente_email}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fechas */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Check-in</Label>
                    <p className="font-medium">{format(fechaCheckin, 'd MMM yyyy', { locale: es })}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Check-out</Label>
                    {editMode ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start h-8 text-sm">
                            <Calendar className="mr-2 h-3 w-3" />
                            {format(fechaCheckout, 'd MMM yyyy', { locale: es })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarPicker 
                            mode="single" 
                            selected={fechaCheckout} 
                            onSelect={(d) => d && setFechaCheckout(d)} 
                            disabled={(d) => d <= fechaCheckin}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="font-medium">{format(new Date(reserva.fecha_checkout), 'd MMM yyyy', { locale: es })}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Noches</Label>
                    <p className="font-medium">
                      {nochesNuevas}
                      {diferenciasNoches !== 0 && editMode && (
                        <span className={cn("ml-2 text-sm", diferenciasNoches > 0 ? "text-green-600" : "text-red-600")}>
                          ({diferenciasNoches > 0 ? '+' : ''}{diferenciasNoches})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Huéspedes</Label>
                    <p className="font-medium">{reserva.adultos || 1} adultos{reserva.ninos > 0 && `, ${reserva.ninos} niños`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen financiero */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hospedaje ({nochesNuevas} noches × ${tarifaNoche.toLocaleString()})</span>
                    <span>${subtotalHospedaje.toLocaleString()}</span>
                  </div>
                  {totalCargos > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Cargos extras</span>
                      <span>${totalCargos.toLocaleString()}</span>
                    </div>
                  )}
                  {descuentoMonto > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento</span>
                      <span>-${descuentoMonto.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%)</span>
                    <span>${impuestos.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${totalGeneral.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pagado</span>
                    <span className="text-green-600">${totalPagado.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Saldo pendiente</span>
                    <span className={saldoPendiente <= 0.01 ? "text-green-600" : "text-red-600"}>
                      ${saldoPendiente.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex gap-2 justify-end">
              {puedeHacerCheckin && (
                <Button onClick={handleCheckIn} disabled={loading} className="bg-green-600 hover:bg-green-700">
                  <UserPlus className="h-4 w-4 mr-2" /> Check-in
                </Button>
              )}
              {puedeHacerCheckout && (
                <>
                  {saldoPendiente > 0.01 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-orange-500 text-orange-600">
                          <AlertTriangle className="h-4 w-4 mr-2" /> Check-out con saldo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Saldo pendiente</AlertDialogTitle>
                          <AlertDialogDescription>
                            El huésped tiene un saldo pendiente de <strong>${saldoPendiente.toLocaleString()}</strong>. 
                            ¿Deseas registrar el pago primero?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCheckOut}>Check-out sin pago</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button 
                    onClick={handleCheckOut} 
                    disabled={loading || saldoPendiente > 0.01}
                    className="bg-slate-600 hover:bg-slate-700"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" /> Check-out
                  </Button>
                </>
              )}
              {puedeEditar && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-300">
                      Cancelar reserva
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. La habitación quedará disponible nuevamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, mantener</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelar} className="bg-red-600">
                        Sí, cancelar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </TabsContent>

          {/* TAB CARGOS */}
          <TabsContent value="cargos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Agregar cargo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Select value={cargoConcepto} onValueChange={(v) => { 
                    setCargoConcepto(v); 
                    const c = conceptosCargo.find(x => x.id === v); 
                    if (c?.precio_default) setCargoMonto(c.precio_default.toString()); 
                  }}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Concepto..." /></SelectTrigger>
                    <SelectContent>
                      {conceptosCargo.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="w-20" type="number" placeholder="Cant" value={cargoCantidad} onChange={(e) => setCargoCantidad(e.target.value)} />
                  <Input className="w-28" type="number" placeholder="$" value={cargoMonto} onChange={(e) => setCargoMonto(e.target.value)} />
                  <Button onClick={handleAgregarCargo} disabled={!cargoConcepto || loading}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cargos registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCargos ? (
                  <div className="text-center py-4 text-muted-foreground">Cargando...</div>
                ) : cargos.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Sin cargos extras</div>
                ) : (
                  <div className="space-y-2">
                    {cargos.map(c => (
                      <div key={c.id} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                        <div>
                          <span className="font-medium">{c.concepto}</span>
                          <span className="text-sm text-muted-foreground ml-2">x{c.cantidad}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${safeParseFloat(c.total).toLocaleString()}</span>
                          {puedeEditar && (
                            <Button variant="ghost" size="sm" onClick={() => handleEliminarCargo(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total cargos</span>
                      <span>${totalCargos.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB PAGOS */}
          <TabsContent value="pagos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Registrar pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="Monto" 
                    className="flex-1"
                    value={pagoMonto} 
                    onChange={(e) => setPagoMonto(e.target.value)} 
                  />
                  <Select value={pagoMetodo} onValueChange={setPagoMetodo}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAgregarPago} disabled={loading || !pagoMonto}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Historial de pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCargos ? (
                  <div className="text-center py-4 text-muted-foreground">Cargando...</div>
                ) : pagos.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Sin pagos registrados</div>
                ) : (
                  <div className="space-y-2">
                    {pagos.map(p => (
                      <div key={p.id} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                        <div>
                          <span className="font-medium">{p.metodo_pago}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {p.created_at && format(new Date(p.created_at), 'd MMM HH:mm', { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-600">${safeParseFloat(p.monto).toLocaleString()}</span>
                          {puedeEditar && (
                            <Button variant="ghost" size="sm" onClick={() => handleEliminarPago(p.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total cuenta</span>
                    <span className="font-medium">${totalGeneral.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total pagado</span>
                    <span className="font-medium text-green-600">${totalPagado.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Saldo pendiente</span>
                    <span className={saldoPendiente <= 0.01 ? "text-green-600" : "text-red-600"}>
                      ${saldoPendiente.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
