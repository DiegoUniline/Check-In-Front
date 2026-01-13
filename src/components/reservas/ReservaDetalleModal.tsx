import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, BedDouble, CreditCard, DoorOpen, DoorClosed, Phone, Mail, AlertCircle, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface ReservaDetalleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: any;
  onUpdate?: () => void;
}

export function ReservaDetalleModal({ open, onOpenChange, reserva, onUpdate }: ReservaDetalleModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('resumen');
  const [processing, setProcessing] = useState(false);
  
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [tarjetaRegistrada, setTarjetaRegistrada] = useState(false);
  const [firmaDigital, setFirmaDigital] = useState(false);
  
  const [habitacionInspeccionada, setHabitacionInspeccionada] = useState(false);
  const [llaveDevuelta, setLlaveDevuelta] = useState(false);
  
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');

  if (!reserva) return null;

  const noches = reserva.noches || differenceInDays(new Date(reserva.fecha_checkout), new Date(reserva.fecha_checkin));
  const tarifaNoche = parseFloat(reserva.tarifa_noche) || 0;
  const subtotal = tarifaNoche * noches;
  const impuestos = subtotal * 0.16;
  const total = parseFloat(reserva.total) || (subtotal + impuestos);
  const pagado = parseFloat(reserva.total_pagado) || 0;
  const saldoPendiente = parseFloat(reserva.saldo_pendiente) || (total - pagado);
  const porcentajePagado = total > 0 ? (pagado / total) * 100 : 0;

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      'Pendiente': 'bg-muted text-muted-foreground',
      'Confirmada': 'bg-primary',
      'CheckIn': 'bg-success',
      'CheckOut': 'bg-slate-500',
      'Cancelada': 'bg-destructive',
    };
    return <Badge className={colors[estado] || 'bg-muted'}>{estado}</Badge>;
  };

  const handleCheckin = async () => {
    if (!documentoVerificado || !tarjetaRegistrada || !firmaDigital) {
      toast({ title: 'Faltan requisitos', description: 'Complete todos los campos obligatorios', variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      await api.checkin(reserva.id, reserva.habitacion_id);
      toast({ title: '✓ Check-in completado', description: `Habitación ${reserva.habitacion_numero} asignada` });
      onOpenChange(false);
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
    
    if (saldoPendiente > 0) {
      toast({ title: 'Saldo pendiente', description: `El huésped debe liquidar $${saldoPendiente.toFixed(2)}`, variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      await api.checkout(reserva.id);
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
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      toast({ title: 'Monto inválido', variant: 'destructive' });
      return;
    }
    
    try {
      await api.createPago({
        reserva_id: reserva.id,
        monto,
        metodo_pago: metodoPago,
        concepto: 'Abono a reserva',
      });
      toast({ title: 'Pago registrado', description: `Se abonaron $${monto.toFixed(2)} con ${metodoPago}` });
      setMontoAbono('');
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleConfirmar = async () => {
    setProcessing(true);
    try {
      await api.confirmarReserva(reserva.id);
      toast({ title: '✓ Reserva confirmada' });
      onOpenChange(false);
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
      await api.cancelarReserva(reserva.id);
      toast({ title: 'Reserva cancelada' });
      onOpenChange(false);
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl">Reserva #{reserva.numero_reserva || reserva.id?.slice(0, 8)}</DialogTitle>
              {getEstadoBadge(reserva.estado)}
            </div>
            <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
          </div>
        </DialogHeader>

        {reserva.estado === 'Confirmada' && (
          <Card className="bg-primary/5 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium flex items-center gap-2"><DoorOpen className="h-4 w-4" /> Proceso de Check-in</span>
                <span className="text-sm text-muted-foreground">
                  {[documentoVerificado, tarjetaRegistrada, firmaDigital].filter(Boolean).length}/3 pasos
                </span>
              </div>
              <Progress value={[documentoVerificado, tarjetaRegistrada, firmaDigital].filter(Boolean).length * 33.33} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
                <TabsTrigger value="huesped">Huésped</TabsTrigger>
                <TabsTrigger value="pagos">Pagos</TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Detalles de Estancia</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-in</Label>
                      <p className="font-medium">{format(new Date(reserva.fecha_checkin), "EEE d MMM yyyy", { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-out</Label>
                      <p className="font-medium">{format(new Date(reserva.fecha_checkout), "EEE d MMM yyyy", { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Noches</Label>
                      <p className="font-medium">{noches} noches</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Huéspedes</Label>
                      <p className="font-medium">{reserva.adultos} adultos, {reserva.ninos || 0} niños</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><BedDouble className="h-4 w-4" /> Habitación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{reserva.tipo_habitacion_nombre || 'Sin asignar'}</p>
                        <p className="text-sm text-muted-foreground">${tarifaNoche.toLocaleString()} por noche</p>
                      </div>
                      {reserva.habitacion_numero ? (
                        <Badge variant="outline" className="text-lg px-3 py-1">{reserva.habitacion_numero}</Badge>
                      ) : (
                        <Badge variant="secondary">Sin asignar</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {reserva.solicitudes_especiales && (
                  <Card className="border-warning bg-warning/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Solicitudes Especiales</p>
                          <p className="text-sm text-muted-foreground">{reserva.solicitudes_especiales}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {reserva.estado === 'Confirmada' && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Verificaciones Check-in</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="documento" checked={documentoVerificado} onCheckedChange={(c) => setDocumentoVerificado(!!c)} />
                        <label htmlFor="documento" className="text-sm cursor-pointer">Documento de identidad verificado</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="tarjeta" checked={tarjetaRegistrada} onCheckedChange={(c) => setTarjetaRegistrada(!!c)} />
                        <label htmlFor="tarjeta" className="text-sm cursor-pointer">Tarjeta de crédito/garantía registrada</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="firma" checked={firmaDigital} onCheckedChange={(c) => setFirmaDigital(!!c)} />
                        <label htmlFor="firma" className="text-sm cursor-pointer">Firma de registro completada</label>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {reserva.estado === 'CheckIn' && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Verificaciones Check-out</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="inspeccion" checked={habitacionInspeccionada} onCheckedChange={(c) => setHabitacionInspeccionada(!!c)} />
                        <label htmlFor="inspeccion" className="text-sm cursor-pointer">Habitación inspeccionada</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="llave" checked={llaveDevuelta} onCheckedChange={(c) => setLlaveDevuelta(!!c)} />
                        <label htmlFor="llave" className="text-sm cursor-pointer">Llaves devueltas</label>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="huesped" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                        {reserva.cliente_nombre?.charAt(0)}{reserva.apellido_paterno?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{reserva.cliente_nombre} {reserva.apellido_paterno} {reserva.apellido_materno}</h3>
                        {reserva.es_vip && <Badge className="mt-1">VIP</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{reserva.cliente_email || 'Sin email'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{reserva.cliente_telefono || 'Sin teléfono'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pagos" className="mt-4">
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
                      <Button onClick={handleAbonar}><CreditCard className="h-4 w-4 mr-1" /> Abonar</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Resumen de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm opacity-80">
                    <span>Subtotal ({noches} noches)</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm opacity-80">
                    <span>Impuestos (16%)</span>
                    <span>${impuestos.toLocaleString()}</span>
                  </div>
                  <Separator className="bg-primary-foreground/20" />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Total</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 rounded-lg bg-primary-foreground/10">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Pagado</span>
                    <span>${pagado.toLocaleString()}</span>
                  </div>
                  <Progress value={porcentajePagado} className="h-2 bg-primary-foreground/20" />
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-primary-foreground/10 text-center">
                  <p className="text-sm opacity-80">Saldo Pendiente</p>
                  <p className="text-3xl font-bold">${saldoPendiente.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Botones según estado */}
            {reserva.estado === 'Pendiente' && (
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={handleConfirmar} disabled={processing}>
                  {processing ? 'Procesando...' : '✓ Confirmar Reserva'}
                </Button>
                <Button variant="destructive" className="w-full" size="sm" onClick={handleCancelar} disabled={processing}>
                  Cancelar Reserva
                </Button>
              </div>
            )}

            {reserva.estado === 'Confirmada' && (
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={handleCheckin} disabled={processing}>
                  {processing ? 'Procesando...' : <><DoorOpen className="h-5 w-5 mr-2" /> Completar Check-in</>}
                </Button>
                <Button variant="destructive" className="w-full" size="sm" onClick={handleCancelar} disabled={processing}>
                  Cancelar Reserva
                </Button>
              </div>
            )}

            {reserva.estado === 'CheckIn' && (
              <div className="space-y-2">
                <Button className="w-full bg-success hover:bg-success/90" size="lg" onClick={handleCheckout} disabled={processing || saldoPendiente > 0}>
                  {processing ? 'Procesando...' : <><DoorClosed className="h-5 w-5 mr-2" /> Completar Check-out</>}
                </Button>
                {saldoPendiente > 0 && <p className="text-xs text-center text-destructive">* Debe liquidar el saldo pendiente</p>}
              </div>
            )}

            {reserva.estado === 'CheckOut' && (
              <Card className="bg-muted">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Reserva finalizada</p>
                </CardContent>
              </Card>
            )}

            {reserva.estado === 'Cancelada' && (
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
