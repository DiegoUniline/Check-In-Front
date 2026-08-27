import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  User,
  CreditCard,
  BedDouble,
  Receipt,
  Check,
  Loader2,
  AlertTriangle,
  ShoppingBag,
  ArrowLeft,
  ClipboardCheck,
  CircleDollarSign,
  CheckCircle2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
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
import { MetodoPagoSelect } from '@/components/MetodoPagoSelect';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';

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
        api.getPagosReserva(id),
      ]);
      setReserva(reservaData);
      setPagos(Array.isArray(pagosData) ? pagosData : []);
      setCargosExtra((reservaData as any)?.cargos_extra || (reservaData as any)?.cargos || []);
    } catch (error) {
      console.error('Error cargando reserva:', error);
      toast({ title: 'Error', description: 'No se pudo cargar la reserva', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Check-Out" subtitle="Preparando la salida">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="h-40 animate-pulse rounded-2xl bg-muted" />
              <div className="h-72 animate-pulse rounded-2xl bg-muted" />
            </div>
            <div className="h-80 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!reserva) {
    return (
      <MainLayout title="Check-Out" subtitle="Reserva no encontrada">
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <BedDouble className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No encontramos esta estancia</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Regresa a Reservas y selecciona nuevamente la salida que deseas procesar.
          </p>
          <Button className="mt-5" onClick={() => navigate('/reservas/checkout')}>
            Volver a salidas
          </Button>
        </div>
      </MainLayout>
    );
  }

  const noches =
    reserva.noches ||
    differenceInCalendarDays(
      parseISO(String(reserva.fecha_checkout).slice(0, 10)),
      parseISO(String(reserva.fecha_checkin).slice(0, 10)),
    );
  const total = reserva.total || reserva.monto_total || 0;
  const impuestos = Number(reserva.impuestos ?? reserva.total_impuestos ?? 0) || 0;
  const subtotal = Number(reserva.subtotal ?? reserva.subtotal_hospedaje ?? total - impuestos) || 0;
  const totalPagado = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalCargosExtra = cargosExtra.reduce(
    (sum, c) => sum + Number(c.total ?? c.subtotal ?? (Number(c.precio_unitario ?? c.precio) * (c.cantidad || 1))),
    0,
  );
  const saldoPendiente = Math.max(0, total - totalPagado);
  const cliente = reserva.cliente || reserva.clientes || {};
  const huesped = `${cliente.nombre || reserva.huesped_nombre || ''} ${
    cliente.apellido_paterno || ''
  }`.trim();
  const habitacion = reserva.habitacion?.numero || reserva.habitacion_numero || 'N/A';

  const handleSubmit = async () => {
    if (!confirmarRevision) {
      toast({
        variant: 'destructive',
        title: 'Falta revisar la habitación',
        description: 'Confirma la revisión antes de completar el check-out.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.completeCheckout(
        id!,
        saldoPendiente > 0 ? {
          monto: saldoPendiente,
          metodo_pago: metodoPago,
          concepto: 'Pago en Check-out',
        } : undefined,
      );

      toast({
        title: 'Check-out completado',
        description: `Habitación ${habitacion} enviada a limpieza.`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: 'Estancia', icon: User, done: true },
    { label: 'Revisión', icon: ClipboardCheck, done: confirmarRevision },
    { label: 'Liquidación', icon: CircleDollarSign, done: saldoPendiente <= 0 || confirmarRevision },
    { label: 'Salida', icon: CheckCircle2, done: false },
  ];

  return (
    <MainLayout
      title="Check-Out"
      subtitle={`Reserva ${reserva.numero_reserva || reserva.id?.slice(0, 8)}`}
    >
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/reservas/checkout')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Salidas de hoy
          </Button>
          <Badge variant="outline" className="h-7 rounded-full px-3 text-xs font-medium">
            Habitación {habitacion}
          </Badge>
        </div>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardContent className="p-0">
            <div className="grid divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-3 px-4 py-3.5">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      step.done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : index === 3
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border bg-muted/40 text-muted-foreground',
                    )}
                  >
                    {step.done ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Paso {index + 1}
                    </p>
                    <p className="truncate text-sm font-medium">{step.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{huesped || 'Huésped'}</p>
                      <p className="text-sm text-muted-foreground">
                        {noches} {noches === 1 ? 'noche' : 'noches'} · Hab. {habitacion}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
                    <span className="text-muted-foreground">Entrada</span>
                    <span className="font-medium">{formatDate(reserva.fecha_checkin)}</span>
                    <span className="text-muted-foreground">Salida</span>
                    <span className="font-medium">{formatDate(reserva.fecha_checkout)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Receipt className="h-5 w-5 text-primary" />
                    Cuenta de la estancia
                  </CardTitle>
                  <Badge variant={saldoPendiente > 0 ? 'secondary' : 'outline'}>
                    {saldoPendiente > 0 ? 'Saldo pendiente' : 'Pagado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="hidden overflow-hidden rounded-xl border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
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
                            Hospedaje ({noches} {noches === 1 ? 'noche' : 'noches'})
                          </div>
                        </TableCell>
                        <TableCell className="text-center">1</TableCell>
                        <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(subtotal)}</TableCell>
                      </TableRow>
                      {impuestos > 0 && (
                        <TableRow>
                          <TableCell className="text-muted-foreground">Impuestos</TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-right">{formatCurrency(impuestos)}</TableCell>
                        </TableRow>
                      )}
                      {cargosExtra.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={4} className="bg-muted/30 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-3.5 w-3.5" />
                                Cargos adicionales
                              </div>
                            </TableCell>
                          </TableRow>
                          {cargosExtra.map((cargo, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{cargo.concepto || cargo.producto_nombre}</TableCell>
                              <TableCell className="text-center">{cargo.cantidad || 1}</TableCell>
                              <TableCell className="text-right">{formatCurrency(Number(cargo.precio_unitario ?? cargo.precio ?? 0))}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(Number(cargo.total ?? cargo.subtotal ?? (Number(cargo.precio_unitario ?? cargo.precio ?? 0) * (cargo.cantidad || 1))))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 md:hidden">
                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-medium">Hospedaje</p>
                      <p className="text-xs text-muted-foreground">{noches} {noches === 1 ? 'noche' : 'noches'}</p>
                    </div>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  {impuestos > 0 && (
                    <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                      <span className="text-muted-foreground">Impuestos</span>
                      <span className="font-medium">{formatCurrency(impuestos)}</span>
                    </div>
                  )}
                  {cargosExtra.map((cargo, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border p-3">
                      <div className="min-w-0 pr-3">
                        <p className="truncate text-sm font-medium">{cargo.concepto || cargo.producto_nombre}</p>
                        <p className="text-xs text-muted-foreground">Cantidad {cargo.cantidad || 1}</p>
                      </div>
                      <span className="shrink-0 font-semibold">
                        {formatCurrency(Number(cargo.total ?? cargo.subtotal ?? (Number(cargo.precio_unitario ?? cargo.precio ?? 0) * (cargo.cantidad || 1))))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'border shadow-sm transition-colors',
                confirmarRevision
                  ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                  : 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
              )}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      confirmarRevision
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                    )}
                  >
                    {confirmarRevision ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirmacion"
                        checked={confirmarRevision}
                        onCheckedChange={(checked) => setConfirmarRevision(checked as boolean)}
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="confirmacion" className="cursor-pointer text-sm font-semibold sm:text-base">
                          Habitación revisada y lista para cerrar la estancia
                        </Label>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                          Confirma daños, objetos olvidados, minibar y cualquier cargo pendiente antes de continuar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-20">
            <Card className="overflow-hidden border-primary/20 shadow-sm">
              <div className="bg-primary px-5 py-4 text-primary-foreground">
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">Saldo final</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(saldoPendiente)}</p>
                  <CreditCard className="mb-1 h-6 w-6 opacity-80" />
                </div>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Total (extras incluidos)</span>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">De ese total, extras</span>
                    <span className="font-medium">{formatCurrency(totalCargosExtra)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                    <span>Pagado</span>
                    <span className="font-medium">-{formatCurrency(totalPagado)}</span>
                  </div>
                </div>

                {saldoPendiente > 0 ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Método para liquidar</Label>
                      <MetodoPagoSelect value={metodoPago} onChange={setMetodoPago} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    La cuenta está totalmente pagada.
                  </div>
                )}

                <Button
                  className="h-11 w-full text-sm font-semibold"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !confirmarRevision}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando salida...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Completar check-out
                    </>
                  )}
                </Button>

                {!confirmarRevision && (
                  <p className="text-center text-xs text-muted-foreground">
                    Confirma la revisión de la habitación para habilitar la salida.
                  </p>
                )}

                <Button variant="ghost" className="w-full" onClick={() => navigate('/reservas/checkout')}>
                  Cancelar y volver
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
