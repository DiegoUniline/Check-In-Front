import { useState, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarDays, Users, Search, BedDouble, Check, ChevronRight, ChevronLeft, 
  CalendarPlus, UserPlus, Clock, Percent, DollarSign, Package
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
  metodoPago: string;
  anticipo: number;
  // Entregables seleccionados
  entregablesSeleccionados: string[];
}

const initialFormData: FormData = {
  fechaCheckin: new Date(),
  fechaCheckout: addDays(new Date(), 1),
  horaLlegada: '15:00',
  adultos: 2,
  ninos: 0,
  personasExtra: 0,
  cargoPersonaExtra: 250,
  tipoHabitacion: '',
  habitacionId: '',
  clienteId: '',
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
  metodoPago: 'Efectivo',
  anticipo: 0,
  entregablesSeleccionados: [],
};

export function NuevaReservaModal({ open, onOpenChange, preload, onSuccess }: NuevaReservaModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchCliente, setSearchCliente] = useState('');
  const [crearNuevoCliente, setCrearNuevoCliente] = useState(false);
  const [loading, setLoading] = useState(false);
  const [origen, setOrigen] = useState<'Reserva' | 'Recepcion'>('Reserva');
  const { toast } = useToast();

  // Data from API
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [entregables, setEntregables] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open]);

  useEffect(() => {
    if (open && preload) {
      const newFormData = { ...initialFormData };
      if (preload.fechaCheckin) newFormData.fechaCheckin = preload.fechaCheckin;
      if (preload.fechaCheckout) newFormData.fechaCheckout = preload.fechaCheckout;
      if (preload.habitacion) {
        newFormData.habitacionId = preload.habitacion.id;
        newFormData.tipoHabitacion = preload.habitacion.tipo_id;
      }
      setFormData(newFormData);
      if (preload.habitacion) setStep(3);
    }
  }, [open, preload]);

  const cargarDatos = async () => {
    try {
      const [tiposData, entregablesData] = await Promise.all([
        api.getTiposHabitacion(),
        api.getEntregables?.() || Promise.resolve([])
      ]);
      setTiposHabitacion(tiposData);
      setEntregables(entregablesData);
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
      console.error('Error buscando habitaciones:', error);
      try {
        const data = await api.getHabitaciones({ estado_habitacion: 'Disponible' });
        setHabitacionesDisponibles(data.filter((h: any) => 
          !formData.tipoHabitacion || h.tipo_id === formData.tipoHabitacion
        ));
      } catch (e) {
        console.error('Error fallback:', e);
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
      console.error('Error buscando clientes:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarClientes(searchCliente);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchCliente]);

  // Cálculos
  const noches = differenceInDays(formData.fechaCheckout, formData.fechaCheckin);
  const selectedHabitacion = habitacionesDisponibles.find(h => h.id === formData.habitacionId);
  const selectedTipo = tiposHabitacion.find(t => t.id === formData.tipoHabitacion) || 
    (selectedHabitacion ? { precio_base: selectedHabitacion.precio_base, nombre: selectedHabitacion.tipo_nombre } : null);
  const selectedCliente = clientes.find(c => c.id === formData.clienteId);

  const tarifaNoche = selectedTipo?.precio_base || 0;
  const subtotalHospedaje = tarifaNoche * noches;
  const totalPersonaExtra = formData.personasExtra * formData.cargoPersonaExtra * noches;
  const subtotal = subtotalHospedaje + totalPersonaExtra;
  
  let descuentoMonto = 0;
if (formData.descuentoTipo === 'Monto') {
  descuentoMonto = formData.descuentoValor;
} else if (formData.descuentoTipo === 'Porcentaje') {
  descuentoMonto = subtotal * (formData.descuentoValor / 100);
}
  
  const subtotalConDescuento = subtotal - descuentoMonto;
  const impuestos = subtotalConDescuento * 0.16;
  const total = subtotalConDescuento + impuestos;

  const handleOrigenChange = (nuevoOrigen: 'Reserva' | 'Recepcion') => {
    setOrigen(nuevoOrigen);
    if (nuevoOrigen === 'Recepcion') {
      setFormData({ 
        ...formData, 
        fechaCheckin: new Date(), 
        fechaCheckout: addDays(new Date(), 1) 
      });
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      await buscarHabitaciones();
    }
    if (step < 4) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
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

      // Si es Recepción, hacer check-in automático
      if (origen === 'Recepcion' && formData.habitacionId) {
        await api.checkin(reserva.id, formData.habitacionId);
        
        // Asignar entregables seleccionados
        for (const entregableId of formData.entregablesSeleccionados) {
          await api.asignarEntregable?.(reserva.id, { entregable_id: entregableId, cantidad: 1 });
        }
      }

      if (formData.anticipo > 0) {
        await api.createPago({
          reserva_id: reserva.id,
          monto: formData.anticipo,
          metodo_pago: formData.metodoPago,
          concepto: origen === 'Recepcion' ? 'Pago en recepción' : 'Anticipo de reserva',
        });
      }

      toast({
        title: origen === 'Recepcion' ? '✅ Huésped registrado' : '¡Reserva creada!',
        description: origen === 'Recepcion' 
          ? `Habitación ${selectedHabitacion?.numero} - Check-in completado`
          : `Reserva #${reserva.numero_reserva || reserva.id.slice(0, 8)} confirmada`,
      });

      onOpenChange(false);
      setStep(1);
      setFormData(initialFormData);
      setCrearNuevoCliente(false);
      setOrigen('Reserva');
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo procesar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setFormData(initialFormData);
    setCrearNuevoCliente(false);
    setSearchCliente('');
    setOrigen('Reserva');
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
  const isQuickCreate = preload?.habitacion != null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isQuickCreate ? '🚀 Reserva Rápida' : origen === 'Recepcion' ? '🚶 Entrada Directa' : '📅 Nueva Reserva'}
          </DialogTitle>
          <DialogDescription>
            {isQuickCreate ? (
              <>Habitación {selectedHabitacion?.numero} • {format(formData.fechaCheckin, 'd MMM', { locale: es })} - {format(formData.fechaCheckout, 'd MMM', { locale: es })} ({noches} noche{noches !== 1 ? 's' : ''})</>
            ) : (
              <>Paso {step} de 4 - {step === 1 ? 'Fechas y huéspedes' : step === 2 ? 'Habitación' : step === 3 ? 'Huésped' : 'Confirmación'}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isQuickCreate && <Progress value={progressValue} className="h-2 mb-4" />}

        {/* Step 1: Fechas y huéspedes */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Toggle Origen */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                type="button"
                variant={origen === 'Reserva' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => handleOrigenChange('Reserva')}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Reserva
              </Button>
              <Button
                type="button"
                variant={origen === 'Recepcion' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => handleOrigenChange('Recepcion')}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Recepción
              </Button>
            </div>

            {origen === 'Recepcion' && (
              <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-3 text-sm text-amber-800 dark:text-amber-200">
                  🚶 El huésped está presente y se hará check-in automático
                </CardContent>
              </Card>
            )}

            {/* Fechas */}
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
                    <Calendar
                      mode="single"
                      selected={formData.fechaCheckin}
                      onSelect={(date) => date && setFormData({ ...formData, fechaCheckin: date })}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    />
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
                    <Calendar
                      mode="single"
                      selected={formData.fechaCheckout}
                      onSelect={(date) => date && setFormData({ ...formData, fechaCheckout: date })}
                      disabled={(date) => date <= formData.fechaCheckin}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora llegada</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    className="pl-9"
                    value={formData.horaLlegada}
                    onChange={(e) => setFormData({ ...formData, horaLlegada: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Huéspedes */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Adultos</Label>
                <Select value={formData.adultos.toString()} onValueChange={(v) => setFormData({ ...formData, adultos: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Niños</Label>
                <Select value={formData.ninos.toString()} onValueChange={(v) => setFormData({ ...formData, ninos: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pers. extra</Label>
                <Select value={formData.personasExtra.toString()} onValueChange={(v) => setFormData({ ...formData, personasExtra: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cargo extra</Label>
                <Input
                  type="number"
                  value={formData.cargoPersonaExtra}
                  onChange={(e) => setFormData({ ...formData, cargoPersonaExtra: parseFloat(e.target.value) || 0 })}
                  disabled={formData.personasExtra === 0}
                />
              </div>
            </div>

            {/* Tipo habitación */}
            <div className="space-y-2">
              <Label>Tipo de habitación</Label>
              <ComboboxCreatable
                options={tiposHabitacion.map(t => ({ value: t.id, label: `${t.nombre} - $${t.precio_base?.toLocaleString()}/noche` }))}
                value={formData.tipoHabitacion}
                onValueChange={(v) => setFormData({ ...formData, tipoHabitacion: v, habitacionId: '' })}
                onCreate={async (nombre) => {
                  try {
                    const newTipo = await api.createTipoHabitacion({ nombre, precio_base: 1000 });
                    setTiposHabitacion([...tiposHabitacion, newTipo]);
                    toast({ title: 'Tipo creado' });
                    return { value: newTipo.id, label: `${newTipo.nombre} - $${newTipo.precio_base?.toLocaleString()}/noche` };
                  } catch (e: any) {
                    toast({ title: 'Error', description: e.message, variant: 'destructive' });
                  }
                }}
                placeholder="Seleccionar tipo..."
                searchPlaceholder="Buscar o crear..."
                createLabel="Crear tipo"
              />
            </div>

            {/* Resumen */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 grid grid-cols-3 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Noches:</span>
                  <span className="font-medium">{noches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Huéspedes:</span>
                  <span className="font-medium">{formData.adultos + formData.ninos + formData.personasExtra}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant={origen === 'Recepcion' ? 'default' : 'secondary'}>{origen}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Habitación */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{habitacionesDisponibles.length} habitaciones disponibles</p>
            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
              {habitacionesDisponibles.map(hab => (
                <Card
                  key={hab.id}
                  className={cn("cursor-pointer transition-all hover:border-primary", formData.habitacionId === hab.id && "border-primary bg-primary/5")}
                  onClick={() => setFormData({ ...formData, habitacionId: hab.id, tipoHabitacion: hab.tipo_id })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <BedDouble className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Habitación {hab.numero}</span>
                            <Badge variant="outline">{hab.tipo_codigo}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{hab.tipo_nombre}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${hab.precio_base?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">por noche</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {habitacionesDisponibles.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay habitaciones disponibles</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Huésped */}
        {step === 3 && (
          <div className="space-y-4">
            {!crearNuevoCliente ? (
              <>
                <div className="space-y-2">
                  <Label>Buscar cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre, email o teléfono..."
                      className="pl-9"
                      value={searchCliente}
                      onChange={(e) => setSearchCliente(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {clientes.map(cliente => (
                    <Card
                      key={cliente.id}
                      className={cn("cursor-pointer transition-all hover:border-primary", formData.clienteId === cliente.id && "border-primary bg-primary/5")}
                      onClick={() => setFormData({ ...formData, clienteId: cliente.id })}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {cliente.nombre?.charAt(0)}{cliente.apellido_paterno?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{cliente.nombre} {cliente.apellido_paterno}</p>
                            <p className="text-sm text-muted-foreground">{cliente.email || cliente.telefono}</p>
                          </div>
                        </div>
                        {cliente.es_vip && <Badge>VIP</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Separator />
                <Button variant="outline" className="w-full" onClick={() => setCrearNuevoCliente(true)}>
                  + Crear nuevo cliente
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setCrearNuevoCliente(false)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Buscar existente
                </Button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.nuevoCliente.nombre}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, nombre: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido Paterno *</Label>
                    <Input
                      value={formData.nuevoCliente.apellido_paterno}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_paterno: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Apellido Materno</Label>
                    <Input
                      value={formData.nuevoCliente.apellido_materno}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_materno: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono *</Label>
                    <Input
                      value={formData.nuevoCliente.telefono}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, telefono: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.nuevoCliente.email}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, email: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo documento</Label>
                    <Select
                      value={formData.nuevoCliente.tipo_documento}
                      onValueChange={(v) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, tipo_documento: v } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INE">INE</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="Licencia">Licencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Número documento</Label>
                  <Input
                    value={formData.nuevoCliente.numero_documento}
                    onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, numero_documento: e.target.value } })}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmación */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Resumen reserva */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <BedDouble className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Habitación {selectedHabitacion?.numero}</p>
                      <p className="text-sm text-muted-foreground">{selectedTipo?.nombre}</p>
                    </div>
                  </div>
                  <Badge variant={origen === 'Recepcion' ? 'default' : 'secondary'}>{origen}</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Check-in</p>
                    <p className="font-medium">{format(formData.fechaCheckin, 'd MMM', { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Check-out</p>
                    <p className="font-medium">{format(formData.fechaCheckout, 'd MMM', { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Noches</p>
                    <p className="font-medium">{noches}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Huéspedes</p>
                    <p className="font-medium">{formData.adultos}A {formData.ninos}N {formData.personasExtra > 0 && `+${formData.personasExtra}`}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido_paterno}` : `${formData.nuevoCliente.nombre} ${formData.nuevoCliente.apellido_paterno}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedCliente?.telefono || formData.nuevoCliente.telefono}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Solicitudes especiales</Label>
                <Textarea
                  placeholder="Cuna, piso alto..."
                  rows={2}
                  value={formData.solicitudesEspeciales}
                  onChange={(e) => setFormData({ ...formData, solicitudesEspeciales: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas internas (staff)</Label>
                <Textarea
                  placeholder="Observaciones..."
                  rows={2}
                  value={formData.notasInternas}
                  onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })}
                />
              </div>
            </div>

            {/* Entregables (solo si es Recepción) */}
            {origen === 'Recepcion' && entregables.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <Label className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4" /> Entregables
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {entregables.map(ent => (
                      <div key={ent.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={ent.id}
                          checked={formData.entregablesSeleccionados.includes(ent.id)}
                          onCheckedChange={() => toggleEntregable(ent.id)}
                        />
                        <label htmlFor={ent.id} className="text-sm cursor-pointer">{ent.nombre}</label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Descuento */}
            <Card>
              <CardContent className="p-4">
                <Label className="mb-3 block">Descuento</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Select 
                    value={formData.descuentoTipo} 
                    onValueChange={(v) => setFormData({ ...formData, descuentoTipo: v as '' | 'Monto' | 'Porcentaje', descuentoValor: 0 })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin descuento" />
                    </SelectTrigger>
                    <SelectContent>
               <SelectItem value="none">Sin descuento</SelectItem>
                      <SelectItem value="Monto">Monto fijo</SelectItem>
                      <SelectItem value="Porcentaje">Porcentaje</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.descuentoTipo && (
                    <div className="relative">
                      {formData.descuentoTipo === 'Porcentaje' ? (
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        type="number"
                        className="pl-9"
                        value={formData.descuentoValor}
                        onChange={(e) => setFormData({ ...formData, descuentoValor: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                  {descuentoMonto > 0 && (
                    <div className="flex items-center text-sm text-green-600">
                      -${descuentoMonto.toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Totales y Pago */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hospedaje ({noches} noches × ${tarifaNoche.toLocaleString()})</span>
                  <span>${subtotalHospedaje.toLocaleString()}</span>
                </div>
                {totalPersonaExtra > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Persona extra ({formData.personasExtra} × {noches} noches)</span>
                    <span>${totalPersonaExtra.toLocaleString()}</span>
                  </div>
                )}
                {descuentoMonto > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Descuento</span>
                    <span>-${descuentoMonto.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">IVA (16%)</span>
                  <span>${impuestos.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">${total.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Método pago</Label>
                    <Select value={formData.metodoPago} onValueChange={(v) => setFormData({ ...formData, metodoPago: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{origen === 'Recepcion' ? 'Pago' : 'Anticipo'}</Label>
                    <Input
                      type="number"
                      value={formData.anticipo}
                      onChange={(e) => setFormData({ ...formData, anticipo: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 1 ? handleClose : handleBack}>
            {step === 1 ? 'Cancelar' : <><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</>}
          </Button>
          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && noches < 1) || 
                (step === 2 && !formData.habitacionId) || 
                (step === 3 && !formData.clienteId && !formData.nuevoCliente.nombre)
              }
            >
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Procesando...' : <><Check className="mr-2 h-4 w-4" /> {origen === 'Recepcion' ? 'Registrar Entrada' : 'Confirmar Reserva'}</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
