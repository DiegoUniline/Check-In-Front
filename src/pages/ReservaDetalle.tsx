import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, BedDouble, CalendarDays, Clock3, DoorOpen, Ellipsis,
  LogOut, Mail, Pencil, Phone, RefreshCw, Users, WalletCards,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateFormat';
import {
  buildReservationLedger,
  getReservationAccountSummary,
  reservationMoney,
  type ReservationLedgerRow,
} from '@/lib/reservationFinancials';
import { canAccess } from '@/lib/permissions';
import { useAuth } from '@/contexts/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  StayOperationsPanel,
  type StayOperationsPanelHandle,
} from '@/components/reservas/StayOperationsPanel';
import { StayDeliverables } from '@/components/reservas/StayDeliverables';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const statusStyles: Record<string, string> = {
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800',
  Confirmada: 'border-blue-200 bg-blue-50 text-blue-800',
  CheckIn: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Hospedado: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CheckOut: 'border-slate-200 bg-slate-100 text-slate-700',
  Cancelada: 'border-red-200 bg-red-50 text-red-700',
  NoShow: 'border-orange-200 bg-orange-50 text-orange-800',
};

const guestCount = (reserva: any) =>
  reservationMoney(reserva?.adultos) + reservationMoney(reserva?.ninos);

export default function ReservaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const operationsRef = useRef<StayOperationsPanelHandle>(null);
  const [reserva, setReserva] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const [reservationData, roomData] = await Promise.all([
        api.getReserva(id),
        api.getHabitaciones(),
      ]);
      if (!reservationData) throw new Error('La reservación no existe o no pertenece al hotel activo');
      setReserva(reservationData);
      setRooms(roomData || []);
    } catch (error: any) {
      toast({ title: 'No se pudo abrir la reservación', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);
  useRealtimeSync('reservas', () => void load(true), { enabled: Boolean(id) });
  useRealtimeSync('cargos', () => void load(true), { enabled: Boolean(id) });
  useRealtimeSync('pagos', () => void load(true), { enabled: Boolean(id) });
  useRealtimeSync('habitaciones', () => void load(true), { enabled: Boolean(id) });
  useRealtimeSync('entregables_reserva', () => void load(true), { enabled: Boolean(id) });

  const ledger = useMemo(() => reserva ? buildReservationLedger(reserva) : [], [reserva]);
  const account = useMemo(() => reserva ? getReservationAccountSummary(reserva) : null, [reserva]);

  if (loading) {
    return <MainLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#10233F]" />
          <p className="mt-3 text-sm text-muted-foreground">Abriendo expediente…</p>
        </div>
      </div>
    </MainLayout>;
  }

  if (!reserva || !account) {
    return <MainLayout>
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-xl font-semibold">Reservación no encontrada</h1>
        <Button className="mt-4" onClick={() => navigate('/reservas')}>Volver a reservaciones</Button>
      </div>
    </MainLayout>;
  }

  const activeStay = ['CheckIn', 'Hospedado'].includes(String(reserva.estado || '')) && !reserva.checkout_realizado;
  const canCheckin = ['Pendiente', 'Confirmada'].includes(String(reserva.estado || '')) && !reserva.checkin_realizado;
  const canEditStay = canAccess('reservas.operacion.modify_dates', user?.rol)
    && !['Cancelada', 'NoShow', 'CheckOut'].includes(String(reserva.estado || ''));
  const canRegisterPayment = canAccess('reservas.operacion.partial_payment', user?.rol)
    && !['Cancelada', 'NoShow', 'CheckOut'].includes(String(reserva.estado || ''))
    && account.balance > 0.01;

  const refreshAll = async () => { await load(true); };
  const adults = reservationMoney(reserva.adultos);
  const children = reservationMoney(reserva.ninos);
  const totalGuests = guestCount(reserva);
  const nights = reservationMoney(reserva.noches) || 1;
  const arrivalTime = reserva.hora_llegada || reserva.hotel?.hora_checkin || 'Según política';
  const departureTime = reserva.hora_checkout || reserva.hotel?.hora_checkout || 'Según política';

  const consumptionTotal = account.activeCharges
    .filter((item: any) => item.venta_id || item.producto_id)
    .reduce((sum: number, item: any) => sum + reservationMoney(item.total ?? item.subtotal), 0);
  const otherAccountTotal = account.total - account.lodging - consumptionTotal;

  return <MainLayout>
    <div className="min-h-[calc(100dvh-4rem)] bg-[#F7F9FC] pb-24 lg:pb-6">
      <header className="sticky top-0 z-30 border-b border-[#10233F]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button variant="ghost" size="toolbar" className="w-9 shrink-0 px-0" onClick={() => navigate(-1)} aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <h1 className="max-w-[52vw] truncate text-base font-bold text-[#10233F] sm:max-w-none sm:text-lg">
                  {reserva.cliente_nombre || 'Huésped sin nombre'}
                </h1>
                <span className="text-xs font-semibold text-muted-foreground">#{reserva.numero_reserva || reserva.id.slice(0, 8)}</span>
                <Badge variant="outline" className={cn('h-5 border px-1.5 text-[10px]', statusStyles[reserva.estado])}>
                  {reserva.estado}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                Hab. {reserva.habitacion_numero || 'sin asignar'} · {formatDate(reserva.fecha_checkin)} → {formatDate(reserva.fecha_checkout)} · {adults} adulto{adults === 1 ? '' : 's'}{children > 0 ? ` · ${children} menor${children === 1 ? '' : 'es'}` : ''}
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <Button variant="ghost" size="toolbar" className="px-2" onClick={() => void load(true)} title="Actualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {canEditStay && <Button variant="outline" size="toolbar" onClick={() => operationsRef.current?.openOperation('modify_dates')}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
            </Button>}
            <Button variant="outline" size="toolbar" onClick={() => operationsRef.current?.openMoreOperations()}>
              <Ellipsis className="mr-1.5 h-4 w-4" />Más
            </Button>
            {canCheckin && <Button size="toolbar" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate(`/checkin/${reserva.id}`)}>
              <DoorOpen className="mr-1.5 h-4 w-4" />Check-in
            </Button>}
            {activeStay && <Button size="toolbar" className="bg-[#10233F] hover:bg-[#10233F]/90" onClick={() => navigate(`/checkout/${reserva.id}`)}>
              <LogOut className="mr-1.5 h-4 w-4" />Check-out
            </Button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-3 py-2.5 sm:px-6 lg:px-8">
        <StayOperationsPanel
          ref={operationsRef}
          reserva={reserva}
          habitaciones={rooms}
          onUpdate={refreshAll}
          initialOperationId={searchParams.get('operation')}
          initialCheckout={searchParams.get('checkout')}
          initialRoomId={searchParams.get('roomId')}
        >
          <div className="grid items-start gap-2.5 xl:grid-cols-[minmax(0,1fr)_318px]">
            <div className="min-w-0 space-y-2.5">
              <ReservationQuickSummary
                reserva={reserva}
                nights={nights}
                totalGuests={totalGuests}
                arrivalTime={arrivalTime}
                departureTime={departureTime}
              />

              <StayRoomSummary
                reserva={reserva}
                nights={nights}
                totalGuests={totalGuests}
                arrivalTime={arrivalTime}
                departureTime={departureTime}
              />

              {(reserva.solicitudes_especiales || reserva.notas_internas) && <section className="overflow-hidden rounded-[8px] border border-amber-200 bg-amber-50/60">
                {reserva.solicitudes_especiales && <NoteRow label="Solicitud especial" text={reserva.solicitudes_especiales} />}
                {reserva.notas_internas && <NoteRow label="Nota interna" text={reserva.notas_internas} divided={Boolean(reserva.solicitudes_especiales)} />}
              </section>}

              <ReservationLedger rows={ledger} />

              <StayDeliverables reservaId={reserva.id} active={activeStay || canCheckin} />
            </div>

            <ReservationAccountSummary
              lodging={account.lodging}
              consumption={consumptionTotal}
              other={otherAccountTotal}
              total={account.total}
              paid={account.paid}
              balance={account.balance}
              onPay={() => operationsRef.current?.openOperation('partial_payment')}
              canPay={canRegisterPayment}
            />
          </div>
        </StayOperationsPanel>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => operationsRef.current?.openMoreOperations()}>Más operaciones</Button>
          {canCheckin
            ? <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate(`/checkin/${reserva.id}`)}>Check-in</Button>
            : activeStay
              ? <Button className="bg-[#10233F] hover:bg-[#10233F]/90" onClick={() => navigate(`/checkout/${reserva.id}`)}>Check-out</Button>
              : <Button onClick={() => operationsRef.current?.openOperation('partial_payment')} disabled={!canRegisterPayment}>Registrar pago</Button>}
        </div>
      </div>
    </div>
  </MainLayout>;
}

function ReservationQuickSummary({
  reserva,
  nights,
  totalGuests,
  arrivalTime,
  departureTime,
}: {
  reserva: any;
  nights: number;
  totalGuests: number;
  arrivalTime: string;
  departureTime: string;
}) {
  return <section className="flex flex-wrap items-center gap-x-0 gap-y-1 overflow-hidden rounded-[8px] border border-slate-200/90 bg-white px-2.5 py-1.5">
    <Fact icon={CalendarDays} label="Estancia" value={`${nights} noche${nights === 1 ? '' : 's'}`} />
    <Fact icon={Clock3} label="Entrada" value={arrivalTime} />
    <Fact icon={Clock3} label="Salida" value={departureTime} />
    <Fact icon={Users} label="Huéspedes" value={String(totalGuests)} />
    <Fact icon={BedDouble} label="Origen" value={reserva.origen || 'Recepción'} />
    {(reserva.cliente_telefono || reserva.cliente?.telefono) && <a className="flex h-8 items-center gap-1.5 border-l px-2.5 text-[11px] text-[#10233F] hover:underline" href={`tel:${reserva.cliente_telefono || reserva.cliente?.telefono}`}>
      <Phone className="h-3.5 w-3.5" />{reserva.cliente_telefono || reserva.cliente?.telefono}
    </a>}
    {(reserva.cliente_email || reserva.cliente?.email) && <a className="flex h-8 min-w-0 items-center gap-1.5 border-l px-2.5 text-[11px] text-[#10233F] hover:underline" href={`mailto:${reserva.cliente_email || reserva.cliente?.email}`}>
      <Mail className="h-3.5 w-3.5 shrink-0" /><span className="max-w-48 truncate">{reserva.cliente_email || reserva.cliente?.email}</span>
    </a>}
  </section>;
}

function Fact({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="flex h-8 min-w-[104px] items-center gap-1.5 border-l first:border-l-0 px-2.5 first:pl-1">
    <Icon className="h-3 w-3 shrink-0 text-[#10233F]/75" />
    <div className="min-w-0">
      <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="truncate text-[11px] font-semibold text-[#10233F]">{value}</p>
    </div>
  </div>;
}

function StayRoomSummary({
  reserva,
  nights,
  totalGuests,
  arrivalTime,
  departureTime,
}: {
  reserva: any;
  nights: number;
  totalGuests: number;
  arrivalTime: string;
  departureTime: string;
}) {
  const typeName = reserva.tipo_habitacion?.nombre || reserva.tipo_habitacion_nombre || 'Sin categoría';
  const room = reserva.habitacion || {};

  return <section className="rounded-[8px] border border-slate-200/90 bg-white">
    <div className="flex items-center justify-between gap-3 border-b px-3.5 py-2">
      <h2 className="text-sm font-semibold text-[#10233F]">Estancia y habitación</h2>
      <div className="flex gap-1.5">
        {room.estado_limpieza && <Badge variant="outline" className="h-5 px-1.5 text-[9px]">{room.estado_limpieza}</Badge>}
        {room.estado_mantenimiento && <Badge variant="outline" className="h-5 px-1.5 text-[9px]">{room.estado_mantenimiento}</Badge>}
      </div>
    </div>
    <div className="grid gap-x-7 gap-y-2 px-3.5 py-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <DataPoint label="Entrada" value={`${formatDate(reserva.fecha_checkin)} · ${arrivalTime}`} />
      <DataPoint label="Salida" value={`${formatDate(reserva.fecha_checkout)} · ${departureTime}`} />
      <DataPoint label="Noches" value={String(nights)} />
      <DataPoint label="Huéspedes" value={String(totalGuests)} />
      <DataPoint label="Habitación" value={reserva.habitacion_numero ? `#${reserva.habitacion_numero}` : 'Sin asignar'} />
      <DataPoint label="Tipo" value={typeName} />
      <DataPoint label="Tarifa" value={formatCurrency(reserva.tarifa_noche)} />
      <DataPoint label="Piso" value={String(room.piso || '—')} />
    </div>
  </section>;
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[78px_minmax(0,1fr)] items-baseline gap-2 text-[11px] sm:text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="truncate font-medium text-foreground">{value}</span>
  </div>;
}

function ReservationLedger({ rows }: { rows: ReservationLedgerRow[] }) {
  return <section id="cuenta" className="scroll-mt-24 overflow-hidden rounded-[8px] border border-slate-200/90 bg-white">
    <div className="flex items-center justify-between border-b px-3.5 py-2">
      <div className="flex items-center gap-2">
        <WalletCards className="h-4 w-4 text-[#10233F]" />
        <div>
          <h2 className="text-sm font-semibold text-[#10233F]">Cuenta</h2>
          <p className="text-[11px] text-muted-foreground">Hospedaje, consumos, cargos y pagos en una sola secuencia.</p>
        </div>
      </div>
      <Badge variant="outline" className="h-5 px-1.5 text-[9px]">{rows.length} movimientos</Badge>
    </div>
    <div className="max-h-[248px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-white">
          <TableRow>
            <TableHead className="h-8 w-24 px-2 text-[10px]">Fecha</TableHead>
            <TableHead className="h-8 px-2 text-[10px]">Concepto</TableHead>
            <TableHead className="h-8 w-24 px-2 text-[10px]">Tipo</TableHead>
            <TableHead className="h-8 w-28 px-2 text-right text-[10px]">Cargo</TableHead>
            <TableHead className="h-8 w-28 px-2 text-right text-[10px]">Pago</TableHead>
            <TableHead className="h-8 w-28 px-2 text-right text-[10px]">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0
            ? <TableRow><TableCell colSpan={6} className="h-10 px-2 py-1.5 text-center text-xs text-muted-foreground">Sin movimientos financieros.</TableCell></TableRow>
            : rows.map((row) => <TableRow key={row.id} className={cn(row.cancelled && 'opacity-45')}>
              <TableCell className="px-2 py-1.5 whitespace-nowrap text-[11px] text-muted-foreground">{row.at ? formatDate(row.at) : '—'}</TableCell>
              <TableCell className="px-2 py-1.5">
                <div className="min-w-0">
                  <p className={cn('truncate text-xs font-semibold', row.cancelled && 'line-through')}>{row.concept}</p>
                  {row.cancelled && <p className="text-[10px] text-muted-foreground">Cancelado · sin efecto en saldo</p>}
                </div>
              </TableCell>
              <TableCell className="px-2 py-1.5"><Badge variant="outline" className="h-4 px-1.5 text-[9px]">{row.type}</Badge></TableCell>
              <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">{row.charge ? formatCurrency(row.charge) : '—'}</TableCell>
              <TableCell className="px-2 py-1.5 text-right text-xs font-medium tabular-nums text-emerald-700">{row.payment ? formatCurrency(row.payment) : '—'}</TableCell>
              <TableCell className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums">{formatCurrency(row.balance)}</TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>
  </section>;
}

function ReservationAccountSummary({
  lodging,
  consumption,
  other,
  total,
  paid,
  balance,
  onPay,
  canPay,
}: {
  lodging: number;
  consumption: number;
  other: number;
  total: number;
  paid: number;
  balance: number;
  onPay: () => void;
  canPay: boolean;
}) {
  return <aside className="order-first xl:order-none xl:sticky xl:top-[76px]">
    <section className="overflow-hidden rounded-[8px] border border-slate-300/80 bg-white">
      <div className="border-b px-3.5 py-2.5">
        <h2 className="text-sm font-bold text-[#10233F]">Estado de cuenta</h2>
      </div>
      <div className="space-y-2 px-3.5 py-2.5 text-sm">
        <AccountLine label="Hospedaje" value={lodging} />
        <AccountLine label="Consumos" value={consumption} />
        <AccountLine label="Otros / ajustes" value={other} />
        <Separator />
        <AccountLine label="Total" value={total} strong />
        <AccountLine label="Pagado" value={paid} accent />
        <div className={cn('mt-1 rounded-[6px] border px-2.5 py-2', balance > 0.01 ? 'border-orange-200 bg-orange-50/70' : 'border-emerald-200 bg-emerald-50/70')}>
          <div className="flex items-end justify-between gap-3">
            <span className={cn('text-xs font-semibold uppercase tracking-wide', balance > 0.01 ? 'text-orange-700' : 'text-emerald-700')}>
              {balance < -0.01 ? 'A favor' : 'Pendiente'}
            </span>
            <strong className={cn('text-xl tabular-nums', balance > 0.01 ? 'text-orange-800' : 'text-emerald-800')}>
              {formatCurrency(Math.abs(balance))}
            </strong>
          </div>
        </div>
        <Button size="toolbar" className="mt-1 w-full bg-[#10233F] text-xs hover:bg-[#10233F]/90" onClick={onPay} disabled={!canPay}>
          Registrar pago
        </Button>
      </div>
    </section>
  </aside>;
}

function AccountLine({ label, value, strong, accent }: { label: string; value: number; strong?: boolean; accent?: boolean }) {
  return <div className="flex items-center justify-between gap-3">
    <span className={cn('text-muted-foreground', strong && 'font-medium text-foreground')}>{label}</span>
    <span className={cn('tabular-nums', strong && 'font-bold text-[#10233F]', accent && 'font-semibold text-emerald-700')}>{formatCurrency(value)}</span>
  </div>;
}

function NoteRow({ label, text, divided = false }: { label: string; text: string; divided?: boolean }) {
  return <div className={cn('grid gap-1 px-3.5 py-2 sm:grid-cols-[132px_minmax(0,1fr)]', divided && 'border-t border-amber-200')}>
    <span className="text-xs font-semibold text-amber-900">{label}</span>
    <p className="line-clamp-2 whitespace-pre-wrap text-xs text-amber-900/80">{text}</p>
  </div>;
}
