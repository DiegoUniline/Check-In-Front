import { useState } from 'react';
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
import { mockReservas } from '@/data/mockData';

// Mock extra charges
const mockCargosExtra = [
  { id: 1, concepto: 'Room Service - Cena', cantidad: 1, precio: 350, fecha: new Date() },
  { id: 2, concepto: 'Minibar', cantidad: 3, precio: 180, fecha: new Date() },
  { id: 3, concepto: 'Lavandería Express', cantidad: 1, precio: 150, fecha: new Date() },
];

export default function CheckOut() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmarRevision, setConfirmarRevision] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Tarjeta');
  
  const reserva = mockReservas.find(r => r.id === id);

  const totalCargosExtra = mockCargosExtra.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
  const totalGeneral = (reserva?.saldoPendiente || 0) + totalCargosExtra;

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
    await new Promise(r => setTimeout(r, 1500));
    
    toast({
      title: '✅ Check-out completado',
      description: `Habitación ${reserva?.habitacion?.numero} lista para limpieza.`,
    });
    
    navigate('/dashboard');
  };

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

  return (
    <MainLayout 
      title="Proceso de Check-Out" 
      subtitle={`Reserva ${reserva.numeroReserva}`}
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
                  <p className="font-medium">{reserva.cliente.nombre} {reserva.cliente.apellidoPaterno}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Habitación</p>
                  <p className="font-medium">{reserva.habitacion?.numero || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">{format(new Date(reserva.fechaCheckin), 'd MMM yyyy', { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Noches</p>
                  <p className="font-medium">{reserva.noches}</p>
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
                        Hospedaje ({reserva.noches} noches)
                      </div>
                    </TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-right">${reserva.subtotalHospedaje.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${reserva.subtotalHospedaje.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">IVA (16%)</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">${reserva.totalImpuestos.toLocaleString()}</TableCell>
                  </TableRow>
                  
                  {mockCargosExtra.length > 0 && (
                    <>
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted/50 font-medium">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            Cargos Adicionales
                          </div>
                        </TableCell>
                      </TableRow>
                      {mockCargosExtra.map(cargo => (
                        <TableRow key={cargo.id}>
                          <TableCell>{cargo.concepto}</TableCell>
                          <TableCell className="text-center">{cargo.cantidad}</TableCell>
                          <TableCell className="text-right">${cargo.precio}</TableCell>
                          <TableCell className="text-right">${(cargo.precio * cargo.cantidad).toLocaleString()}</TableCell>
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
                    <span>${reserva.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cargos adicionales</span>
                    <span>${totalCargosExtra.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>Pagado anteriormente</span>
                    <span>-${reserva.totalPagado.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Saldo a Pagar</span>
                    <span className="text-primary">${totalGeneral.toLocaleString()}</span>
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