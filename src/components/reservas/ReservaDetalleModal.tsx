import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, BedDouble, CreditCard, DoorOpen, DoorClosed, Phone, Mail, AlertCircle, Printer, RefreshCw } from 'lucide-react';
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

export function ReservaDetalleModal({ open, onOpenChange, reserva: reservaInicial, onUpdate }: ReservaDetalleModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('resumen');
  const [processing, setProcessing] = useState(false);
  const [reserva, setReserva] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [tarjetaRegistrada, setTarjetaRegistrada] = useState(false);
  const [firmaDigital, setFirmaDigital] = useState(false);
  
  const [habitacionInspeccionada, setHabitacionInspeccionada] = useState(false);
  const [llaveDevuelta, setLlaveDevuelta] = useState(false);
  
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');

  // Cargar reserva completa cuando se abre el modal
  useEffect(() => {
    if (open && reservaInicial?.id) {
      cargarReserva();
    }
  }, [open, reservaInicial?.id]);

  const cargarReserva = async () => {
    if (!reservaInicial?.id) return;
    setLoading(true);
    try {
      const data = await api.getReserva(reservaInicial.id);
      console.log('📥 Reserva cargada:', data);
      setReserva(data);
    } catch (error) {
      console.error('Error cargando reserva:', error);
      setReserva(reservaInicial);
    } finally {
      setLoading(false);
    }
  };

  if (!reserva && !reservaInicial) return null;
  
  const r = reserva || reservaInicial;

  const noches = r.noches || differenceInDays(new Date(r.fecha_checkout), new Date(r.fecha_checkin));
  const tarifaNoche = parseFloat(r.tarifa_noche) || 0;
  const subtotal = parseFloat(r.subtotal_hospedaje) || (tarifaNoche * noches);
  const impuestos = parseFloat(r.total_impuestos) || (subtotal * 0.16);
  const total = parseFloat(r.total) || (subtotal + impuestos);
  const pagado = parseFloat(r.total_pagado) || 0;
  const saldoPendiente = parseFloat(r.saldo_pendiente) ?? (total - pagado);
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
      await api.checkin(r.id, r.habitacion_id);
      toast({ title: '✓ Check-in completado', description: `Habitación ${r.habitacion_numero} asignada` });
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
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) {
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
      toast({ title: '✅ Pago registrado', description: `Se abonaron $${monto.toFixed(2)} con ${metodoPago}` });
      setMontoAbono('');
      
      // Recargar la reserva para actualizar saldos
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl">Reserva #{r.numero_reserva || r.id?.slice(0, 8)}</DialogTitle>
              {getEstadoBadge(r.estado)}
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cargarReserva} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
              </Button>
              <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
            </div>
          </div>
        </DialogHeader>

        {r.estado === 'Confirmada' && (
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
                <TabsTrigger value="pagos">Pagos {r.pagos?.length > 0 && `(${r.pagos.length})`}</TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Detalles de Estancia</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-in</Label>
                      <p className="font-medium">{format(new Date(r.fecha_checkin), "EEE d MMM yyyy", { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Check-out</Label>
                      <p className="font-medium">{format(new Date(r.fecha_checkout), "EEE d MMM yyyy", { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Noches</Label>
                      <p className="font-medium">{noches} noches</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Huéspedes</Label>
                      <p className="font-medium">{r.adultos} adultos, {r.ninos || 0} niños</p>
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
                        <p className="font-medium">{r.tipo_habitacion_nombre || 'Sin asignar'}</p>
                        <p className="text-sm text-muted-foreground">${tarifaNoche.toLocaleString()} por noche</p>
                      </div>
                      {r.habitacion_numero ? (
                        <Badge variant="outline" className="text-lg px-3 py-1">{r.habitacion_numero}</Badge>
                      ) : (
                        <Badge variant="secondary">Sin asignar</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {r.solicitudes_especiales && (
                  <Card className="border-warning bg-warning/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Solicitudes Especiales</p>
                          <p className="text-sm text-muted-foreground">{r.solicitudes_especiales}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {r.estado === 'Confirmada' && (
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

                {r.estado === 'CheckIn' && (
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
                        {r.cliente_nombre?.charAt(0)}{r.apellido_paterno?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{r.cliente_nombre} {r.apellido_paterno} {r.apellido_materno}</h3>
                        {r.es_vip && <Badge className="mt-1">VIP</Badge>}
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

              <TabsContent value="pagos" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Registrar Pago</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Monto" 
                        value={montoAbono} 
                        onChange={(e) => setMontoAbono(e.target.value)} 
                        className="flex-1" 
                      />
                      <Select value={metodoPago} onValueChange={setMetodoPago}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                          <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="Transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAbonar} disabled={processing}>
                        <CreditCard className="h-4 w-4 mr-1" /> Abonar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de pagos */}
                {r.pagos && r.pagos.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Historial de Pagos</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {r.pagos.map((pago: any, idx: number) => (
                          <div key={pago.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">${parseFloat(pago.monto).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{pago.metodo_pago} - {pago.concepto}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {pago.created_at ? format(new Date(pago.created_at), 'd MMM HH:mm', { locale: es }) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                <Button className="w-full" size="lg" onClick={handleCheckin} disabled={processing}>
                  {processing ? 'Procesando...' : <><DoorOpen className="h-5 w-5 mr-2" /> Completar Check-in</>}
                </Button>
                <Button variant="destructive" className="w-full" size="sm" onClick={handleCancelar} disabled={processing}>
                  Cancelar Reserva
                </Button>
              </div>
            )}

            {r.estado === 'CheckIn' && (
              <div className="space-y-2">
                <Button className="w-full bg-success hover:bg-success/90" size="lg" onClick={handleCheckout} disabled={processing || saldoPendiente > 0}>
                  {processing ? 'Procesando...' : <><DoorClosed className="h-5 w-5 mr-2" /> Completar Check-out</>}
                </Button>
                {saldoPendiente > 0 && <p className="text-xs text-center text-destructive">* Debe liquidar el saldo pendiente</p>}
              </div>
            )}

            {r.estado === 'CheckOut' && (
              <Card className="bg-muted">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">✓ Reserva finalizada</p>
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
