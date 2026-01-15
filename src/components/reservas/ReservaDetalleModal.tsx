import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, BedDouble, CreditCard, DoorOpen, DoorClosed, Phone, Mail, 
  AlertCircle, Printer, RefreshCw, Package, Plus, Trash2, Receipt,
  Users, Clock, Percent, Tag, Pencil, Save, X, Check, AlertTriangle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface ReservaDetalleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: any;
  onUpdate?: () => void;
}

export function ReservaDetalleModal({ open, onOpenChange, reserva: reservaInicial, onUpdate }: ReservaDetalleModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('resumen');
  const [processing, setProcessing] = useState(false);
  const [reserva, setReserva] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Modo edición
  const [editMode, setEditMode] = useState(false);
  const [fechaCheckout, setFechaCheckout] = useState<Date>(new Date());
  const [habitacionId, setHabitacionId] = useState('');
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  
  // Check-in
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [tarjetaRegistrada, setTarjetaRegistrada] = useState(false);
  const [firmaDigital, setFirmaDigital] = useState(false);
  
  // Check-out
  const [habitacionInspeccionada, setHabitacionInspeccionada] = useState(false);
  const [llaveDevuelta, setLlaveDevuelta] = useState(false);
  
  // Pagos
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  
  // Cargos
  const [conceptosCargo, setConceptosCargo] = useState<any[]>([]);
  const [cargoConcepto, setCargoConcepto] = useState('');
  const [cargoMonto, setCargoMonto] = useState('');
  const [cargoCantidad, setCargoCantidad] = useState('1');
  const [cargoNotas, setCargoNotas] = useState('');
  
  // Entregables
  const [entregables, setEntregables] = useState<any[]>([]);
  const [reservaEntregables, setReservaEntregables] = useState<any[]>([]);
  const [entregableSeleccionado, setEntregableSeleccionado] = useState('');
  const [entregableCantidad, setEntregableCantidad] = useState('1');
  
  // Devolución inline - solo guardamos el ID del entregable expandido
  const [devolucionExpandidaId, setDevolucionExpandidaId] = useState<string | null>(null);
  const [devolucionForm, setDevolucionForm] = useState({
    cantidadDevolver: '',
    costoUnitario: '',
    crearCargo: true
  });

  useEffect(() => {
    if (open && reservaInicial?.id) {
      cargarReserva();
      cargarConceptos();
      cargarEntregables();
      cargarHabitaciones();
      // Reset estados
      setEditMode(false);
      setDocumentoVerificado(false);
      setTarjetaRegistrada(false);
      setFirmaDigital(false);
      setHabitacionInspeccionada(false);
      setLlaveDevuelta(false);
      setDevolucionExpandidaId(null);
    }
  }, [open, reservaInicial?.id]);

  const cargarReserva = async () => {
    if (!reservaInicial?.id) return;
    setLoading(true);
    try {
      const data = await api.getReserva(reservaInicial.id);
      setReserva(data);
      setFechaCheckout(new Date(data.fecha_checkout));
      setHabitacionId(data.habitacion_id || '');
      
      try {
        const entData = await api.getEntregablesReserva?.(reservaInicial.id) || [];
        setReservaEntregables(entData);
      } catch {
        setReservaEntregables([]);
      }
    } catch (error) {
      console.error('Error cargando reserva:', error);
      setReserva(reservaInicial);
      setFechaCheckout(new Date(reservaInicial.fecha_checkout));
      setHabitacionId(reservaInicial.habitacion_id || '');
    } finally {
      setLoading(false);
    }
  };

  const cargarConceptos = async () => {
    try {
      const data = await api.getConceptosCargo?.() || [];
      setConceptosCargo(data);
    } catch (error) {
      console.error('Error cargando conceptos:', error);
    }
  };

  const cargarEntregables = async () => {
    try {
      const data = await api.getEntregables?.() || [];
      setEntregables(data);
    } catch (error) {
      console.error('Error cargando entregables:', error);
    }
  };

  const cargarHabitaciones = async () => {
    try {
      const data = await api.getHabitaciones?.() || [];
      setHabitaciones(data);
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
    }
  };

  if (!reserva && !reservaInicial) return null;
  
  const r = reserva || reservaInicial;

  const safeNumber = (val: any, def: number = 0): number => {
    const n = parseFloat(val);
    return isNaN(n) ? def : n;
  };

  const fechaCheckin = new Date(r.fecha_checkin);
  const nochesOriginales = r.noches || differenceInDays(new Date(r.fecha_checkout), fechaCheckin);
  const nochesEditadas = differenceInDays(fechaCheckout, fechaCheckin) || 1;
  const nochesActuales = editMode ? nochesEditadas : nochesOriginales;
  const diferenciaNOches = nochesEditadas - nochesOriginales;
  
  const tarifaNoche = safeNumber(r.tarifa_noche);
  const subtotalHospedaje = editMode ? (tarifaNoche * nochesEditadas) : safeNumber(r.subtotal_hospedaje, tarifaNoche * nochesOriginales);
  const personasExtra = r.personas_extra || 0;
  const cargoPersonaExtra = safeNumber(r.cargo_persona_extra);
  const totalPersonaExtra = personasExtra * cargoPersonaExtra * nochesActuales;
  const descuentoMonto = safeNumber(r.descuento_monto);
  const totalCargos = r.cargos?.reduce((sum: number, c: any) => sum + safeNumber(c.total), 0) || 0;
  const subtotalBase = subtotalHospedaje + totalPersonaExtra + totalCargos - descuentoMonto;
  const impuestos = editMode ? (subtotalBase * 0.16) : safeNumber(r.total_impuestos);
  const total = editMode ? (subtotalBase + impuestos) : safeNumber(r.total);
  const pagado = safeNumber(r.total_pagado);
  const saldoPendiente = total - pagado;
  const porcentajePagado = total > 0 ? (pagado / total) * 100 : 0;

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      'Pendiente': 'bg-yellow-500',
      'Confirmada': 'bg-blue-500',
      'CheckIn': 'bg-orange-500',
      'CheckOut': 'bg-slate-500',
      'Cancelada': 'bg-red-500',
      'NoShow': 'bg-orange-500',
    };
    return <Badge className={colors[estado] || 'bg-muted'}>{estado}</Badge>;
  };

  const getOrigenBadge = (origen: string) => {
    return origen === 'Recepcion' 
      ? <Badge variant="default" className="bg-green-600">Walk-in</Badge>
      : <Badge variant="secondary">Reserva</Badge>;
  };

  // ============ HANDLERS ============
  
  const handleGuardarCambios = async () => {
    setProcessing(true);
    try {
      const updates: any = {};
      const checkoutOriginal = format(new Date(r.fecha_checkout), 'yyyy-MM-dd');
      const checkoutNuevo = format(fechaCheckout, 'yyyy-MM-dd');
      
      if (checkoutNuevo !== checkoutOriginal) updates.fecha_checkout = checkoutNuevo;
      if (habitacionId && habitacionId !== r.habitacion_id) updates.habitacion_id = habitacionId;

      if (Object.keys(updates).length > 0) {
        await api.updateReserva(r.id, updates);
        toast({ title: '✅ Reserva actualizada' });
        await cargarReserva();
        setEditMode(false);
        onUpdate?.();
      } else {
        toast({ title: 'Sin cambios' });
        setEditMode(false);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelarEdicion = () => {
    setFechaCheckout(new Date(r.fecha_checkout));
    setHabitacionId(r.habitacion_id || '');
    setEditMode(false);
  };

  const handleCheckin = async () => {
    if (!documentoVerificado || !tarjetaRegistrada || !firmaDigital) {
      toast({ title: 'Faltan requisitos', description: 'Complete todos los campos obligatorios', variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      await api.checkin(r.id, habitacionId || r.habitacion_id);
      toast({ title: '✓ Check-in completado', description: `Habitación ${r.habitacion_numero} asignada` });
      await cargarReserva();
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!habitacionInspeccionada || !llaveDevuelta) {
      toast({ title: 'Faltan verificaciones', description: 'Complete la inspección y devolución de llaves', variant: 'destructive' });
      return;
    }
    
    const pendientes = reservaEntregables.filter(e => 
      e.requiere_devolucion && !e.devuelto && (e.faltantes > 0 || e.cantidad_devuelta === null)
    );
    if (pendientes.length > 0) {
      toast({ 
        title: 'Entregables pendientes', 
        description: `Procese la devolución de: ${pendientes.map(p => p.nombre).join(', ')}`, 
        variant: 'destructive' 
      });
      return;
    }
    
    if (saldoPendiente > 0.01) {
      toast({ title: 'Saldo pendiente', description: `El huésped debe liquidar $${saldoPendiente.toFixed(2)}`, variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      await api.checkout(r.id);
      toast({ title: '✓ Check-out completado', description: 'Habitación liberada exitosamente' });
      onOpenChange(false);
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAbonar = async () => {
    const monto = safeNumber(montoAbono);
    if (monto <= 0) {
      toast({ title: 'Monto inválido', variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      await api.createPago({
        reserva_id: r.id,
        monto,
        metodo_pago: metodoPago,
        concepto: 'Abono a reserva',
      });
      toast({ title: '✅ Pago registrado', description: `$${monto.toFixed(2)} con ${metodoPago}` });
      setMontoAbono('');
      await cargarReserva();
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAgregarCargo = async () => {
    if (!cargoConcepto || !cargoMonto) {
      toast({ title: 'Completa los campos', variant: 'destructive' });
      return;
    }
    
    const concepto = conceptosCargo.find(c => c.id === cargoConcepto);
    const cantidad = safeNumber(cargoCantidad, 1);
    const precioUnitario = safeNumber(cargoMonto);
    const subtotal = cantidad * precioUnitario;
    const impuesto = concepto?.aplica_iva ? subtotal * 0.16 : 0;
    
    setProcessing(true);
    try {
      await api.createCargo({
        reserva_id: r.id,
        concepto_id: cargoConcepto,
        concepto: concepto?.nombre || 'Cargo adicional',
        cantidad,
        precio_unitario: precioUnitario,
        subtotal,
        impuesto,
        total: subtotal + impuesto,
        notas: cargoNotas,
      });
      toast({ title: '✅ Cargo agregado' });
      setCargoConcepto('');
      setCargoMonto('');
      setCargoCantidad('1');
      setCargoNotas('');
      await cargarReserva();
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAsignarEntregable = async () => {
    if (!entregableSeleccionado) return;
    
    const cantidad = safeNumber(entregableCantidad, 1);
    if (cantidad < 1) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      await api.asignarEntregable?.(r.id, { 
        entregable_id: entregableSeleccionado, 
        cantidad 
      });
      toast({ title: '✅ Entregable asignado', description: `${cantidad} unidad(es)` });
      setEntregableSeleccionado('');
      setEntregableCantidad('1');
      await cargarReserva();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // ============ DEVOLUCIÓN INLINE ============
  
  const abrirDevolucionInline = (ent: any) => {
    setDevolucionExpandidaId(ent.id);
    setDevolucionForm({
      cantidadDevolver: String(ent.cantidad || 1),
      costoUnitario: String(ent.costo_reposicion || 0),
      crearCargo: true
    });
  };

  const cerrarDevolucionInline = () => {
    setDevolucionExpandidaId(null);
    setDevolucionForm({ cantidadDevolver: '', costoUnitario: '', crearCargo: true });
  };

  const handleDevolverEntregableInline = async (ent: any) => {
    const cantDevuelta = safeNumber(devolucionForm.cantidadDevolver, 0);
    const cantEntregada = ent.cantidad || 1;
    const faltantes = cantEntregada - cantDevuelta;
    const costo = safeNumber(devolucionForm.costoUnitario, 0);
    
    if (cantDevuelta < 0 || cantDevuelta > cantEntregada) {
      toast({ title: 'Cantidad inválida', description: `Debe ser entre 0 y ${cantEntregada}`, variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      const result = await api.devolverEntregable?.(ent.id, {
        cantidad_devuelta: cantDevuelta,
        costo_unitario: costo,
        crear_cargo: devolucionForm.crearCargo && faltantes > 0 && costo > 0
      });
      
      if (result?.cargo) {
        toast({ 
          title: '✅ Devolución procesada', 
          description: `Cargo por faltantes: $${result.cargo.total.toLocaleString()}` 
        });
      } else {
        toast({ title: '✅ Devolución registrada' });
      }
      
      cerrarDevolucionInline();
      await cargarReserva();
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmar = async () => {
    setProcessing(true);
    try {
      await api.confirmarReserva(r.id);
      toast({ title: '✓ Reserva confirmada' });
      await cargarReserva();
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm('¿Seguro que desea cancelar esta reserva?')) return;
    
    setProcessing(true);
    try {
      await api.cancelarReserva(r.id);
      toast({ title: 'Reserva cancelada' });
      onOpenChange(false);
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // ============ COMPONENTE ENTREGABLE ITEM ============
  
  const EntregableItem = ({ ent }: { ent: any }) => {
    const cantEntregada = ent.cantidad || 1;
    const cantDevuelta = ent.cantidad_devuelta ?? 0;
    const faltantesYaProcesados = cantEntregada - cantDevuelta;
    const yaProcesado = ent.devuelto === 1;
    const estaExpandido = devolucionExpandidaId === ent.id;
    
    // Cálculos para el form inline
    const faltantesForm = cantEntregada - safeNumber(devolucionForm.cantidadDevolver, 0);
    const costoForm = safeNumber(devolucionForm.costoUnitario, 0);
    const totalCargoForm = faltantesForm * costoForm * 1.16;

    return (
      <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${estaExpandido ? 'border-primary ring-2 ring-primary/20' : ''}`}>
        {/* Header del entregable */}
        <div className="p-3 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{ent.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  Entregado: {ent.fecha_entrega ? format(new Date(ent.fecha_entrega), 'd MMM HH:mm', { locale: es }) : '-'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg">{cantEntregada} unid.</Badge>
          </div>
          
          {/* Estado y acciones */}
          {ent.requiere_devolucion ? (
            <div className="mt-3 pt-3 border-t">
              {yaProcesado ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Devueltos: </span>
                    <span className="font-medium text-green-600">{cantDevuelta}</span>
                    {faltantesYaProcesados > 0 && (
                      <>
                        <span className="text-muted-foreground"> • Faltantes: </span>
                        <span className="font-medium text-red-600">{faltantesYaProcesados}</span>
                        {ent.costo_unitario_cobrado > 0 && (
                          <span className="text-muted-foreground"> (${ent.costo_unitario_cobrado}/u)</span>
                        )}
                      </>
                    )}
                  </div>
                  <Badge variant={faltantesYaProcesados === 0 ? 'outline' : 'destructive'} className={faltantesYaProcesados === 0 ? 'text-green-600' : ''}>
                    {faltantesYaProcesados === 0 ? '✓ Completo' : `${faltantesYaProcesados} no devueltos`}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Pendiente de devolución</span>
                  </div>
                  <Button 
                    variant={estaExpandido ? "secondary" : "outline"} 
                    size="sm" 
                    onClick={() => estaExpandido ? cerrarDevolucionInline() : abrirDevolucionInline(ent)}
                    disabled={processing}
                  >
                    {estaExpandido ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Cerrar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Procesar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <Badge variant="secondary">No requiere devolución</Badge>
            </div>
          )}
        </div>

        {/* Form inline expandible */}
        {estaExpandido && (
          <div className="border-t bg-muted/30 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Cantidad entregada</Label>
                <Input value={cantEntregada} disabled className="bg-muted h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cantidad devuelta</Label>
                <Input 
                  type="number" 
                  className="h-9"
                  value={devolucionForm.cantidadDevolver}
                  onChange={(e) => setDevolucionForm(prev => ({ ...prev, cantidadDevolver: e.target.value }))}
                  min="0"
                  max={cantEntregada}
                  autoFocus
                />
              </div>
            </div>
            
            {/* Faltantes calculados */}
            {faltantesForm > 0 && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded dark:bg-amber-950/30 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Faltantes: {faltantesForm} unidad(es)
                </p>
              </div>
            )}
            
            {faltantesForm > 0 && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Costo por unidad faltante</Label>
                  <Input 
                    type="number" 
                    className="h-9"
                    value={devolucionForm.costoUnitario}
                    onChange={(e) => setDevolucionForm(prev => ({ ...prev, costoUnitario: e.target.value }))}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Costo catálogo: ${ent.costo_reposicion || 0}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`crearCargo-${ent.id}`}
                    checked={devolucionForm.crearCargo}
                    onCheckedChange={(c) => setDevolucionForm(prev => ({ ...prev, crearCargo: !!c }))}
                  />
                  <label htmlFor={`crearCargo-${ent.id}`} className="text-sm cursor-pointer">
                    Crear cargo por faltantes
                  </label>
                </div>
                
                {devolucionForm.crearCargo && costoForm > 0 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded dark:bg-red-950/30 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Cargo:</strong> {faltantesForm} × ${costoForm.toLocaleString()} + IVA = 
                      <strong> ${totalCargoForm.toLocaleString()}</strong>
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={cerrarDevolucionInline} 
                className="flex-1"
                disabled={processing}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleDevolverEntregableInline(ent)} 
                disabled={processing}
                className="flex-1"
              >
                {processing ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                {faltantesForm > 0 ? 'Confirmar con faltantes' : 'Confirmar'}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">#{r.numero_reserva || r.id?.slice(0, 8)}</DialogTitle>
              {getEstadoBadge(r.estado)}
              {getOrigenBadge(r.origen)}
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex gap-2">
              {!editMode && r.estado !== 'CheckOut' && r.estado !== 'Cancelada' && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
              {editMode && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelarEdicion}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={handleGuardarCambios} disabled={processing}>
                    <Save className="h-4 w-4 mr-1" /> Guardar
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={cargarReserva} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm"><Printer className="h-4 w-4" /></Button>
            </div>
          </div>
          <DialogDescription>Gestiona los detalles de la reserva, cargos y pagos</DialogDescription>
        </DialogHeader>

        {r.estado === 'Confirmada' && (
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium flex items-center gap-2"><DoorOpen className="h-4 w-4" /> Check-in pendiente</span>
                <span className="text-sm text-muted-foreground">
                  {[documentoVerificado, tarjetaRegistrada, firmaDigital].filter(Boolean).length}/3
                </span>
              </div>
              <Progress value={[documentoVerificado, tarjetaRegistrada, firmaDigital].filter(Boolean).length * 33.33} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
                <TabsTrigger value="huesped">Huésped</TabsTrigger>
                <TabsTrigger value="cargos">Cargos {r.cargos?.length > 0 && `(${r.cargos.length})`}</TabsTrigger>
                <TabsTrigger value="entregables">
                  Entregables
                  {reservaEntregables.filter(e => e.requiere_devolucion && !e.devuelto).length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                      {reservaEntregables.filter(e => e.requiere_devolucion && !e.devuelto).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pagos">Pagos {r.pagos?.length > 0 && `(${r.pagos.length})`}</TabsTrigger>
              </TabsList>

              {/* TAB RESUMEN */}
              <TabsContent value="resumen" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Estancia</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-in</Label>
                      <p className="font-medium">{format(fechaCheckin, "EEE d MMM yyyy", { locale: es })}</p>
                      {r.hora_llegada && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{r.hora_llegada}</p>}
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-out</Label>
                      {editMode ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                              <Calendar className="mr-2 h-4 w-4" />
                              {format(fechaCheckout, "d MMM yyyy", { locale: es })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={fechaCheckout}
                              onSelect={(d) => d && setFechaCheckout(d)}
                              disabled={(d) => d <= fechaCheckin}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <p className="font-medium">{format(new Date(r.fecha_checkout), "EEE d MMM yyyy", { locale: es })}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Noches</Label>
                      <p className="font-medium">
                        {nochesActuales}
                        {editMode && diferenciaNOches !== 0 && (
                          <span className={`ml-1 text-sm ${diferenciaNOches > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({diferenciaNOches > 0 ? '+' : ''}{diferenciaNOches})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Huéspedes</Label>
                      <p className="font-medium">{r.adultos}A {r.ninos || 0}N {personasExtra > 0 && <span className="text-primary">+{personasExtra}</span>}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><BedDouble className="h-4 w-4" /> Habitación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="flex items-center gap-4">
                        <Select value={habitacionId} onValueChange={setHabitacionId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar habitación..." />
                          </SelectTrigger>
                          <SelectContent>
                            {habitaciones.map(h => (
                              <SelectItem key={h.id} value={h.id}>
                                {h.numero} - {h.tipo_nombre || h.tipo_habitacion_nombre} ({h.estado_habitacion})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">${tarifaNoche.toLocaleString()} /noche</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{r.tipo_habitacion_nombre || 'Sin tipo'}</p>
                          <p className="text-sm text-muted-foreground">${tarifaNoche.toLocaleString()} /noche</p>
                        </div>
                        {r.habitacion_numero ? (
                          <Badge variant="outline" className="text-2xl px-4 py-2">{r.habitacion_numero}</Badge>
                        ) : (
                          <Badge variant="secondary">Sin asignar</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(r.solicitudes_especiales || r.notas_internas) && (
                  <div className="grid grid-cols-2 gap-4">
                    {r.solicitudes_especiales && (
                      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">Solicitudes</p>
                              <p className="text-sm text-muted-foreground">{r.solicitudes_especiales}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {r.notas_internas && (
                      <Card className="border-slate-200 bg-slate-50 dark:bg-slate-950/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            <Receipt className="h-4 w-4 text-slate-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">Notas internas</p>
                              <p className="text-sm text-muted-foreground">{r.notas_internas}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {r.estado === 'Confirmada' && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">✓ Verificaciones Check-in</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="doc" checked={documentoVerificado} onCheckedChange={(c) => setDocumentoVerificado(!!c)} />
                        <label htmlFor="doc" className="text-sm cursor-pointer">Documento de identidad verificado</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="tarjeta" checked={tarjetaRegistrada} onCheckedChange={(c) => setTarjetaRegistrada(!!c)} />
                        <label htmlFor="tarjeta" className="text-sm cursor-pointer">Garantía/tarjeta registrada</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="firma" checked={firmaDigital} onCheckedChange={(c) => setFirmaDigital(!!c)} />
                        <label htmlFor="firma" className="text-sm cursor-pointer">Registro de huésped firmado</label>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {r.estado === 'CheckIn' && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">✓ Verificaciones Check-out</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="insp" checked={habitacionInspeccionada} onCheckedChange={(c) => setHabitacionInspeccionada(!!c)} />
                        <label htmlFor="insp" className="text-sm cursor-pointer">Habitación inspeccionada</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="llave" checked={llaveDevuelta} onCheckedChange={(c) => setLlaveDevuelta(!!c)} />
                        <label htmlFor="llave" className="text-sm cursor-pointer">Llaves devueltas</label>
                      </div>
                      {reservaEntregables.filter(e => e.requiere_devolucion && !e.devuelto).length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700 font-medium">⚠️ Entregables pendientes:</p>
                          <ul className="text-sm text-red-600 mt-1">
                            {reservaEntregables.filter(e => e.requiere_devolucion && !e.devuelto).map(e => (
                              <li key={e.id}>• {e.nombre} ({e.cantidad} unidades)</li>
                            ))}
                          </ul>
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveTab('entregables')}>
                            Ir a entregables
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB HUÉSPED */}
              <TabsContent value="huesped" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                        {r.cliente_nombre?.charAt(0)}{r.apellido_paterno?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{r.cliente_nombre} {r.apellido_paterno} {r.apellido_materno}</h3>
                        <div className="flex gap-2 mt-1">
                          {r.es_vip && <Badge>VIP</Badge>}
                          {r.total_estancias > 0 && <Badge variant="outline">{r.total_estancias} estancias</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{r.cliente_email || 'Sin email'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{r.cliente_telefono || 'Sin teléfono'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB CARGOS */}
              <TabsContent value="cargos" className="mt-4 space-y-4">
                {r.estado === 'CheckIn' && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Agregar Cargo</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={cargoConcepto} onValueChange={(v) => {
                          setCargoConcepto(v);
                          const c = conceptosCargo.find(x => x.id === v);
                          if (c?.precio_default) setCargoMonto(c.precio_default.toString());
                        }}>
                          <SelectTrigger><SelectValue placeholder="Concepto..." /></SelectTrigger>
                          <SelectContent>
                            {conceptosCargo.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nombre} {c.precio_default > 0 && `- $${c.precio_default}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Cantidad" value={cargoCantidad} onChange={(e) => setCargoCantidad(e.target.value)} />
                          <Input type="number" placeholder="Precio" value={cargoMonto} onChange={(e) => setCargoMonto(e.target.value)} />
                        </div>
                      </div>
                      <Textarea placeholder="Notas (opcional)" rows={2} value={cargoNotas} onChange={(e) => setCargoNotas(e.target.value)} />
                      <Button onClick={handleAgregarCargo} disabled={processing || !cargoConcepto}>
                        <Plus className="h-4 w-4 mr-1" /> Agregar cargo
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Cargos ({r.cargos?.length || 0})</CardTitle></CardHeader>
                  <CardContent>
                    {r.cargos && r.cargos.length > 0 ? (
                      <div className="space-y-2">
                        {r.cargos.map((cargo: any, idx: number) => (
                          <div key={cargo.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">{cargo.concepto || cargo.producto_nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {cargo.cantidad} x ${safeNumber(cargo.precio_unitario).toLocaleString()}
                                {cargo.notas && ` • ${cargo.notas}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${safeNumber(cargo.total).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {cargo.created_at ? format(new Date(cargo.created_at), 'd MMM HH:mm', { locale: es }) : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 font-bold">
                          <span>Total cargos:</span>
                          <span>${totalCargos.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">Sin cargos adicionales</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB ENTREGABLES */}
              <TabsContent value="entregables" className="mt-4 space-y-4">
                {r.estado === 'CheckIn' && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Asignar Entregable</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Select value={entregableSeleccionado} onValueChange={setEntregableSeleccionado}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            {entregables.map(e => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nombre} {e.requiere_devolucion ? '(devolver)' : ''} 
                                {e.costo_reposicion > 0 && ` - $${e.costo_reposicion}/u`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input 
                          type="number" 
                          placeholder="Cant" 
                          className="w-20"
                          value={entregableCantidad}
                          onChange={(e) => setEntregableCantidad(e.target.value)}
                          min="1"
                        />
                        <Button onClick={handleAsignarEntregable} disabled={processing || !entregableSeleccionado}>
                          <Plus className="h-4 w-4 mr-1" /> Asignar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" /> Entregados ({reservaEntregables.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reservaEntregables.length > 0 ? (
                      <div className="space-y-3">
                        {reservaEntregables.map((ent: any) => (
                          <EntregableItem key={ent.id} ent={ent} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">Sin entregables asignados</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB PAGOS */}
              <TabsContent value="pagos" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Registrar Pago</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Monto" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="flex-1" />
                      <Select value={metodoPago} onValueChange={setMetodoPago}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                          <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="Transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAbonar} disabled={processing}>
                        <CreditCard className="h-4 w-4 mr-1" /> Pagar
                      </Button>
                    </div>
                    {saldoPendiente > 0 && (
                      <Button variant="outline" className="w-full mt-2" onClick={() => setMontoAbono(saldoPendiente.toFixed(2))}>
                        Liquidar total: ${saldoPendiente.toLocaleString()}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Historial de Pagos</CardTitle></CardHeader>
                  <CardContent>
                    {r.pagos && r.pagos.length > 0 ? (
                      <div className="space-y-2">
                        {r.pagos.map((pago: any, idx: number) => (
                          <div key={pago.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">${safeNumber(pago.monto).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{pago.metodo_pago} • {pago.concepto}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {pago.created_at ? format(new Date(pago.created_at), 'd MMM HH:mm', { locale: es }) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">Sin pagos registrados</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* SIDEBAR DERECHO */}
          <div className="space-y-4">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Cuenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between opacity-80">
                  <span>Hospedaje ({nochesActuales}n × ${tarifaNoche.toLocaleString()})</span>
                  <span>${subtotalHospedaje.toLocaleString()}</span>
                </div>
                {totalPersonaExtra > 0 && (
                  <div className="flex justify-between opacity-80">
                    <span>Persona extra ({personasExtra})</span>
                    <span>${totalPersonaExtra.toLocaleString()}</span>
                  </div>
                )}
                {totalCargos > 0 && (
                  <div className="flex justify-between opacity-80">
                    <span>Cargos extras</span>
                    <span>${totalCargos.toLocaleString()}</span>
                  </div>
                )}
                {descuentoMonto > 0 && (
                  <div className="flex justify-between text-green-300">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Descuento {r.descuento_tipo === 'Porcentaje' && `(${r.descuento_valor}%)`}
                    </span>
                    <span>-${descuentoMonto.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between opacity-80">
                  <span>IVA (16%)</span>
                  <span>${impuestos.toLocaleString()}</span>
                </div>
                <Separator className="bg-primary-foreground/20" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toLocaleString()}</span>
                </div>
                
                <div className="mt-3 p-3 rounded-lg bg-primary-foreground/10">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pagado</span>
                    <span className="text-green-300">${pagado.toLocaleString()}</span>
                  </div>
                  <Progress value={porcentajePagado} className="h-2 bg-primary-foreground/20" />
                </div>
                
                <div className={`p-4 rounded-lg text-center ${saldoPendiente > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                  <p className="text-xs opacity-80">Saldo pendiente</p>
                  <p className="text-2xl font-bold">${saldoPendiente.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {r.estado === 'Pendiente' && (
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={handleConfirmar} disabled={processing}>
                  {processing ? 'Procesando...' : '✓ Confirmar Reserva'}
                </Button>
                <Button variant="destructive" className="w-full" size="sm" onClick={handleCancelar} disabled={processing}>
                  Cancelar Reserva
                </Button>
              </div>
            )}

            {r.estado === 'Confirmada' && (
              <div className="space-y-2">
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" onClick={handleCheckin} disabled={processing}>
                  {processing ? 'Procesando...' : <><DoorOpen className="h-5 w-5 mr-2" /> Hacer Check-in</>}
                </Button>
                <Button variant="destructive" className="w-full" size="sm" onClick={handleCancelar} disabled={processing}>
                  Cancelar Reserva
                </Button>
              </div>
            )}

            {r.estado === 'CheckIn' && (
              <div className="space-y-2">
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700" 
                  size="lg" 
                  onClick={handleCheckout} 
                  disabled={processing || saldoPendiente > 0.01}
                >
                  {processing ? 'Procesando...' : <><DoorClosed className="h-5 w-5 mr-2" /> Hacer Check-out</>}
                </Button>
                {saldoPendiente > 0.01 && (
                  <p className="text-xs text-center text-destructive">* Debe liquidar el saldo pendiente</p>
                )}
                {reservaEntregables.filter(e => e.requiere_devolucion && !e.devuelto).length > 0 && (
                  <p className="text-xs text-center text-amber-600">* Procesar devolución de entregables</p>
                )}
              </div>
            )}

            {r.estado === 'CheckOut' && (
              <Card className="bg-muted">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">✓ Estancia finalizada</p>
                </CardContent>
              </Card>
            )}

            {r.estado === 'Cancelada' && (
              <Card className="bg-destructive/10 border-destructive">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-destructive font-medium">Reserva cancelada</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
