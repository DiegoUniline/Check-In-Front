import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User, CreditCard, BedDouble, Receipt, Check, 
  Loader2, AlertTriangle, ShoppingBag
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function CheckOut() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmarRevision, setConfirmarRevision] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Tarjeta');
  const [loading, setLoading] = useState(true);
  
  const [reserva, setReserva] = useState<any>(null);
  const [cargosExtra, setCargosExtra] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    if (!id) return;
    try {
      const [reservaData, pagosData] = await Promise.all([
        api.getReserva(id),
        api.getPagosReserva(id)
      ]);
      setReserva(reservaData);
      setPagos(Array.isArray(pagosData) ? pagosData : []);
      setCargosExtra(reservaData.cargos_extra || []);
    } catch (error) {
      console.error('Error cargando reserva:', error);
      toast({ title: 'Error', description: 'No se pudo cargar la reserva', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Check-Out" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!reserva) {
    return (
      <MainLayout title="Check-Out" subtitle="Reserva no encontrada">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <p className="text-muted-foreground mb-4">No se encontró la reserva especificada.</p>
          <Button onClick={() => navigate('/reservas')}>Volver a Reservas</Button>
        </div>
      </MainLayout>
    );
  }

  const noches = reserva.noches || Math.ceil((new Date(reserva.fecha_checkout).getTime() - new Date(reserva.fecha_checkin).getTime()) / (1000 * 60 * 60 * 24));
  const subtotal = reserva.subtotal || reserva.total * 0.84 || 0;
  const impuestos = reserva.impuestos || reserva.total * 0.16 || 0;
  const total = reserva.total || reserva.monto_total || 0;
  const totalPagado = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalCargosExtra = cargosExtra.reduce((sum, c) => sum + (Number(c.precio) * (c.cantidad || 1)), 0);
  const saldoPendiente = total + totalCargosExtra - totalPagado;

  const handleSubmit = async () => {
    if (!confirmarRevision) {
      toast({
        variant: 'destructive',
        title: 'Confirmación requerida',
        description: 'Debe confirmar la revisión de la habitación.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Registrar pago final si hay saldo pendiente
      if (saldoPendiente > 0) {
        await api.createPago({
          reserva_id: id,
          monto: saldoPendiente,
          metodo_pago: metodoPago,
          concepto: 'Pago en Check-out',
        });
      }

      // Realizar checkout
      await api.checkout(id!);
      
      toast({
        title: '✅ Check-out completado',
        description: `Habitación ${reserva.habitacion?.numero || reserva.habitacion_numero} lista para limpieza.`,
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout 
      title="Proceso de Check-Out" 
      subtitle={`Reserva ${reserva.numero_reserva || reserva.id?.slice(0, 8)}`}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Información de la Estancia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Huésped</p>
                  <p className="font-medium">{reserva.cliente?.nombre || reserva.huesped_nombre} {reserva.cliente?.apellido_paterno || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Habitación</p>
                  <p className="font-medium">{reserva.habitacion?.numero || reserva.habitacion_numero || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">{format(new Date(reserva.fecha_checkin), 'd MMM yyyy', { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Noches</p>
                  <p className="font-medium">{noches}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charges summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-primary" />
                Resumen de Cargos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-muted-foreground" />
                        Hospedaje ({noches} noches)
                      </div>
                    </TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-right">${subtotal.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">IVA (16%)</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">${impuestos.toLocaleString()}</TableCell>
                  </TableRow>
                  
                  {cargosExtra.length > 0 && (
                    <>
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted/50 font-medium">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            Cargos Adicionales
                          </div>
                        </TableCell>
                      </TableRow>
                      {cargosExtra.map((cargo, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{cargo.concepto || cargo.producto_nombre}</TableCell>
                          <TableCell className="text-center">{cargo.cantidad || 1}</TableCell>
                          <TableCell className="text-right">${Number(cargo.precio).toLocaleString()}</TableCell>
                          <TableCell className="text-right">${(Number(cargo.precio) * (cargo.cantidad || 1)).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Room inspection */}
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Revisión de Habitación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="confirmacion"
                  checked={confirmarRevision}
                  onCheckedChange={(checked) => setConfirmarRevision(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="confirmacion" className="cursor-pointer font-medium">
                    Confirmo que la habitación ha sido revisada
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Verificar que no hay daños, objetos olvidados y el minibar está correcto.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Payment */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Liquidación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal hospedaje</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cargos adicionales</span>
                    <span>${totalCargosExtra.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>Pagado anteriormente</span>
                    <span>-${totalPagado.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Saldo a Pagar</span>
                    <span className="text-primary">${saldoPendiente.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Tarjeta', 'Efectivo'].map(metodo => (
                      <Button
                        key={metodo}
                        variant={metodoPago === metodo ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMetodoPago(metodo)}
                        className="w-full"
                      >
                        {metodo}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        COMPLETAR CHECK-OUT
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/reservas')}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
