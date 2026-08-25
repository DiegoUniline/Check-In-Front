import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  CreditCard,
  BedDouble,
  Check,
  Loader2,
  PenLine,
  FileDown,
  ArrowLeft,
  ClipboardCheck,
  CircleDollarSign,
  CheckCircle2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { PagosMultiplesGrid, type PagoItem } from '@/components/PagosMultiplesGrid';
import { formatCurrency } from '@/lib/currency';
import { SignaturePad } from '@/components/SignaturePad';
import { exportarRegistroHuesped } from '@/lib/pdfExport';
import { enviarWhatsAppReserva, MENSAJES_DEFAULT } from '@/lib/whatsappSend';
import { formatDate } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';

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
  const [firma, setFirma] = useState<string | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

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
          reservaData.tipo_habitacion_id,
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

  const selectedHabitacion = habitacionesDisponibles.find((h) => h.id === formData.habitacionId);
  const totalPagos = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

  const handleSubmit = async () => {
    if (!formData.habitacionId) {
      toast({
        variant: 'destructive',
        title: 'Falta asignar habitación',
        description: 'Selecciona la habitación antes de continuar.',
      });
      return;
    }
    if (!aceptaTerminos) {
      toast({
        variant: 'destructive',
        title: 'Falta aceptar términos',
        description: 'El huésped debe aceptar los términos y el aviso de privacidad.',
      });
      return;
    }
    if (!firma) {
      toast({
        variant: 'destructive',
        title: 'Falta la firma',
        description: 'Solicita la firma del huésped para completar el check-in.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.checkin(id!, formData.habitacionId);

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

      try {
        const hab = habitacionesDisponibles.find((h) => h.id === formData.habitacionId);
        await exportarRegistroHuesped({
          hotel: reserva.hotel?.nombre,
          hotelDireccion: reserva.hotel?.direccion,
          hotelTelefono: reserva.hotel?.telefono,
          hotelEmail: reserva.hotel?.email,
          hotelCiudad: reserva.hotel?.ciudad,
          hotelLogoUrl: reserva.hotel?.logo_url,
          reserva: {
            ...reserva,
            habitacion_numero: hab?.numero || reserva.habitacion_numero,
            tipo_habitacion_nombre:
              reserva.tipo_habitacion_nombre || reserva.tipo_habitacion?.nombre,
          },
          cliente: {
            nombre: formData.nombre,
            apellido_paterno: formData.apellidoPaterno,
            email: formData.email,
            numero_documento: formData.documento,
            nacionalidad: formData.nacionalidad,
          },
          firmaDataUrl: firma,
          aceptaTerminos,
        });
      } catch (err) {
        console.warn('No se pudo generar el PDF de registro:', err);
      }

      toast({
        title: 'Check-in completado',
        description: `${formData.nombre} ${formData.apellidoPaterno} · Hab. ${selectedHabitacion?.numero || reserva.habitacion_numero || ''}`,
      });

      try {
        const tel = reserva.cliente?.telefono || reserva.clientes?.telefono;
        if (tel && reserva.hotel_id) {
          await enviarWhatsAppReserva({
            hotel_id: reserva.hotel_id,
            telefono: tel,
            reserva_id: reserva.id,
            template_key: 'bienvenida_checkin',
            mensajeFallback: MENSAJES_DEFAULT.bienvenida_checkin,
            vars: {
              nombre: formData.nombre,
              habitacion: selectedHabitacion?.numero || '',
              fecha_checkout: reserva.fecha_checkout || '',
              numero_reserva: reserva.numero_reserva || '',
            },
          });
        }
      } catch (err) {
        console.warn('WhatsApp bienvenida falló:', err);
      }

      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Check-In" subtitle="Preparando la llegada">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
              <div className="h-52 animate-pulse rounded-2xl bg-muted" />
            </div>
            <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!reserva) {
    return (
      <MainLayout title="Check-In" subtitle="Reserva no encontrada">
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <BedDouble className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No encontramos esta reserva</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Regresa a las llegadas y selecciona nuevamente el huésped que deseas registrar.
          </p>
          <Button className="mt-5" onClick={() => navigate('/reservas/checkin')}>
            Volver a llegadas
          </Button>
        </div>
      </MainLayout>
    );
  }

  const noches =
    reserva.noches ||
    Math.ceil(
      (new Date(reserva.fecha_checkout).getTime() - new Date(reserva.fecha_checkin).getTime()) /
        (1000 * 60 * 60 * 24),
    );
  const total = reserva.total || reserva.monto_total || 0;
  const impuestos = Number(reserva.impuestos ?? reserva.total_impuestos ?? 0) || 0;
  const subtotal = Number(reserva.subtotal ?? reserva.subtotal_hospedaje ?? total - impuestos) || 0;
  const saldoRestante = Math.max(0, total - totalPagos);
  const identidadLista = Boolean(formData.nombre.trim() && formData.apellidoPaterno.trim());
  const registroListo = aceptaTerminos && Boolean(firma);

  const steps = [
    { label: 'Huésped', icon: User, done: identidadLista },
    { label: 'Habitación', icon: BedDouble, done: Boolean(formData.habitacionId) },
    { label: 'Pago', icon: CircleDollarSign, done: saldoRestante <= 0 },
    { label: 'Firma', icon: PenLine, done: registroListo },
  ];

  return (
    <MainLayout
      title="Check-In"
      subtitle={`Reserva ${reserva.numero_reserva || reserva.id?.slice(0, 8)}`}
    >
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/reservas/checkin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Llegadas de hoy
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-7 rounded-full px-3 text-xs font-medium">
              {noches} {noches === 1 ? 'noche' : 'noches'}
            </Badge>
            {formData.habitacionId && (
              <Badge className="h-7 rounded-full px-3 text-xs font-medium">
                Hab. {selectedHabitacion?.numero || reserva.habitacion?.numero || reserva.habitacion_numero}
              </Badge>
            )}
          </div>
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
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Datos del huésped
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nombre</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Nombre del huésped"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Apellido paterno</Label>
                    <Input
                      value={formData.apellidoPaterno}
                      onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                      placeholder="Apellido paterno"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Documento</Label>
                    <Input
                      value={formData.documento}
                      onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                      placeholder="INE, pasaporte u otro"
                    />
                  </div>
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BedDouble className="h-5 w-5 text-primary" />
                  Habitación y estancia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-xl bg-muted/35 p-3 sm:grid-cols-3 sm:p-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tipo</p>
                    <p className="mt-1 text-sm font-semibold">
                      {reserva.tipo_habitacion_nombre || reserva.tipo_habitacion?.nombre || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entrada</p>
                    <p className="mt-1 text-sm font-semibold">{formatDate(reserva.fecha_checkin)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Salida</p>
                    <p className="mt-1 text-sm font-semibold">{formatDate(reserva.fecha_checkout)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Habitación asignada</Label>
                    <span className="text-xs text-muted-foreground">
                      {habitacionesDisponibles.length} disponibles
                    </span>
                  </div>
                  <Select
                    value={formData.habitacionId}
                    onValueChange={(v) => setFormData({ ...formData, habitacionId: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar habitación disponible" />
                    </SelectTrigger>
                    <SelectContent>
                      {habitacionesDisponibles.map((hab) => (
                        <SelectItem key={hab.id} value={hab.id}>
                          Hab. {hab.numero} · Piso {hab.piso}
                        </SelectItem>
                      ))}
                      {reserva.habitacion_id && (
                        <SelectItem value={reserva.habitacion_id}>
                          Hab. {reserva.habitacion?.numero || reserva.habitacion_numero} · Preasignada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Huéspedes</span>
                  <Badge variant="secondary">{reserva.adultos || 1} adulto(s)</Badge>
                  {(reserva.ninos || 0) > 0 && <Badge variant="secondary">{reserva.ninos} niño(s)</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <PenLine className="h-5 w-5 text-primary" />
                  Aceptación y firma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground sm:p-4">
                  El huésped confirma que sus datos son correctos y acepta las políticas del establecimiento,
                  horarios, cargos por daños, responsabilidad por objetos personales y el aviso de privacidad.
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30">
                  <Checkbox
                    checked={aceptaTerminos}
                    onCheckedChange={(v) => setAceptaTerminos(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Acepta términos y aviso de privacidad</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Requerido para finalizar el registro.
                    </p>
                  </div>
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label>Firma del huésped</Label>
                    {firma && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Firma capturada
                      </span>
                    )}
                  </div>
                  <SignaturePad onChange={setFirma} height={170} />
                </div>

                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileDown className="h-3.5 w-3.5" />
                  Al completar el check-in se genera automáticamente la tarjeta de registro en PDF.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-20">
            <Card className="overflow-hidden border-primary/20 shadow-sm">
              <div className="bg-primary px-5 py-4 text-primary-foreground">
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total de estancia</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(total)}</p>
                  <CreditCard className="mb-1 h-6 w-6 opacity-80" />
                </div>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Hospedaje ({noches} {noches === 1 ? 'noche' : 'noches'})</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Impuestos</span>
                    <span className="font-medium">{formatCurrency(impuestos)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">Capturado</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalPagos)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">Restante</span>
                    <span className="font-semibold">{formatCurrency(saldoRestante)}</span>
                  </div>
                </div>

                <Separator />

                <PagosMultiplesGrid total={total} pagos={pagos} onChange={setPagos} />

                <Button
                  className="h-11 w-full text-sm font-semibold"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.habitacionId || !aceptaTerminos || !firma}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando llegada...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Completar check-in
                    </>
                  )}
                </Button>

                {(!formData.habitacionId || !aceptaTerminos || !firma) && (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Para finalizar: asigna habitación, acepta términos y captura la firma.
                      </span>
                    </div>
                  </div>
                )}

                <Button variant="ghost" className="w-full" onClick={() => navigate('/reservas/checkin')}>
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
