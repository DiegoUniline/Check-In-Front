import { useState, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarDays, Search, BedDouble, Check, ChevronRight, ChevronLeft, 
  CalendarPlus, UserPlus, Clock, Percent, DollarSign, Package, Plus, Trash2, 
  Receipt, Phone, Mail, CreditCard, X
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';

export interface ReservationPreload {
  habitacion?: any;
  fechaCheckin?: Date;
  fechaCheckout?: Date;
}

interface NuevaReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preload?: ReservationPreload;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface CargoTemp {
  id: string;
  concepto_id: string;
  concepto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  aplica_iva: boolean;
  subtotal: number;
  impuesto: number;
  total: number;
  notas: string;
}

interface PagoTemp {
  id: string;
  monto: number;
  metodo_pago: string;
  concepto: string;
}

interface FormData {
  fechaCheckin: Date;
  fechaCheckout: Date;
  horaLlegada: string;
  adultos: number;
  ninos: number;
  personasExtra: number;
  cargoPersonaExtra: number;
  tipoHabitacion: string;
  habitacionId: string;
  clienteId: string;
  clienteData: any;
  nuevoCliente: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    email: string;
    telefono: string;
    tipo_documento: string;
    numero_documento: string;
  };
  solicitudesEspeciales: string;
  notasInternas: string;
  descuentoTipo: 'none' | 'Monto' | 'Porcentaje';
  descuentoValor: number;
  entregablesSeleccionados: string[];
  cargos: CargoTemp[];
  pagos: PagoTemp[];
}

const createInitialFormData = (preload?: ReservationPreload): FormData => ({
  fechaCheckin: preload?.fechaCheckin || new Date(),
  fechaCheckout: preload?.fechaCheckout || addDays(new Date(), 1),
  horaLlegada: '15:00',
  adultos: 2,
  ninos: 0,
  personasExtra: 0,
  cargoPersonaExtra: 250,
  tipoHabitacion: preload?.habitacion?.tipo_id || '',
  habitacionId: preload?.habitacion?.id || '',
  clienteId: '',
  clienteData: null,
  nuevoCliente: {
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    telefono: '',
    tipo_documento: 'INE',
    numero_documento: '',
  },
  solicitudesEspeciales: '',
  notasInternas: '',
  descuentoTipo: 'none',
  descuentoValor: 0,
  entregablesSeleccionados: [],
  cargos: [],
  pagos: [],
});

export function NuevaReservaModal({ open, onOpenChange, preload, onSuccess }: NuevaReservaModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(createInitialFormData());
  const [searchCliente, setSearchCliente] = useState('');
  const [crearNuevoCliente, setCrearNuevoCliente] = useState(false);
  const [loading, setLoading] = useState(false);
  const [origen, setOrigen] = useState<'Reserva' | 'Recepcion'>('Reserva');
  const { toast } = useToast();

  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [entregables, setEntregables] = useState<any[]>([]);
  const [conceptosCargo, setConceptosCargo] = useState<any[]>([]);

  const [cargoConcepto, setCargoConcepto] = useState('');
  const [cargoCantidad, setCargoCantidad] = useState('1');
  const [cargoMonto, setCargoMonto] = useState('');

  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('Efectivo');

  useEffect(() => {
    if (open) {
      cargarDatos();
      setStep(1);
      setOrigen('Reserva');
      setCrearNuevoCliente(false);
      setSearchCliente('');
      setFormData(createInitialFormData(preload));
    }
  }, [open, preload]);

  const cargarDatos = async () => {
    try {
      const [tiposData, entregablesData, conceptosData] = await Promise.all([
        api.getTiposHabitacion(),
        api.getEntregables?.() || Promise.resolve([]),
        api.getConceptosCargo?.() || Promise.resolve([])
      ]);
      setTiposHabitacion(tiposData);
      setEntregables(entregablesData);
      setConceptosCargo(conceptosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const buscarHabitaciones = async () => {
    try {
      const checkin = format(formData.fechaCheckin, 'yyyy-MM-dd');
      const checkout = format(formData.fechaCheckout, 'yyyy-MM-dd');
      const data = await api.getHabitacionesDisponibles(checkin, checkout, formData.tipoHabitacion || undefined);
      setHabitacionesDisponibles(data);
    } catch (error) {
      try {
        const data = await api.getHabitaciones({ estado_habitacion: 'Disponible' });
        setHabitacionesDisponibles(data.filter((h: any) => 
          !formData.tipoHabitacion || h.tipo_id === formData.tipoHabitacion
        ));
      } catch (e) {
        console.error('Error:', e);
      }
    }
  };

  const buscarClientes = async (query: string) => {
    if (!query || query.length < 2) {
      setClientes([]);
      return;
    }
    try {
      const data = await api.getClientes({ search: query });
      setClientes(data.slice(0, 5));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => buscarClientes(searchCliente), 300);
    return () => clearTimeout(timer);
  }, [searchCliente]);

  const handleSelectCliente = (cliente: any) => {
    setFormData({ ...formData, clienteId: cliente.id, clienteData: cliente });
    setSearchCliente('');
    setClientes([]);
  };

  const handleClearCliente = () => {
    setFormData({ ...formData, clienteId: '', clienteData: null });
  };

  // Cálculos
const noches = differenceInDays(
  new Date(format(formData.fechaCheckout, 'yyyy-MM-dd')),
  new Date(format(formData.fechaCheckin, 'yyyy-MM-dd'))
) || 1;
  const selectedHabitacion = habitacionesDisponibles.find(h => h.id === formData.habitacionId) || 
    (preload?.habitacion?.id === formData.habitacionId ? preload.habitacion : null);
  const selectedTipo = tiposHabitacion.find(t => t.id === formData.tipoHabitacion) || 
    (selectedHabitacion ? { precio_base: selectedHabitacion.precio_base, nombre: selectedHabitacion.tipo_nombre } : null);

  const tarifaNoche = selectedTipo?.precio_base || 0;
  const subtotalHospedaje = tarifaNoche * noches;
  const totalPersonaExtra = formData.personasExtra * formData.cargoPersonaExtra * noches;
  const totalCargosExtras = formData.cargos.reduce((sum, c) => sum + c.total, 0);
  const subtotal = subtotalHospedaje + totalPersonaExtra + totalCargosExtras;
  
  let descuentoMonto = 0;
  if (formData.descuentoTipo === 'Monto') descuentoMonto = formData.descuentoValor;
  else if (formData.descuentoTipo === 'Porcentaje') descuentoMonto = subtotal * (formData.descuentoValor / 100);
  
  const subtotalConDescuento = subtotal - descuentoMonto;
  const impuestos = subtotalConDescuento * 0.16;
  const total = subtotalConDescuento + impuestos;
  const totalPagado = formData.pagos.reduce((sum, p) => sum + p.monto, 0);
  const saldoPendiente = total - totalPagado;

  // FIX: Solo cambiar checkin a hoy, mantener checkout seleccionado
  const handleOrigenChange = (nuevoOrigen: 'Reserva' | 'Recepcion') => {
    setOrigen(nuevoOrigen);
    if (nuevoOrigen === 'Recepcion') {
      const hoy = new Date();
      const checkoutActual = formData.fechaCheckout;
      // Si el checkout es menor o igual a hoy, ajustarlo a mañana
      const nuevoCheckout = checkoutActual <= hoy ? addDays(hoy, 1) : checkoutActual;
      setFormData({ ...formData, fechaCheckin: hoy, fechaCheckout: nuevoCheckout });
    }
  };

  const handleNext = async () => {
    if (step === 1) await buscarHabitaciones();
    if (step < 4) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleAgregarCargo = () => {
    if (!cargoConcepto || !cargoMonto) return;
    const concepto = conceptosCargo.find(c => c.id === cargoConcepto);
    const cantidad = parseFloat(cargoCantidad) || 1;
    const precioUnitario = parseFloat(cargoMonto);
    const subtotalCargo = cantidad * precioUnitario;
    const aplicaIva = concepto?.aplica_iva ?? true;
    const impuestoCargo = aplicaIva ? subtotalCargo * 0.16 : 0;
    
    setFormData(prev => ({ 
      ...prev, 
      cargos: [...prev.cargos, {
        id: `temp-${Date.now()}`,
        concepto_id: cargoConcepto,
        concepto_nombre: concepto?.nombre || 'Cargo',
        cantidad, precio_unitario: precioUnitario, aplica_iva: aplicaIva,
        subtotal: subtotalCargo, impuesto: impuestoCargo, total: subtotalCargo + impuestoCargo,
        notas: '',
      }] 
    }));
    setCargoConcepto(''); setCargoCantidad('1'); setCargoMonto('');
  };

  const handleAgregarPago = () => {
    const monto = parseFloat(pagoMonto);
    if (!monto || monto <= 0) return;
    
    setFormData(prev => ({
      ...prev,
      pagos: [...prev.pagos, {
        id: `pago-${Date.now()}`,
        monto,
        metodo_pago: pagoMetodo,
        concepto: origen === 'Recepcion' ? 'Pago check-in' : 'Anticipo',
      }]
    }));
    setPagoMonto('');
  };

  const handleEliminarPago = (pagoId: string) => {
    setFormData(prev => ({ ...prev, pagos: prev.pagos.filter(p => p.id !== pagoId) }));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let clienteId = formData.clienteId;

      if (!clienteId && formData.nuevoCliente.nombre) {
        const nuevoCliente = await api.createCliente(formData.nuevoCliente);
        clienteId = nuevoCliente.id;
      }

      if (!clienteId) {
        toast({ title: 'Error', description: 'Selecciona o crea un cliente', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const reservaData = {
        cliente_id: clienteId,
        habitacion_id: formData.habitacionId || null,
        tipo_habitacion_id: formData.tipoHabitacion,
        fecha_checkin: format(formData.fechaCheckin, 'yyyy-MM-dd'),
        fecha_checkout: format(formData.fechaCheckout, 'yyyy-MM-dd'),
        hora_llegada: formData.horaLlegada || null,
        adultos: formData.adultos,
        ninos: formData.ninos,
        personas_extra: formData.personasExtra,
        cargo_persona_extra: formData.cargoPersonaExtra,
        tarifa_noche: tarifaNoche,
        descuento_tipo: formData.descuentoTipo === 'none' ? null : formData.descuentoTipo,
        descuento_valor: formData.descuentoValor || 0,
        solicitudes_especiales: formData.solicitudesEspeciales,
        notas_internas: formData.notasInternas,
        origen,
      };

      const reserva = await api.createReserva(reservaData);

      if (origen === 'Recepcion' && formData.habitacionId) {
        await api.checkin(reserva.id, formData.habitacionId);
        for (const entregableId of formData.entregablesSeleccionados) {
          try { await api.asignarEntregable?.(reserva.id, { entregable_id: entregableId, cantidad: 1 }); } catch {}
        }
      }

 for (const cargo of formData.cargos) {
  try {
    await api.createCargo({
      reserva_id: reserva.id, 
      concepto_id: cargo.concepto_id, 
      concepto: cargo.concepto_nombre,
      cantidad: cargo.cantidad, 
      precio_unitario: cargo.precio_unitario,
      subtotal: cargo.subtotal, 
      impuesto: cargo.impuesto, 
      total: cargo.total,
    });
  } catch (err) {
    console.error('Error creando cargo:', err);
  }
}

      for (const pago of formData.pagos) {
        try {
          await api.createPago({
            reserva_id: reserva.id,
            monto: pago.monto,
            metodo_pago: pago.metodo_pago,
            concepto: pago.concepto,
          });
        } catch {}
      }

      toast({
        title: origen === 'Recepcion' ? '✅ Check-in completado' : '✅ Reserva creada',
        description: `Habitación ${selectedHabitacion?.numero} - ${formData.clienteData?.nombre || formData.nuevoCliente.nombre}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleEntregable = (id: string) => {
    setFormData(prev => ({
      ...prev,
      entregablesSeleccionados: prev.entregablesSeleccionados.includes(id)
        ? prev.entregablesSeleccionados.filter(e => e !== id)
        : [...prev.entregablesSeleccionados, id]
    }));
  };

  const progressValue = (step / 4) * 100;

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {origen === 'Recepcion' ? <><UserPlus className="h-5 w-5" /> Check-in Directo</> : <><CalendarPlus className="h-5 w-5" /> Nueva Reserva</>}
          </DialogTitle>
          <DialogDescription>
            Paso {step} de 4 - {step === 1 ? 'Fechas' : step === 2 ? 'Habitación' : step === 3 ? 'Huésped' : 'Confirmar'}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progressValue} className="h-2 mb-4" />

        {/* STEP 1 - FECHAS */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button type="button" variant={origen === 'Reserva' ? 'default' : 'ghost'} className="flex-1" onClick={() => handleOrigenChange('Reserva')}>
                <CalendarPlus className="h-4 w-4 mr-2" /> Reserva
              </Button>
              <Button type="button" variant={origen === 'Recepcion' ? 'default' : 'ghost'} className="flex-1" onClick={() => handleOrigenChange('Recepcion')}>
                <UserPlus className="h-4 w-4 mr-2" /> Recepción
              </Button>
            </div>

            {origen === 'Recepcion' && (
              <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20">
                <CardContent className="p-3 text-sm text-amber-800 dark:text-amber-200">
                  🚶 Check-in automático al confirmar
                </CardContent>
              </Card>
            )}

            {preload?.habitacion && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <BedDouble className="h-5 w-5 text-primary" />
                  <span className="font-medium">Hab. {preload.habitacion.numero} - {preload.habitacion.tipo_nombre}</span>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" disabled={origen === 'Recepcion'}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(formData.fechaCheckin, 'd MMM yyyy', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.fechaCheckin} onSelect={(d) => d && setFormData({ ...formData, fechaCheckin: d })} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(formData.fechaCheckout, 'd MMM yyyy', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.fechaCheckout} onSelect={(d) => d && setFormData({ ...formData, fechaCheckout: d })} disabled={(d) => d <= formData.fechaCheckin} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora llegada</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="time" className="pl-9" value={formData.horaLlegada} onChange={(e) => setFormData({ ...formData, horaLlegada: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Adultos</Label>
                <Select value={formData.adultos.toString()} onValueChange={(v) => setFormData({ ...formData, adultos: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Niños</Label>
                <Select value={formData.ninos.toString()} onValueChange={(v) => setFormData({ ...formData, ninos: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0,1,2,3,4].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Extras</Label>
                <Select value={formData.personasExtra.toString()} onValueChange={(v) => setFormData({ ...formData, personasExtra: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0,1,2,3].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cargo extra</Label>
                <Input type="number" value={formData.cargoPersonaExtra} onChange={(e) => setFormData({ ...formData, cargoPersonaExtra: parseFloat(e.target.value) || 0 })} disabled={formData.personasExtra === 0} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de habitación</Label>
              <ComboboxCreatable
                options={tiposHabitacion.map(t => ({ value: t.id, label: `${t.nombre} - $${t.precio_base?.toLocaleString()}/noche` }))}
                value={formData.tipoHabitacion}
                onValueChange={(v) => setFormData({ ...formData, tipoHabitacion: v, habitacionId: '' })}
                onCreate={async (nombre) => {
                  const newTipo = await api.createTipoHabitacion({ nombre, precio_base: 1000 });
                  setTiposHabitacion([...tiposHabitacion, newTipo]);
                  return { value: newTipo.id, label: `${newTipo.nombre} - $1,000/noche` };
                }}
                placeholder="Seleccionar..." searchPlaceholder="Buscar..." createLabel="Crear"
              />
            </div>
          </div>
        )}

        {/* STEP 2 - HABITACIÓN */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{habitacionesDisponibles.length} disponibles para {format(formData.fechaCheckin, 'd MMM', { locale: es })} - {format(formData.fechaCheckout, 'd MMM', { locale: es })}</p>
            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
              {habitacionesDisponibles.map(hab => (
                <Card key={hab.id} className={cn("cursor-pointer hover:border-primary transition-colors", formData.habitacionId === hab.id && "border-primary bg-primary/5")} onClick={() => setFormData({ ...formData, habitacionId: hab.id, tipoHabitacion: hab.tipo_id })}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BedDouble className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Habitación {hab.numero}</p>
                        <p className="text-sm text-muted-foreground">{hab.tipo_nombre}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${hab.precio_base?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">/noche</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {habitacionesDisponibles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay habitaciones disponibles para las fechas seleccionadas
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 - HUÉSPED */}
        {step === 3 && (
          <div className="space-y-4">
            {formData.clienteData ? (
              <Card className="border-primary bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                        {formData.clienteData.nombre?.charAt(0)}{formData.clienteData.apellido_paterno?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {formData.clienteData.nombre} {formData.clienteData.apellido_paterno} {formData.clienteData.apellido_materno}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {formData.clienteData.telefono && (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formData.clienteData.telefono}</span>
                          )}
                          {formData.clienteData.email && (
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{formData.clienteData.email}</span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {formData.clienteData.es_vip && <Badge>VIP</Badge>}
                          {formData.clienteData.total_estancias > 0 && <Badge variant="outline">{formData.clienteData.total_estancias} estancias</Badge>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearCliente}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : !crearNuevoCliente ? (
              <>
                <div className="space-y-2">
                  <Label>Buscar cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Nombre, email o teléfono..." className="pl-9" value={searchCliente} onChange={(e) => setSearchCliente(e.target.value)} />
                  </div>
                </div>
                {clientes.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {clientes.map(cliente => (
                      <Card key={cliente.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectCliente(cliente)}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {cliente.nombre?.charAt(0)}{cliente.apellido_paterno?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{cliente.nombre} {cliente.apellido_paterno}</p>
                              <p className="text-sm text-muted-foreground">{cliente.telefono || cliente.email}</p>
                            </div>
                          </div>
                          {cliente.es_vip && <Badge>VIP</Badge>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <Separator />
                <Button variant="outline" className="w-full" onClick={() => setCrearNuevoCliente(true)}>+ Nuevo cliente</Button>
              </>
            ) : (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setCrearNuevoCliente(false)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Buscar existente
                </Button>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input value={formData.nuevoCliente.nombre} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, nombre: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ap. Paterno *</Label>
                    <Input value={formData.nuevoCliente.apellido_paterno} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_paterno: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ap. Materno</Label>
                    <Input value={formData.nuevoCliente.apellido_materno} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_materno: e.target.value } })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono *</Label>
                    <Input value={formData.nuevoCliente.telefono} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, telefono: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={formData.nuevoCliente.email} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, email: e.target.value } })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo documento</Label>
                    <Select value={formData.nuevoCliente.tipo_documento} onValueChange={(v) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, tipo_documento: v } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INE">INE</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="Licencia">Licencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número documento</Label>
                    <Input value={formData.nuevoCliente.numero_documento} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, numero_documento: e.target.value } })} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 - CONFIRMACIÓN */}
        {step === 4 && (
          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-3 space-y-4">
              {/* Resumen de reserva */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <BedDouble className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-bold text-lg">Habitación {selectedHabitacion?.numero}</p>
                        <p className="text-sm text-muted-foreground">{selectedTipo?.nombre}</p>
                      </div>
                    </div>
                    <Badge variant={origen === 'Recepcion' ? 'default' : 'secondary'} className={origen === 'Recepcion' ? 'bg-green-600' : ''}>
                      {origen === 'Recepcion' ? 'Check-in Directo' : 'Reserva'}
                    </Badge>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Check-in</p><p className="font-medium">{format(formData.fechaCheckin, 'd MMM yyyy', { locale: es })}</p></div>
                    <div><p className="text-muted-foreground">Check-out</p><p className="font-medium">{format(formData.fechaCheckout, 'd MMM yyyy', { locale: es })}</p></div>
                    <div><p className="text-muted-foreground">Noches</p><p className="font-medium">{noches}</p></div>
                    <div><p className="text-muted-foreground">Huéspedes</p><p className="font-medium">{formData.adultos + formData.ninos}</p></div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {(formData.clienteData?.nombre || formData.nuevoCliente.nombre)?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{formData.clienteData?.nombre || formData.nuevoCliente.nombre} {formData.clienteData?.apellido_paterno || formData.nuevoCliente.apellido_paterno}</p>
                      <p className="text-sm text-muted-foreground">{formData.clienteData?.telefono || formData.nuevoCliente.telefono}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Solicitudes especiales</Label>
                  <Textarea rows={2} value={formData.solicitudesEspeciales} onChange={(e) => setFormData({ ...formData, solicitudesEspeciales: e.target.value })} placeholder="Cuna, piso alto..." />
                </div>
                <div className="space-y-2">
                  <Label>Notas internas</Label>
                  <Textarea rows={2} value={formData.notasInternas} onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })} placeholder="Para staff..." />
                </div>
              </div>

              {/* Entregables - Solo para Recepción */}
              {origen === 'Recepcion' && entregables.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <Label className="flex items-center gap-2 mb-3"><Package className="h-4 w-4" /> Entregables</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {entregables.map(ent => (
                        <div key={ent.id} className="flex items-center space-x-2">
                          <Checkbox id={ent.id} checked={formData.entregablesSeleccionados.includes(ent.id)} onCheckedChange={() => toggleEntregable(ent.id)} />
                          <label htmlFor={ent.id} className="text-sm cursor-pointer">{ent.nombre}</label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cargos extras */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Label className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Cargos Extras</Label>
                  <div className="flex gap-2">
                    <Select value={cargoConcepto} onValueChange={(v) => { setCargoConcepto(v); const c = conceptosCargo.find(x => x.id === v); if (c?.precio_default) setCargoMonto(c.precio_default.toString()); }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Concepto..." /></SelectTrigger>
                      <SelectContent>{conceptosCargo.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="w-20" type="number" placeholder="Cant" value={cargoCantidad} onChange={(e) => setCargoCantidad(e.target.value)} />
                    <Input className="w-28" type="number" placeholder="$" value={cargoMonto} onChange={(e) => setCargoMonto(e.target.value)} />
                    <Button onClick={handleAgregarCargo} disabled={!cargoConcepto}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {formData.cargos.map(c => (
                    <div key={c.id} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                      <span className="text-sm">{c.concepto_nombre} x{c.cantidad}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${c.total.toLocaleString()}</span>
                        <Button variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, cargos: p.cargos.filter(x => x.id !== c.id) }))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Descuento */}
              <Card>
                <CardContent className="p-4">
                  <Label className="mb-3 block">Descuento</Label>
                  <div className="flex gap-4">
                    <Select value={formData.descuentoTipo} onValueChange={(v) => setFormData({ ...formData, descuentoTipo: v as any, descuentoValor: 0 })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin descuento</SelectItem>
                        <SelectItem value="Monto">Monto fijo</SelectItem>
                        <SelectItem value="Porcentaje">Porcentaje</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.descuentoTipo !== 'none' && (
                      <div className="relative">
                        {formData.descuentoTipo === 'Porcentaje' ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" /> : <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />}
                        <Input type="number" className="pl-9 w-32" value={formData.descuentoValor} onChange={(e) => setFormData({ ...formData, descuentoValor: parseFloat(e.target.value) || 0 })} />
                      </div>
                    )}
                    {descuentoMonto > 0 && <span className="text-green-600 font-medium self-center">-${descuentoMonto.toLocaleString()}</span>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* COLUMNA DERECHA - TOTALES Y PAGOS */}
            <div className="col-span-2">
              <Card className="bg-primary text-primary-foreground sticky top-0">
                <CardContent className="p-4 space-y-4">
                  <p className="font-bold text-lg">Resumen de Cuenta</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between opacity-80">
                      <span>Hospedaje ({noches} {noches === 1 ? 'noche' : 'noches'})</span>
                      <span>${subtotalHospedaje.toLocaleString()}</span>
                    </div>
                    {totalPersonaExtra > 0 && (
                      <div className="flex justify-between opacity-80">
                        <span>Persona extra ({formData.personasExtra})</span>
                        <span>${totalPersonaExtra.toLocaleString()}</span>
                      </div>
                    )}
                    {totalCargosExtras > 0 && (
                      <div className="flex justify-between opacity-80">
                        <span>Cargos extras ({formData.cargos.length})</span>
                        <span>${totalCargosExtras.toLocaleString()}</span>
                      </div>
                    )}
                    {descuentoMonto > 0 && (
                      <div className="flex justify-between text-green-300">
                        <span>Descuento</span>
                        <span>-${descuentoMonto.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between opacity-80">
                      <span>IVA (16%)</span>
                      <span>${impuestos.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <Separator className="bg-primary-foreground/20" />
                  
                  <div className="flex justify-between font-bold text-2xl">
                    <span>Total</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                  
                  <Separator className="bg-primary-foreground/20" />
                  
                  {/* Pagos */}
                  <div className="space-y-3">
                    <Label className="text-primary-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Pagos
                    </Label>
                    
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Monto" 
                        className="bg-primary-foreground/10 border-primary-foreground/20 flex-1 placeholder:text-primary-foreground/50" 
                        value={pagoMonto} 
                        onChange={(e) => setPagoMonto(e.target.value)} 
                      />
                      <Select value={pagoMetodo} onValueChange={setPagoMetodo}>
                        <SelectTrigger className="w-32 bg-primary-foreground/10 border-primary-foreground/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                          <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="Transferencia">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="secondary" onClick={handleAgregarPago}><Plus className="h-4 w-4" /></Button>
                    </div>
                    
                    {formData.pagos.length > 0 && (
                      <div className="space-y-2">
                        {formData.pagos.map(p => (
                          <div key={p.id} className="flex justify-between items-center py-2 px-3 bg-primary-foreground/10 rounded">
                            <span className="text-sm">{p.metodo_pago}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">${p.monto.toLocaleString()}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-primary-foreground/20" onClick={() => handleEliminarPago(p.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="p-3 rounded-lg bg-primary-foreground/10 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Pagado:</span>
                        <span>${totalPagado.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Saldo pendiente:</span>
                        <span className={saldoPendiente <= 0 ? 'text-green-300' : 'text-yellow-300'}>${saldoPendiente.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 1 ? () => onOpenChange(false) : handleBack}>
            {step === 1 ? 'Cancelar' : <><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</>}
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext} disabled={(step === 1 && noches < 1) || (step === 2 && !formData.habitacionId) || (step === 3 && !formData.clienteId && !formData.nuevoCliente.nombre)}>
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={loading} size="lg" className={origen === 'Recepcion' ? 'bg-green-600 hover:bg-green-700' : ''}>
              {loading ? 'Procesando...' : <><Check className="mr-2 h-4 w-4" /> {origen === 'Recepcion' ? 'Completar Check-in' : 'Confirmar Reserva'}</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
