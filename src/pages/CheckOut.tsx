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
  Pencil,
} from 'lucide-react';
import { z } from 'zod';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { PagosMultiplesGrid, type PagoItem } from '@/components/PagosMultiplesGrid';
import { StayDeliverables } from '@/components/reservas/StayDeliverables';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';

const paymentCorrectionSchema = z.object({
  amount: z.coerce.number().finite().positive('El importe debe ser mayor a cero').max(99999999, 'El importe es demasiado alto'),
  reason: z.string().trim().min(3, 'Escribe un motivo de al menos 3 caracteres').max(300, 'El motivo no puede superar 300 caracteres'),
});

export default function CheckOut() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmarRevision, setConfirmarRevision] = useState(false);
  const [pagosLiquidacion, setPagosLiquidacion] = useState<PagoItem[]>([]);
  const [efectivoRecibido, setEfectivoRecibido] = useState(0);
  const [salirACredito, setSalirACredito] = useState(false);
  const [mostrarEntregables, setMostrarEntregables] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagoEditar, setPagoEditar] = useState<any>(null);
  const [importeEditado, setImporteEditado] = useState('');
  const [motivoEdicion, setMotivoEdicion] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [reserva, setReserva] = useState<any>(null);
  const [cargosExtra, setCargosExtra] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [entregablesPendientes, setEntregablesPendientes] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    if (!id) return;
    try {
      await api.recalculateReservationFinancials(id).catch(() => undefined);
      const [reservaData, pagosData, entregablesData] = await Promise.all([
        api.getReserva(id),
        api.getPagosReserva(id),
        api.getEntregablesReserva(id).catch(() => []),
      ]);
      setReserva(reservaData);
      // Los pagos cancelados se muestran como historial, pero no cuentan en el saldo.
      setPagos(Array.isArray(pagosData) ? pagosData : []);
      setCargosExtra(((reservaData as any)?.cargos_extra || (reservaData as any)?.cargos || [])
        .filter((c: any) => c.estado !== 'Cancelado'));
      const pendientes = (Array.isArray(entregablesData) ? entregablesData : [])
        .filter((e: any) => e.requiere_devolucion && !e.devuelto);
      setEntregablesPendientes(pendientes);
      if (pendientes.length) setMostrarEntregables(true);
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

  const sameDayStay = String(reserva.fecha_checkout).slice(0, 10) === String(reserva.fecha_checkin).slice(0, 10);
  const noches = Math.max(
    1,
    Number(reserva.noches) || differenceInCalendarDays(
      parseISO(String(reserva.fecha_checkout).slice(0, 10)),
      parseISO(String(reserva.fecha_checkin).slice(0, 10)),
    ),
  );
  const total = reserva.total || reserva.monto_total || 0;
  const impuestos = Number(reserva.impuestos ?? reserva.total_impuestos ?? 0) || 0;
  const subtotal = Number(reserva.subtotal ?? reserva.subtotal_hospedaje ?? total - impuestos) || 0;
  const pagosActivos = pagos.filter((p) => p.estado !== 'Cancelado');
  const totalPagado = pagosActivos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalCargosExtra = cargosExtra.reduce(
    (sum, c) => sum + Number(c.total ?? c.subtotal ?? (Number(c.precio_unitario ?? c.precio) * (c.cantidad || 1))),
    0,
  );
  // El saldo lo calcula el servidor (incluye cargos, impuestos y descuentos);
  // negativo significa saldo a favor del huésped.
  const saldoServidor = reserva.saldo_pendiente == null ? total - totalPagado : Number(reserva.saldo_pendiente) || 0;
  const saldoPendiente = Math.max(0, Math.round(saldoServidor * 100) / 100);
  const saldoAFavor = saldoServidor < -0.009 ? Math.abs(saldoServidor) : 0;
  const totalLiquidacion = pagosLiquidacion.reduce((sum, pago) => sum + (Number(pago.monto) || 0), 0);
  const diferenciaLiquidacion = Math.round((saldoPendiente - totalLiquidacion) * 100) / 100;
  const pagoEfectivo = pagosLiquidacion
    .filter((pago) => pago.metodo.toLowerCase().includes('efectivo'))
    .reduce((sum, pago) => sum + (Number(pago.monto) || 0), 0);
  const estanciaActiva = ['CheckIn', 'Hospedado'].includes(String(reserva.estado || ''))
    && Boolean(reserva.checkin_realizado) && !reserva.checkout_realizado;
  const cliente = reserva.cliente || reserva.clientes || {};
  const huesped = `${cliente.nombre || reserva.huesped_nombre || ''} ${
    cliente.apellido_paterno || ''
  }`.trim();
  const habitacion = reserva.habitacion?.numero || reserva.habitacion_numero || 'N/A';

  const abrirCorreccionPago = (pago: any) => {
    setPagoEditar(pago);
    setImporteEditado(Number(pago.monto || 0).toFixed(2));
    setMotivoEdicion('');
  };

  const guardarCorreccionPago = async () => {
    if (!id || !pagoEditar) return;
    const parsed = paymentCorrectionSchema.safeParse({ amount: importeEditado, reason: motivoEdicion });
    if (!parsed.success) {
      toast({
        title: 'Revisa la corrección',
        description: parsed.error.issues[0]?.message || 'Captura un importe y motivo válidos.',
        variant: 'destructive',
      });
      return;
    }
    setGuardandoPago(true);
    try {
      await api.cambiarImportePago(id, pagoEditar.id, parsed.data.amount, parsed.data.reason);
      await cargarDatos();
      setPagoEditar(null);
      toast({ title: 'Pago corregido', description: 'El importe, el total pagado y el saldo ya se actualizaron.' });
    } catch (error: any) {
      toast({ title: 'No se pudo modificar el pago', description: error.message, variant: 'destructive' });
    } finally {
      setGuardandoPago(false);
    }
  };

  const handleSubmit = async () => {
    if (!estanciaActiva) {
      toast({
        variant: 'destructive',
        title: 'No se puede hacer check-out',
        description: `La reserva está en estado ${reserva.estado}; sólo se registra salida de una estancia con check-in.`,
      });
      return;
    }
    // Se revisa de nuevo: la devolución pudo registrarse en esta misma pantalla.
    const frescos = await api.getEntregablesReserva(id!).catch(() => entregablesPendientes);
    const pendientesAhora = (Array.isArray(frescos) ? frescos : []).filter((e: any) => e.requiere_devolucion && !e.devuelto);
    setEntregablesPendientes(pendientesAhora);
    if (pendientesAhora.length > 0) {
      setMostrarEntregables(true);
      toast({
        variant: 'destructive',
        title: 'Entregables pendientes',
        description: `Registra la devolución de: ${pendientesAhora.map((e: any) => e.nombre).join(', ')} (sección Entregables).`,
      });
      return;
    }
    if (saldoAFavor > 0) {
      const ok = window.confirm(`El huésped tiene un saldo a favor de ${formatCurrency(saldoAFavor)}. ¿Ya se le devolvió o se aplicará? Pulsa Aceptar para continuar con la salida.`);
      if (!ok) return;
    }
    if (saldoPendiente > 0 && totalLiquidacion <= 0 && !salirACredito) {
      toast({ variant: 'destructive', title: 'Captura el pago', description: `Distribuye ${formatCurrency(saldoPendiente)} entre uno o varios métodos, o marca «Salir a crédito».` });
      return;
    }
    // Con crédito, lo que no se capture queda como cuenta por cobrar; nunca se permite excedente.
    if (saldoPendiente > 0 && diferenciaLiquidacion < -0.009) {
      toast({
        variant: 'destructive',
        title: 'Los pagos superan el saldo',
        description: `Reduce los pagos en ${formatCurrency(Math.abs(diferenciaLiquidacion))}.`,
      });
      return;
    }
    if (saldoPendiente > 0 && diferenciaLiquidacion > 0.009 && !salirACredito) {
      toast({
        variant: 'destructive',
        title: 'Aún falta por liquidar',
        description: `Falta asignar ${formatCurrency(diferenciaLiquidacion)} o marca «Salir a crédito».`,
      });
      return;
    }
    if (salirACredito && saldoPendiente > 0 && diferenciaLiquidacion > 0.009) {
      const ok = window.confirm(`El huésped saldrá a crédito por ${formatCurrency(diferenciaLiquidacion)}. Quedará como cuenta por cobrar. ¿Continuar?`);
      if (!ok) return;
    }
    if (pagoEfectivo > 0 && efectivoRecibido > 0 && efectivoRecibido + 0.009 < pagoEfectivo) {
      toast({ variant: 'destructive', title: 'Efectivo insuficiente', description: 'El efectivo recibido es menor que el importe asignado a efectivo.' });
      return;
    }
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
      await api.recalculateReservationFinancials(id!);
      const [reservaActual, pagosActuales] = await Promise.all([
        api.getReserva(id!),
        api.getPagosReserva(id!),
      ]);
      const pagosActivosActuales = (Array.isArray(pagosActuales) ? pagosActuales : [])
        .filter((pago: any) => pago.estado !== 'Cancelado');
      const pagadoActual = pagosActivosActuales.reduce((sum: number, pago: any) => sum + (Number(pago.monto) || 0), 0);
      const saldoActual = reservaActual.saldo_pendiente == null
        ? Math.max(0, Number(reservaActual.total || 0) - pagadoActual)
        : Math.max(0, Number(reservaActual.saldo_pendiente) || 0);

      if (Math.abs(saldoActual - saldoPendiente) > 0.009) {
        setReserva(reservaActual);
        setPagos(pagosActivosActuales);
        setPagosLiquidacion([]);
        setEfectivoRecibido(0);
        setSalirACredito(false);
        toast({
          title: 'Saldo actualizado',
          description: saldoActual > 0
            ? `El saldo vigente es ${formatCurrency(saldoActual)}. Captura nuevamente la forma de pago.`
            : 'La cuenta ya está liquidada. Puedes completar el check-out.',
        });
        return;
      }

      if (saldoPendiente > 0) {
        for (const pago of pagosLiquidacion) {
          await api.createPago({
            reserva_id: id!,
            monto: Number(pago.monto),
            metodo_pago: pago.metodo,
            referencia: pago.referencia || null,
            concepto: 'Pago en Check-out',
          });
        }
      }
      const montoCredito = salirACredito ? Math.max(0, saldoPendiente - totalLiquidacion) : 0;
      await api.completeCheckout(id!, undefined, montoCredito > 0.009);

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
    { label: 'Liquidación', icon: CircleDollarSign, done: saldoPendiente <= 0 || Math.abs(diferenciaLiquidacion) <= 0.009 },
    { label: 'Salida', icon: CheckCircle2, done: false },
  ];

  return (
    <MainLayout
      title="Check-Out"
      subtitle={`Reserva ${reserva.numero_reserva || reserva.id?.slice(0, 8)}`}
    >
      <div className="mx-auto max-w-7xl space-y-4 pb-24 lg:space-y-5 lg:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/reservas/checkout')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Salidas de hoy
          </Button>
          <Badge variant="outline" className="h-7 rounded-md px-3 text-xs font-medium">
            Habitación {habitacion}
          </Badge>
        </div>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardContent className="p-0">
            <div className="grid grid-cols-4 divide-x">
              {steps.map((step, index) => (
                <div key={step.label} className="flex min-w-0 flex-col items-center gap-1 px-1.5 py-3 text-center sm:flex-row sm:gap-3 sm:px-4 sm:py-3.5 sm:text-left">
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
                    <p className="hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
                      Paso {index + 1}
                    </p>
                    <p className="max-w-full truncate text-[10px] font-medium sm:text-sm">{step.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            {mostrarEntregables && id && (
              <div className="overflow-hidden rounded-lg border border-amber-200">
                <p className="bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">Registra la devolución de los entregables antes de la salida.</p>
                <StayDeliverables reservaId={id} active embedded />
              </div>
            )}
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
                        {sameDayStay ? 'Estancia del día' : `${noches} ${noches === 1 ? 'noche' : 'noches'}`} · Hab. {habitacion}
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
                    <CreditCard className="h-5 w-5 text-primary" />
                    Pagos realizados
                  </CardTitle>
                  <Badge variant="outline">{pagos.length} {pagos.length === 1 ? 'pago' : 'pagos'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {pagos.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No hay pagos registrados en esta estancia.</p>
                ) : (
                  <div className="divide-y overflow-hidden rounded-lg border">
                    {pagos.map((pago) => {
                      const cancelado = pago.estado === 'Cancelado';
                      return (
                        <div key={pago.id} className={cn('flex flex-col gap-3 p-3 sm:flex-row sm:items-center', cancelado && 'bg-muted/40 opacity-70')}>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={cn('text-sm font-semibold', cancelado && 'line-through')}>{pago.metodo_pago || 'Forma de pago no indicada'}</p>
                              {cancelado && <Badge variant="secondary" className="h-5 text-[10px]">Cancelado</Badge>}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDateTime(pago.fecha || pago.created_at)}
                              {pago.concepto ? ` · ${pago.concepto}` : ''}
                            </p>
                            {pago.referencia && <p className="mt-0.5 truncate text-xs text-muted-foreground">Referencia: {pago.referencia}</p>}
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <span className={cn('text-sm font-semibold tabular-nums', cancelado && 'line-through')}>{formatCurrency(Number(pago.monto) || 0)}</span>
                            {!cancelado && (
                              <Button variant="outline" size="sm" className="h-8" onClick={() => abrirCorreccionPago(pago)}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Modificar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                            Hospedaje ({sameDayStay ? 'estancia del día' : `${noches} ${noches === 1 ? 'noche' : 'noches'}`})
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
                      <p className="text-xs text-muted-foreground">{sameDayStay ? 'Estancia del día' : `${noches} ${noches === 1 ? 'noche' : 'noches'}`}</p>
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
                      <div>
                        <Label>Formas de pago</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">Puedes dividir el saldo entre varios métodos.</p>
                      </div>
                      <PagosMultiplesGrid
                        total={saldoPendiente}
                        pagos={pagosLiquidacion}
                        onChange={setPagosLiquidacion}
                        permitirCambioEfectivo
                        efectivoRecibido={efectivoRecibido}
                        onEfectivoRecibidoChange={setEfectivoRecibido}
                      />
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

        <Dialog open={Boolean(pagoEditar)} onOpenChange={(open) => { if (!open && !guardandoPago) setPagoEditar(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modificar importe del pago</DialogTitle>
              <DialogDescription>
                Corrige únicamente un pago capturado por error. El cambio quedará registrado en el historial.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Forma de pago</span>
                  <span className="font-medium">{pagoEditar?.metodo_pago || 'No indicada'}</span>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="text-muted-foreground">Importe anterior</span>
                  <span className="font-medium">{formatCurrency(Number(pagoEditar?.monto) || 0)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="importe-pago">Importe correcto</Label>
                <Input
                  id="importe-pago"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="99999999"
                  step="0.01"
                  value={importeEditado}
                  onChange={(event) => setImporteEditado(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivo-pago">Motivo de la corrección</Label>
                <Textarea
                  id="motivo-pago"
                  maxLength={300}
                  rows={3}
                  placeholder="Ej. Se capturó dos veces el importe"
                  value={motivoEdicion}
                  onChange={(event) => setMotivoEdicion(event.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPagoEditar(null)} disabled={guardandoPago}>Cancelar</Button>
              <Button onClick={guardarCorreccionPago} disabled={guardandoPago}>
                {guardandoPago && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar corrección
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div
          className="fixed inset-x-0 z-40 border-t border-brand-navy/15 bg-background/96 px-3 py-2 shadow-[0_-8px_28px_rgba(16,35,63,0.12)] backdrop-blur lg:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 68px)' }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo final</p>
              <p className="truncate text-base font-bold text-brand-navy">{formatCurrency(saldoPendiente)}</p>
            </div>
            <Button
              className="h-11 min-w-[184px] font-semibold"
              onClick={handleSubmit}
              disabled={isSubmitting || !confirmarRevision}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Completar check-out
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
