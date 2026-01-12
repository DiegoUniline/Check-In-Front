import { useState, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Users, Search, BedDouble, CreditCard, Check, ChevronRight, ChevronLeft } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { mockTiposHabitacion, mockHabitaciones, mockClientes, TipoHabitacion, Cliente, Habitacion } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export interface ReservationPreload {
  habitacion?: Habitacion;
  fechaCheckin?: Date;
  fechaCheckout?: Date;
}

interface NuevaReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preload?: ReservationPreload;
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
    apellidoPaterno: string;
    apellidoMaterno: string;
    email: string;
    telefono: string;
    tipoDocumento: string;
    numeroDocumento: string;
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
    apellidoPaterno: '',
    apellidoMaterno: '',
    email: '',
    telefono: '',
    tipoDocumento: 'INE',
    numeroDocumento: '',
  },
  solicitudesEspeciales: '',
  metodoPago: 'Tarjeta',
  anticipo: 0,
};

export function NuevaReservaModal({ open, onOpenChange, preload }: NuevaReservaModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchCliente, setSearchCliente] = useState('');
  const [crearNuevoCliente, setCrearNuevoCliente] = useState(false);
  const { toast } = useToast();

  // Handle preload data when modal opens
  useEffect(() => {
    if (open && preload) {
      const newFormData = { ...initialFormData };
      
      if (preload.fechaCheckin) {
        newFormData.fechaCheckin = preload.fechaCheckin;
      }
      if (preload.fechaCheckout) {
        newFormData.fechaCheckout = preload.fechaCheckout;
      }
      if (preload.habitacion) {
        newFormData.habitacionId = preload.habitacion.id;
        newFormData.tipoHabitacion = preload.habitacion.tipoId;
      }
      
      setFormData(newFormData);
      
      // Skip to step 3 if room is preloaded (already selected)
      if (preload.habitacion) {
        setStep(3);
      }
    }
  }, [open, preload]);

  const noches = differenceInDays(formData.fechaCheckout, formData.fechaCheckin);
  
  // Get available rooms for selected type and dates
  const habitacionesDisponibles = mockHabitaciones.filter(h => 
    (formData.tipoHabitacion === '' || h.tipoId === formData.tipoHabitacion) &&
    h.estadoHabitacion === 'Disponible' &&
    h.estadoMantenimiento === 'OK'
  );

  // Get selected room and type
  const selectedHabitacion = mockHabitaciones.find(h => h.id === formData.habitacionId);
  const selectedTipo = mockTiposHabitacion.find(t => t.id === formData.tipoHabitacion) || selectedHabitacion?.tipo;
  const selectedCliente = mockClientes.find(c => c.id === formData.clienteId);

  // Filter clients by search
  const filteredClientes = mockClientes.filter(c => 
    searchCliente === '' ||
    `${c.nombre} ${c.apellidoPaterno} ${c.apellidoMaterno}`.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.email.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.telefono.includes(searchCliente)
  ).slice(0, 5);

  // Calculate totals
  const tarifaNoche = selectedTipo?.precioBase || 0;
  const subtotal = tarifaNoche * noches;
  const impuestos = subtotal * 0.16;
  const total = subtotal + impuestos;

  const handleNext = () => {
    if (step < 4) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleConfirm = () => {
    toast({
      title: '¡Reserva creada!',
      description: `Reserva confirmada para ${selectedCliente?.nombre || formData.nuevoCliente.nombre} - Hab. ${selectedHabitacion?.numero}`,
    });
    onOpenChange(false);
    setStep(1);
    setFormData(initialFormData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setFormData(initialFormData);
    setCrearNuevoCliente(false);
    setSearchCliente('');
  };

  const progressValue = (step / 4) * 100;

  // Determine if we're in "quick create" mode (preloaded from drag)
  const isQuickCreate = preload?.habitacion != null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isQuickCreate ? '🚀 Reserva Rápida' : 'Nueva Reserva'}
          </DialogTitle>
          <DialogDescription>
            {isQuickCreate ? (
              <>
                Habitación {selectedHabitacion?.numero} • {format(formData.fechaCheckin, 'd MMM', { locale: es })} - {format(formData.fechaCheckout, 'd MMM', { locale: es })} ({noches} noche{noches !== 1 ? 's' : ''})
              </>
            ) : (
              <>
                Paso {step} de 4 - {
                  step === 1 ? 'Búsqueda' :
                  step === 2 ? 'Selección de habitación' :
                  step === 3 ? 'Datos del huésped' :
                  'Confirmación'
                }
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isQuickCreate && <Progress value={progressValue} className="h-2 mb-4" />}
        
        {/* Quick create info banner */}
        {isQuickCreate && step === 3 && (
          <Card className="bg-primary/5 border-primary/20 mb-4">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BedDouble className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Hab. {selectedHabitacion?.numero} - {selectedHabitacion?.tipo.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {format(formData.fechaCheckin, 'd MMM yyyy', { locale: es })} → {format(formData.fechaCheckout, 'd MMM yyyy', { locale: es })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">${(selectedHabitacion?.tipo.precioBase || 0) * noches}</p>
                <p className="text-xs text-muted-foreground">{noches} noche{noches !== 1 ? 's' : ''}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Search */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Check-in date */}
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

              {/* Check-out date */}
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

            {/* Guests */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adultos</Label>
                <Select 
                  value={formData.adultos.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, adultos: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Niños</Label>
                <Select 
                  value={formData.ninos.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, ninos: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Room type */}
            <div className="space-y-2">
              <Label>Tipo de habitación</Label>
              <Select 
                value={formData.tipoHabitacion} 
                onValueChange={(v) => setFormData({ ...formData, tipoHabitacion: v, habitacionId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {mockTiposHabitacion.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre} - ${tipo.precioBase.toLocaleString()}/noche
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
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

        {/* Step 2: Room selection */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {habitacionesDisponibles.length} habitaciones disponibles
            </p>

            <div className="grid gap-3 max-h-[400px] overflow-y-auto">
              {habitacionesDisponibles.map(hab => (
                <Card 
                  key={hab.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary",
                    formData.habitacionId === hab.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setFormData({ ...formData, habitacionId: hab.id, tipoHabitacion: hab.tipoId })}
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
                            <Badge variant="outline">{hab.tipo.codigo}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{hab.tipo.nombre}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${hab.tipo.precioBase.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">por noche</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {hab.tipo.amenidades.slice(0, 4).map(a => (
                        <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                      ))}
                      {hab.tipo.amenidades.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{hab.tipo.amenidades.length - 4}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Guest data */}
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
                  {filteredClientes.map(cliente => (
                    <Card 
                      key={cliente.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary",
                        formData.clienteId === cliente.id && "border-primary bg-primary/5"
                      )}
                      onClick={() => setFormData({ ...formData, clienteId: cliente.id })}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {cliente.nombre.charAt(0)}{cliente.apellidoPaterno.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{cliente.nombre} {cliente.apellidoPaterno}</p>
                            <p className="text-sm text-muted-foreground">{cliente.email}</p>
                          </div>
                        </div>
                        {cliente.esVip && <Badge>VIP</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCrearNuevoCliente(true)}
                >
                  + Crear nuevo cliente
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCrearNuevoCliente(false)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Buscar existente
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input 
                      value={formData.nuevoCliente.nombre}
                      onChange={(e) => setFormData({
                        ...formData,
                        nuevoCliente: { ...formData.nuevoCliente, nombre: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido Paterno *</Label>
                    <Input 
                      value={formData.nuevoCliente.apellidoPaterno}
                      onChange={(e) => setFormData({
                        ...formData,
                        nuevoCliente: { ...formData.nuevoCliente, apellidoPaterno: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input 
                      type="email"
                      value={formData.nuevoCliente.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        nuevoCliente: { ...formData.nuevoCliente, email: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input 
                      value={formData.nuevoCliente.telefono}
                      onChange={(e) => setFormData({
                        ...formData,
                        nuevoCliente: { ...formData.nuevoCliente, telefono: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de documento</Label>
                    <Select 
                      value={formData.nuevoCliente.tipoDocumento}
                      onValueChange={(v) => setFormData({
                        ...formData,
                        nuevoCliente: { ...formData.nuevoCliente, tipoDocumento: v }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                      value={formData.nuevoCliente.numeroDocumento}
                      onChange={(e) => setFormData({
                        ...formData,
                        nuevoCliente: { ...formData.nuevoCliente, numeroDocumento: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Reservation summary */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <BedDouble className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Habitación {selectedHabitacion?.numero}</p>
                    <p className="text-sm text-muted-foreground">{selectedTipo?.nombre}</p>
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
                      {selectedCliente 
                        ? `${selectedCliente.nombre} ${selectedCliente.apellidoPaterno}`
                        : `${formData.nuevoCliente.nombre} ${formData.nuevoCliente.apellidoPaterno}`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCliente?.email || formData.nuevoCliente.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Special requests */}
            <div className="space-y-2">
              <Label>Solicitudes especiales</Label>
              <Textarea 
                placeholder="Cuna, cama extra, piso alto, etc."
                value={formData.solicitudesEspeciales}
                onChange={(e) => setFormData({ ...formData, solicitudesEspeciales: e.target.value })}
              />
            </div>

            {/* Payment */}
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
                    <Select 
                      value={formData.metodoPago}
                      onValueChange={(v) => setFormData({ ...formData, metodoPago: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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

        {/* Footer actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={step === 1 ? handleClose : handleBack}
          >
            {step === 1 ? 'Cancelar' : (
              <>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </>
            )}
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
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirm}>
              <Check className="mr-2 h-4 w-4" />
              Confirmar Reserva
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}