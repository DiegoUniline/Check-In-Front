import { useState, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Users, Search, BedDouble, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

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
  adultos: number;
  ninos: number;
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
  metodoPago: string;
  anticipo: number;
}

const initialFormData: FormData = {
  fechaCheckin: new Date(),
  fechaCheckout: addDays(new Date(), 1),
  adultos: 2,
  ninos: 0,
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
  metodoPago: 'Tarjeta',
  anticipo: 0,
};

export function NuevaReservaModal({ open, onOpenChange, preload, onSuccess }: NuevaReservaModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchCliente, setSearchCliente] = useState('');
  const [crearNuevoCliente, setCrearNuevoCliente] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      cargarTipos();
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
        setHabitacionesDisponibles([preload.habitacion]);
      }
      setFormData(newFormData);
      if (preload.habitacion) setStep(3);
    }
  }, [open, preload]);

  const cargarTipos = async () => {
    try {
      const data = await api.getTiposHabitacion();
      setTiposHabitacion(data);
    } catch (error) {
      console.error('Error cargando tipos:', error);
    }
  };

  const buscarHabitaciones = async () => {
    try {
      const data = await api.getHabitaciones({ estado_habitacion: 'Disponible' });
      const filtered = data.filter((h: any) => 
        (!formData.tipoHabitacion || h.tipo_id === formData.tipoHabitacion) &&
        h.estado_limpieza === 'Limpia' &&
        h.estado_mantenimiento === 'OK'
      );
      setHabitacionesDisponibles(filtered);
    } catch (error) {
      console.error('Error buscando habitaciones:', error);
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

  const noches = differenceInDays(formData.fechaCheckout, formData.fechaCheckin);
  const selectedHabitacion = habitacionesDisponibles.find(h => h.id === formData.habitacionId);
  const selectedTipo = tiposHabitacion.find(t => t.id === formData.tipoHabitacion) || 
    (selectedHabitacion ? { precio_base: selectedHabitacion.precio_base, nombre: selectedHabitacion.tipo_nombre } : null);
  const selectedCliente = clientes.find(c => c.id === formData.clienteId);

  const tarifaNoche = selectedTipo?.precio_base || selectedHabitacion?.precio_base || 0;
  const subtotal = tarifaNoche * noches;
  const impuestos = subtotal * 0.16;
  const total = subtotal + impuestos;

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
        tipo_habitacion_id: formData.tipoHabitacion || selectedHabitacion?.tipo_id,
        fecha_checkin: format(formData.fechaCheckin, 'yyyy-MM-dd'),
        fecha_checkout: format(formData.fechaCheckout, 'yyyy-MM-dd'),
        adultos: formData.adultos,
        ninos: formData.ninos,
        solicitudes_especiales: formData.solicitudesEspeciales,
        tarifa_noche: tarifaNoche,
      };

      const reserva = await api.createReserva(reservaData);

      if (formData.anticipo > 0) {
        await api.createPago({
          reserva_id: reserva.id,
          monto: formData.anticipo,
          metodo_pago: formData.metodoPago,
          concepto: 'Anticipo de reserva',
        });
      }

      toast({
        title: '¡Reserva creada!',
        description: `Reserva #${reserva.numero_reserva || reserva.id.slice(0, 8)} confirmada`,
      });

      onOpenChange(false);
      setStep(1);
      setFormData(initialFormData);
      setCrearNuevoCliente(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo crear la reserva', variant: 'destructive' });
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
  };

  const progressValue = (step / 4) * 100;
  const isQuickCreate = preload?.habitacion != null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isQuickCreate ? '🚀 Reserva Rápida' : 'Nueva Reserva'}</DialogTitle>
          <DialogDescription>
            {isQuickCreate ? (
              <>Habitación {selectedHabitacion?.numero} • {format(formData.fechaCheckin, 'd MMM', { locale: es })} - {format(formData.fechaCheckout, 'd MMM', { locale: es })} ({noches} noche{noches !== 1 ? 's' : ''})</>
            ) : (
              <>Paso {step} de 4 - {step === 1 ? 'Búsqueda' : step === 2 ? 'Selección de habitación' : step === 3 ? 'Datos del huésped' : 'Confirmación'}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isQuickCreate && <Progress value={progressValue} className="h-2 mb-4" />}

        {isQuickCreate && step === 3 && selectedHabitacion && (
          <Card className="bg-primary/5 border-primary/20 mb-4">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BedDouble className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Hab. {selectedHabitacion.numero} - {selectedHabitacion.tipo_nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {format(formData.fechaCheckin, 'd MMM yyyy', { locale: es })} → {format(formData.fechaCheckout, 'd MMM yyyy', { locale: es })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">${((selectedHabitacion.precio_base || 0) * noches).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{noches} noche{noches !== 1 ? 's' : ''}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(formData.fechaCheckin, 'd MMM yyyy', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.fechaCheckin}
                      onSelect={(date) => date && setFormData({ ...formData, fechaCheckin: date })}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Fecha Check-out</Label>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label>Tipo de habitación</Label>
              <Select value={formData.tipoHabitacion} onValueChange={(v) => setFormData({ ...formData, tipoHabitacion: v, habitacionId: '' })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposHabitacion.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre} - ${tipo.precio_base?.toLocaleString()}/noche
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Noches:</span>
                  <span className="font-medium">{noches}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Huéspedes:</span>
                  <span className="font-medium">{formData.adultos} adultos, {formData.ninos} niños</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2 */}
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

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            {!crearNuevoCliente ? (
              <>
                <div className="space-y-2">
                  <Label>Buscar cliente existente</Label>
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
                <div className="space-y-2">
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
                            <p className="text-sm text-muted-foreground">{cliente.email}</p>
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
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.nuevoCliente.email}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, email: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={formData.nuevoCliente.telefono}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, telefono: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de documento</Label>
                    <Select
                      value={formData.nuevoCliente.tipo_documento}
                      onValueChange={(v) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, tipo_documento: v } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INE">INE</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="Licencia">Licencia de conducir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de documento</Label>
                    <Input
                      value={formData.nuevoCliente.numero_documento}
                      onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, numero_documento: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <BedDouble className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Habitación {selectedHabitacion?.numero}</p>
                    <p className="text-sm text-muted-foreground">{selectedTipo?.nombre || selectedHabitacion?.tipo_nombre}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Check-in</p>
                    <p className="font-medium">{format(formData.fechaCheckin, 'd MMM yyyy', { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Check-out</p>
                    <p className="font-medium">{format(formData.fechaCheckout, 'd MMM yyyy', { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Noches</p>
                    <p className="font-medium">{noches}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Huéspedes</p>
                    <p className="font-medium">{formData.adultos + formData.ninos}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido_paterno}` : `${formData.nuevoCliente.nombre} ${formData.nuevoCliente.apellido_paterno}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedCliente?.email || formData.nuevoCliente.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Solicitudes especiales</Label>
              <Textarea
                placeholder="Cuna, cama extra, piso alto, etc."
                value={formData.solicitudesEspeciales}
                onChange={(e) => setFormData({ ...formData, solicitudesEspeciales: e.target.value })}
              />
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({noches} noches)</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
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
                    <Label>Método de pago</Label>
                    <Select value={formData.metodoPago} onValueChange={(v) => setFormData({ ...formData, metodoPago: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Anticipo</Label>
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
              disabled={(step === 1 && noches < 1) || (step === 2 && !formData.habitacionId) || (step === 3 && !formData.clienteId && !formData.nuevoCliente.nombre)}
            >
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Guardando...' : <><Check className="mr-2 h-4 w-4" /> Confirmar Reserva</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
