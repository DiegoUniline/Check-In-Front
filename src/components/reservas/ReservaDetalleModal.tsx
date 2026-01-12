import { useState } from 'react';
import { 
  Calendar, User, BedDouble, CreditCard, DoorOpen, DoorClosed, 
  Clock, Phone, Mail, FileText, AlertCircle, Check, Printer,
  Plus, Minus, Pencil, Receipt
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Reserva, mockHabitaciones, mockProductos } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReservaDetalleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: Reserva | null;
}

interface Cargo {
  id: string;
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  fecha: Date;
}

export function ReservaDetalleModal({ open, onOpenChange, reserva }: ReservaDetalleModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('resumen');
  const [processingCheckin, setProcessingCheckin] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  
  // Check-in state
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [tarjetaRegistrada, setTarjetaRegistrada] = useState(false);
  const [firmaDigital, setFirmaDigital] = useState(false);
  const [habitacionAsignada, setHabitacionAsignada] = useState(reserva?.habitacionId || '');
  const [huéspedesExtra, setHuéspedesExtra] = useState(0);
  
  // Payment state
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  
  // Cargos
  const [cargos] = useState<Cargo[]>([
    { id: '1', concepto: 'Minibar - Agua', cantidad: 2, precioUnitario: 25, total: 50, fecha: new Date() },
    { id: '2', concepto: 'Room Service', cantidad: 1, precioUnitario: 150, total: 150, fecha: new Date() },
  ]);
  
  // Checkout state
  const [habitacionInspeccionada, setHabitacionInspeccionada] = useState(false);
  const [llaveDevuelta, setLlaveDevuelta] = useState(false);
  const [dañosReportados, setDañosReportados] = useState(false);

  if (!reserva) return null;

  const noches = differenceInDays(reserva.fechaCheckout, reserva.fechaCheckin);
  const habitacionesDisponibles = mockHabitaciones.filter(
    h => h.tipoId === reserva.tipoHabitacionId && 
    (h.estadoHabitacion === 'Disponible' || h.id === reserva.habitacionId) &&
    h.estadoLimpieza === 'Limpia'
  );

  const totalCargosExtra = cargos.reduce((sum, c) => sum + c.total, 0);
  const totalGeneral = reserva.total + totalCargosExtra;
  const saldoPendiente = totalGeneral - reserva.totalPagado;
  const porcentajePagado = (reserva.totalPagado / totalGeneral) * 100;

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      'Pendiente': 'bg-muted text-muted-foreground',
      'Confirmada': 'bg-primary',
      'CheckIn': 'bg-success',
      'CheckOut': 'bg-slate-500',
      'Cancelada': 'bg-destructive',
      'NoShow': 'bg-warning text-warning-foreground',
    };
    return <Badge className={colors[estado]}>{estado}</Badge>;
  };

  const handleCheckin = async () => {
    if (!documentoVerificado || !tarjetaRegistrada || !firmaDigital || !habitacionAsignada) {
      toast({
        title: 'Faltan requisitos',
        description: 'Complete todos los campos obligatorios para el check-in',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingCheckin(true);
    await new Promise(r => setTimeout(r, 1500));
    
    toast({
      title: '✓ Check-in completado',
      description: `Habitación ${habitacionesDisponibles.find(h => h.id === habitacionAsignada)?.numero} asignada`,
    });
    setProcessingCheckin(false);
    onOpenChange(false);
  };

  const handleCheckout = async () => {
    if (!habitacionInspeccionada || !llaveDevuelta) {
      toast({
        title: 'Faltan verificaciones',
        description: 'Complete la inspección y devolución de llaves',
        variant: 'destructive',
      });
      return;
    }
    
    if (saldoPendiente > 0) {
      toast({
        title: 'Saldo pendiente',
        description: `El huésped debe liquidar $${saldoPendiente.toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingCheckout(true);
    await new Promise(r => setTimeout(r, 1500));
    
    toast({
      title: '✓ Check-out completado',
      description: 'Habitación liberada exitosamente',
    });
    setProcessingCheckout(false);
    onOpenChange(false);
  };

  const handleAbonar = () => {
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: 'Monto inválido',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Pago registrado',
      description: `Se abonaron $${monto.toFixed(2)} con ${metodoPago}`,
    });
    setMontoAbono('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl">
                Reserva #{reserva.numeroReserva}
              </DialogTitle>
              {getEstadoBadge(reserva.estado)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1" /> Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Progress for Check-in */}
        {reserva.estado === 'Confirmada' && (
          <Card className="bg-primary/5 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium flex items-center gap-2">
                  <DoorOpen className="h-4 w-4" /> Proceso de Check-in
                </span>
                <span className="text-sm text-muted-foreground">
                  {[documentoVerificado, tarjetaRegistrada, firmaDigital, !!habitacionAsignada].filter(Boolean).length}/4 pasos
                </span>
              </div>
              <Progress 
                value={[documentoVerificado, tarjetaRegistrada, firmaDigital, !!habitacionAsignada].filter(Boolean).length * 25} 
                className="h-2"
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
                <TabsTrigger value="huesped">Huésped</TabsTrigger>
                <TabsTrigger value="cargos">Cargos</TabsTrigger>
                <TabsTrigger value="pagos">Pagos</TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="space-y-4 mt-4">
                {/* Reservation Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Detalles de Estancia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-in</Label>
                      <p className="font-medium">{format(reserva.fechaCheckin, "EEE d MMM yyyy", { locale: es })}</p>
                      <p className="text-sm text-muted-foreground">Desde las 15:00</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-out</Label>
                      <p className="font-medium">{format(reserva.fechaCheckout, "EEE d MMM yyyy", { locale: es })}</p>
                      <p className="text-sm text-muted-foreground">Hasta las 12:00</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Noches</Label>
                      <p className="font-medium">{noches} noches</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Huéspedes</Label>
                      <p className="font-medium">{reserva.adultos} adultos, {reserva.ninos} niños</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Room Assignment */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BedDouble className="h-4 w-4" /> Habitación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{reserva.tipoHabitacion.nombre}</p>
                        <p className="text-sm text-muted-foreground">{reserva.tipoHabitacion.descripcion}</p>
                      </div>
                      {reserva.habitacion ? (
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {reserva.habitacion.numero}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Sin asignar</Badge>
                      )}
                    </div>
                    
                    {reserva.estado === 'Confirmada' && (
                      <div className="mt-4 p-3 rounded-lg bg-muted">
                        <Label className="text-sm mb-2 block">Asignar Habitación *</Label>
                        <Select value={habitacionAsignada} onValueChange={setHabitacionAsignada}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar habitación" />
                          </SelectTrigger>
                          <SelectContent>
                            {habitacionesDisponibles.map(hab => (
                              <SelectItem key={hab.id} value={hab.id}>
                                {hab.numero} - {hab.tipo.nombre} (Piso {hab.piso})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {reserva.solicitudesEspeciales && (
                  <Card className="border-warning bg-warning/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Solicitudes Especiales</p>
                          <p className="text-sm text-muted-foreground">{reserva.solicitudesEspeciales}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Check-in Requirements */}
                {reserva.estado === 'Confirmada' && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Verificaciones Check-in</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="documento" 
                          checked={documentoVerificado}
                          onCheckedChange={(c) => setDocumentoVerificado(!!c)}
                        />
                        <label htmlFor="documento" className="text-sm cursor-pointer">
                          Documento de identidad verificado
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="tarjeta" 
                          checked={tarjetaRegistrada}
                          onCheckedChange={(c) => setTarjetaRegistrada(!!c)}
                        />
                        <label htmlFor="tarjeta" className="text-sm cursor-pointer">
                          Tarjeta de crédito/garantía registrada
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="firma" 
                          checked={firmaDigital}
                          onCheckedChange={(c) => setFirmaDigital(!!c)}
                        />
                        <label htmlFor="firma" className="text-sm cursor-pointer">
                          Firma de registro completada
                        </label>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div>
                        <Label className="text-sm">Huéspedes adicionales</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setHuéspedesExtra(Math.max(0, huéspedesExtra - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{huéspedesExtra}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setHuéspedesExtra(huéspedesExtra + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Check-out Verifications */}
                {reserva.estado === 'CheckIn' && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Verificaciones Check-out</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="inspeccion" 
                          checked={habitacionInspeccionada}
                          onCheckedChange={(c) => setHabitacionInspeccionada(!!c)}
                        />
                        <label htmlFor="inspeccion" className="text-sm cursor-pointer">
                          Habitación inspeccionada
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="llave" 
                          checked={llaveDevuelta}
                          onCheckedChange={(c) => setLlaveDevuelta(!!c)}
                        />
                        <label htmlFor="llave" className="text-sm cursor-pointer">
                          Llaves devueltas
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id="daños" 
                          checked={dañosReportados}
                          onCheckedChange={(c) => setDañosReportados(!!c)}
                        />
                        <label htmlFor="daños" className="text-sm cursor-pointer text-destructive">
                          Reportar daños a la habitación
                        </label>
                      </div>
                      
                      {dañosReportados && (
                        <Textarea 
                          placeholder="Describa los daños encontrados..."
                          className="mt-2"
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="huesped" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {reserva.cliente.nombre.charAt(0)}{reserva.cliente.apellidoPaterno.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {reserva.cliente.nombre} {reserva.cliente.apellidoPaterno} {reserva.cliente.apellidoMaterno}
                        </h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={reserva.cliente.esVip ? 'default' : 'secondary'}>
                            {reserva.cliente.nivelLealtad}
                          </Badge>
                          {reserva.cliente.esVip && <Badge className="bg-warning text-warning-foreground">VIP</Badge>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{reserva.cliente.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{reserva.cliente.telefono}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{reserva.cliente.tipoDocumento}: {reserva.cliente.numeroDocumento}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Nacionalidad: </span>
                        <span className="text-sm">{reserva.cliente.nacionalidad}</span>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xl font-bold text-primary">{reserva.cliente.totalEstancias}</p>
                        <p className="text-xs text-muted-foreground">Estancias previas</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xl font-bold text-primary">$24,500</p>
                        <p className="text-xs text-muted-foreground">Gasto total</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xl font-bold text-primary">4.8</p>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cargos" className="mt-4">
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Cargos a la Habitación</CardTitle>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Agregar Cargo
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {/* Hospedaje */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <div>
                          <p className="font-medium">Hospedaje - {reserva.tipoHabitacion.nombre}</p>
                          <p className="text-sm text-muted-foreground">{noches} noches x ${reserva.tarifaNoche}</p>
                        </div>
                        <p className="font-medium">${reserva.subtotalHospedaje.toFixed(2)}</p>
                      </div>
                      
                      {/* Extra charges */}
                      {cargos.map(cargo => (
                        <div key={cargo.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{cargo.concepto}</p>
                              <p className="text-sm text-muted-foreground">
                                {cargo.cantidad} x ${cargo.precioUnitario}
                              </p>
                            </div>
                          </div>
                          <p className="font-medium">${cargo.total.toFixed(2)}</p>
                        </div>
                      ))}
                      
                      <Separator className="my-3" />
                      
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${(reserva.subtotalHospedaje + totalCargosExtra).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Impuestos (16%)</span>
                        <span>${reserva.totalImpuestos.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${totalGeneral.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pagos" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Historial de Pagos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Anticipo - Reservación</p>
                          <p className="text-sm text-muted-foreground">
                            {format(reserva.createdAt, "d MMM yyyy", { locale: es })} • Tarjeta
                          </p>
                        </div>
                        <p className="font-medium text-success">+${reserva.totalPagado.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    {/* New payment form */}
                    <div className="space-y-3">
                      <Label>Registrar Nuevo Pago</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input 
                            type="number"
                            placeholder="Monto"
                            value={montoAbono}
                            onChange={(e) => setMontoAbono(e.target.value)}
                          />
                        </div>
                        <Select value={metodoPago} onValueChange={setMetodoPago}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                            <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAbonar}>
                          <CreditCard className="h-4 w-4 mr-1" /> Abonar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Payment Summary */}
          <div className="space-y-4">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Resumen de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm opacity-80">
                    <span>Total Estancia</span>
                    <span>${reserva.subtotalHospedaje.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm opacity-80">
                    <span>Cargos Extra</span>
                    <span>${totalCargosExtra.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm opacity-80">
                    <span>Impuestos (16%)</span>
                    <span>${reserva.totalImpuestos.toFixed(2)}</span>
                  </div>
                  <Separator className="bg-primary-foreground/20" />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Total</span>
                    <span>${totalGeneral.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 rounded-lg bg-primary-foreground/10">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pagado</span>
                    <span>${reserva.totalPagado.toFixed(2)}</span>
                  </div>
                  <Progress value={porcentajePagado} className="h-2 bg-primary-foreground/20" />
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-primary-foreground/10 text-center">
                  <p className="text-sm opacity-80">Saldo Pendiente</p>
                  <p className="text-3xl font-bold">${saldoPendiente.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            {reserva.estado === 'Confirmada' && (
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleCheckin}
                disabled={processingCheckin}
              >
                {processingCheckin ? (
                  <>Procesando...</>
                ) : (
                  <>
                    <DoorOpen className="h-5 w-5 mr-2" />
                    Completar Check-in
                  </>
                )}
              </Button>
            )}

            {reserva.estado === 'CheckIn' && (
              <>
                <Button 
                  className="w-full bg-success hover:bg-success/90" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={processingCheckout || saldoPendiente > 0}
                >
                  {processingCheckout ? (
                    <>Procesando...</>
                  ) : (
                    <>
                      <DoorClosed className="h-5 w-5 mr-2" />
                      Completar Check-out
                    </>
                  )}
                </Button>
                {saldoPendiente > 0 && (
                  <p className="text-xs text-center text-destructive">
                    * Debe liquidar el saldo pendiente
                  </p>
                )}
              </>
            )}

            <Button variant="outline" className="w-full">
              Cancelar Proceso
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
