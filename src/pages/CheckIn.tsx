import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  User, CreditCard, BedDouble, Check,
  Loader2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { PagosMultiplesGrid, type PagoItem } from '@/components/PagosMultiplesGrid';

export default function CheckIn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [reserva, setReserva] = useState<any>(null);
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nombre: '',
    apellidoPaterno: '',
    documento: '',
    nacionalidad: 'Mexicana',
    email: '',
    habitacionId: '',
  });

  const [pagos, setPagos] = useState<PagoItem[]>([]);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cargarDatos = async () => {
    if (!id) return;
    try {
      const reservaData = await api.getReserva(id);
      setReserva(reservaData);

      if (reservaData.fecha_checkin && reservaData.fecha_checkout) {
        const habsDisp = await api.getHabitacionesDisponibles(
          reservaData.fecha_checkin,
          reservaData.fecha_checkout,
          reservaData.tipo_habitacion_id
        );
        setHabitacionesDisponibles(Array.isArray(habsDisp) ? habsDisp : []);
      }

      const cli: any = (reservaData as any).cliente || (reservaData as any).clientes || {};
      setFormData({
        nombre: cli.nombre || (reservaData as any).huesped_nombre || '',
        apellidoPaterno: cli.apellido_paterno || '',
        documento: cli.numero_documento || '',
        nacionalidad: cli.nacionalidad || 'Mexicana',
        email: cli.email || '',
        habitacionId: reservaData.habitacion_id || '',
      });
    } catch (error) {
      console.error('Error cargando reserva:', error);
      toast({ title: 'Error', description: 'No se pudo cargar la reserva', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedHabitacion = habitacionesDisponibles.find(h => h.id === formData.habitacionId);

  const totalPagos = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

  const handleSubmit = async () => {
    if (!formData.habitacionId) {
      toast({
        variant: 'destructive',
        title: 'Habitación requerida',
        description: 'Debe seleccionar una habitación.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.checkin(id!, formData.habitacionId);

      // Registrar todos los pagos
      for (const pago of pagos) {
        if (!pago.monto || pago.monto <= 0) continue;
        await api.createPago({
          reserva_id: id,
          monto: pago.monto,
          metodo_pago: pago.metodo,
          referencia: pago.referencia,
          concepto: 'Pago en Check-in',
        });
      }

      toast({
        title: '✅ Check-in completado',
        description: `${formData.nombre} ${formData.apellidoPaterno} - Hab. ${selectedHabitacion?.numero}`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Check-In" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!reserva) {
    return (
      <MainLayout title="Check-In" subtitle="Reserva no encontrada">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <p className="text-muted-foreground mb-4">No se encontró la reserva especificada.</p>
          <Button onClick={() => navigate('/reservas')}>Volver a Reservas</Button>
        </div>
      </MainLayout>
    );
  }

  const noches = reserva.noches || Math.ceil((new Date(reserva.fecha_checkout).getTime() - new Date(reserva.fecha_checkin).getTime()) / (1000 * 60 * 60 * 24));
  const total = reserva.total || reserva.monto_total || 0;
  const subtotal = reserva.subtotal || total * 0.84;
  const impuestos = reserva.impuestos || total * 0.16;
  const saldoRestante = Math.max(0, total - totalPagos);

  return (
    <MainLayout
      title="Proceso de Check-In"
      subtitle={`Reserva ${reserva.numero_reserva || reserva.id?.slice(0, 8)}`}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progreso del Check-in</span>
          <span className="text-sm text-muted-foreground">{formData.habitacionId ? '100%' : '50%'}</span>
        </div>
        <Progress value={formData.habitacionId ? 100 : 50} className="h-2" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Información del Huésped
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido Paterno</Label>
                  <Input
                    value={formData.apellidoPaterno}
                    onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Documento de Identidad</Label>
                  <Input
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nacionalidad</Label>
                  <Select
                    value={formData.nacionalidad}
                    onValueChange={(v) => setFormData({ ...formData, nacionalidad: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mexicana">Mexicana</SelectItem>
                      <SelectItem value="Estadounidense">Estadounidense</SelectItem>
                      <SelectItem value="Canadiense">Canadiense</SelectItem>
                      <SelectItem value="Otra">Otra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BedDouble className="h-5 w-5 text-primary" />
                Asignación de Habitación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Tipo de Habitación</Label>
                  <p className="font-medium">{reserva.tipo_habitacion_nombre || reserva.tipo_habitacion?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Fechas</Label>
                  <p className="font-medium">
                    {format(new Date(reserva.fecha_checkin), 'd MMM', { locale: es })} - {format(new Date(reserva.fecha_checkout), 'd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Habitación Asignada</Label>
                <Select
                  value={formData.habitacionId}
                  onValueChange={(v) => setFormData({ ...formData, habitacionId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar habitación" />
                  </SelectTrigger>
                  <SelectContent>
                    {habitacionesDisponibles.map(hab => (
                      <SelectItem key={hab.id} value={hab.id}>
                        Hab. {hab.numero} - Piso {hab.piso}
                      </SelectItem>
                    ))}
                    {reserva.habitacion_id && (
                      <SelectItem value={reserva.habitacion_id}>
                        Hab. {reserva.habitacion?.numero || reserva.habitacion_numero} (Pre-asignada)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Huéspedes:</span>
                <Badge variant="secondary">{reserva.adultos || 1} Adultos</Badge>
                {(reserva.ninos || 0) > 0 && <Badge variant="secondary">{reserva.ninos} Niños</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Resumen de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hospedaje ({noches} noches)</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impuestos</span>
                    <span>${impuestos.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">${total.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                <PagosMultiplesGrid
                  total={total}
                  pagos={pagos}
                  onChange={setPagos}
                />

                <div className="pt-4 space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.habitacionId}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        COMPLETAR CHECK-IN
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/reservas')}
                  >
                    Cancelar Proceso
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