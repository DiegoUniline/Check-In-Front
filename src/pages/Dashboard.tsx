import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BedDouble,
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  DoorOpen,
  Eye,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/useAuth';
import { useShift } from '@/contexts/useShift';
import api, { type OperationalAlert, type OperationalControl } from '@/lib/api';
import { formatCurrency, useCurrency } from '@/lib/currency';
import { canAccess } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type ShiftSummary = {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  otros: number;
  egresosEfectivo: number;
  movimientos: any[];
};

type WorkItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  action: string;
  actionLabel: string;
  priority: 'critical' | 'warning' | 'scheduled';
  order: number;
  icon: typeof AlertTriangle;
};

const EMPTY_SHIFT_SUMMARY: ShiftSummary = {
  efectivo: 0,
  tarjeta: 0,
  transferencia: 0,
  otros: 0,
  egresosEfectivo: 0,
  movimientos: [],
};

const inactiveReservationStates = new Set([
  'cancelada',
  'finalizada',
  'completada',
  'checkout',
  'check out',
  'noshow',
  'no show',
]);

const getGuestName = (reservation: any) => {
  const nested = reservation?.cliente || reservation?.clientes;
  const name = nested?.nombre || reservation?.cliente_nombre || reservation?.nombre || 'Huésped';
  const surname = nested?.apellido_paterno || nested?.apellidoPaterno || reservation?.apellido_paterno || '';
  return `${name} ${surname}`.trim();
};

const getRoomNumber = (reservation: any) => (
  reservation?.habitacion?.numero
  || reservation?.habitaciones?.numero
  || reservation?.habitacion_numero
  || 'Por asignar'
);

const formatTime = (value?: string | null) => {
  if (!value) return 'Hora por confirmar';
  const raw = String(value);
  const isoDate = new Date(raw);
  if (!Number.isNaN(isoDate.getTime()) && raw.includes('T')) {
    return new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(isoDate);
  }
  return raw.slice(0, 5);
};

const shiftDuration = (startedAt?: string | null, now = Date.now()) => {
  if (!startedAt) return 'Turno activo';
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return 'Turno activo';
  const minutes = Math.max(0, Math.floor((now - start) / 60_000));
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} min en operación`;
  return `${hours} h ${remaining} min en operación`;
};

const toneByPriority = {
  critical: {
    icon: 'bg-red-50 text-red-600 ring-red-100',
    badge: 'border-red-200 bg-red-50 text-red-700',
    label: 'Ahora',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Atención',
  },
  scheduled: {
    icon: 'bg-[#10233F]/5 text-[#10233F] ring-[#10233F]/10',
    badge: 'border-[#10233F]/10 bg-[#10233F]/5 text-[#10233F]',
    label: 'Hoy',
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openShift, shiftRequired, viewOnlyMode } = useShift();
  useCurrency();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [sales, setSales] = useState({ total: 0, count: 0 });
  const [control, setControl] = useState<OperationalControl | null>(null);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary>(EMPTY_SHIFT_SUMMARY);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const results = await Promise.allSettled([
        api.getDashboardStats(),
        api.getDashboardCheckinsHoy(),
        api.getDashboardCheckoutsHoy(),
        api.getDashboardVentasHoy(),
        api.getHabitaciones(),
        api.getReservas(),
        api.getOperationalControl(),
      ]);

      const [statsResult, checkinsResult, checkoutsResult, salesResult, roomsResult, reservationsResult, controlResult] = results;
      if (statsResult.status === 'fulfilled') setStats(statsResult.value || {});
      if (checkinsResult.status === 'fulfilled') setCheckins(Array.isArray(checkinsResult.value) ? checkinsResult.value : []);
      if (checkoutsResult.status === 'fulfilled') setCheckouts(Array.isArray(checkoutsResult.value) ? checkoutsResult.value : []);
      if (salesResult.status === 'fulfilled') {
        setSales({
          total: Number(salesResult.value?.total || 0),
          count: Number(salesResult.value?.count || 0),
        });
      }
      if (roomsResult.status === 'fulfilled') setRooms(Array.isArray(roomsResult.value) ? roomsResult.value : []);
      if (reservationsResult.status === 'fulfilled') setReservations(Array.isArray(reservationsResult.value) ? reservationsResult.value : []);
      if (controlResult.status === 'fulfilled') setControl(controlResult.value || null);

      if (openShift?.id) {
        try {
          setShiftSummary(await api.getShiftFinancialSummary(openShift.id, openShift.abierto_at));
        } catch {
          setShiftSummary(EMPTY_SHIFT_SUMMARY);
        }
      } else {
        setShiftSummary(EMPTY_SHIFT_SUMMARY);
      }
      setUpdatedAt(new Date());
    } catch (error) {
      console.error('No se pudo actualizar el inicio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [openShift?.abierto_at, openShift?.id]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer = 0;
    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(true), 180);
    };
    window.addEventListener('data:changed', onChange);
    window.addEventListener('vulo:bitacora-updated', onChange);
    window.addEventListener('vulo:shift-changed', onChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('data:changed', onChange);
      window.removeEventListener('vulo:bitacora-updated', onChange);
      window.removeEventListener('vulo:shift-changed', onChange);
    };
  }, [load]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date()), []);

  const operatorName = `${user?.nombre || ''} ${user?.apellidoPaterno || ''}`.trim() || user?.email || 'Equipo VULO';
  const firstName = user?.nombre?.trim().split(/\s+/)[0] || 'equipo';
  const isManager = canAccess('reportes', user?.rol);
  const readOnly = shiftRequired && !openShift && viewOnlyMode;

  const roomSummary = useMemo(() => {
    const normalized = rooms.map((room) => ({
      status: String(room.estado_habitacion ?? room.estadoHabitacion ?? '').toLowerCase(),
      cleaning: String(room.estado_limpieza ?? room.estadoLimpieza ?? '').toLowerCase(),
      maintenance: String(room.estado_mantenimiento ?? room.estadoMantenimiento ?? '').toLowerCase(),
    }));
    return {
      total: normalized.length || Number(stats.total_habitaciones || stats.habitaciones_total || 0),
      occupied: normalized.filter(({ status }) => status === 'ocupada').length || Number(stats.ocupadas || stats.habitaciones_ocupadas || 0),
      ready: normalized.filter(({ status, cleaning, maintenance }) => (
        status === 'disponible'
        && (!cleaning || cleaning === 'limpia')
        && (!maintenance || maintenance === 'ok')
      )).length,
      cleaning: normalized.filter(({ cleaning }) => cleaning && cleaning !== 'limpia').length,
      maintenance: normalized.filter(({ status, maintenance }) => status === 'mantenimiento' || (maintenance && maintenance !== 'ok')).length,
    };
  }, [rooms, stats]);

  const pendingBalance = useMemo(() => reservations.reduce((sum, reservation) => {
    const state = String(reservation.estado || '').toLowerCase();
    if (inactiveReservationStates.has(state)) return sum;
    return sum + Math.max(0, Number(reservation.saldo_pendiente || 0));
  }, 0), [reservations]);

  const workItems = useMemo<WorkItem[]>(() => {
    const alerts: WorkItem[] = (control?.alerts || [])
      .filter((alert: OperationalAlert) => alert.id !== 'shift')
      .map((alert: OperationalAlert) => ({
        id: `alert-${alert.id}`,
        title: alert.title,
        detail: alert.detail,
        meta: `${alert.count} ${alert.count === 1 ? 'caso' : 'casos'}`,
        action: alert.action,
        actionLabel: alert.actionLabel,
        priority: alert.priority === 'critical' ? 'critical' : 'warning',
        order: alert.priority === 'critical' ? 0 : 10,
        icon: alert.priority === 'critical' ? AlertTriangle : ShieldCheck,
      }));

    const departures: WorkItem[] = checkouts.map((reservation, index) => ({
      id: `checkout-${reservation.id}`,
      title: getGuestName(reservation),
      detail: `Salida · Habitación ${getRoomNumber(reservation)}`,
      meta: formatTime(reservation.hora_checkout || reservation.hora_salida),
      action: `/checkout/${reservation.id}`,
      actionLabel: 'Completar salida',
      priority: 'scheduled',
      order: 20 + index,
      icon: LogOut,
    }));

    const arrivals: WorkItem[] = checkins.map((reservation, index) => ({
      id: `checkin-${reservation.id}`,
      title: getGuestName(reservation),
      detail: `Llegada · Habitación ${getRoomNumber(reservation)}`,
      meta: formatTime(reservation.horaLlegada || reservation.hora_llegada),
      action: `/checkin/${reservation.id}`,
      actionLabel: 'Recibir huésped',
      priority: 'scheduled',
      order: 30 + index,
      icon: LogIn,
    }));

    return [...alerts, ...departures, ...arrivals]
      .sort((a, b) => a.order - b.order)
      .slice(0, 9);
  }, [checkins, checkouts, control?.alerts]);

  const totalShiftIncome = shiftSummary.efectivo + shiftSummary.tarjeta + shiftSummary.transferencia + shiftSummary.otros;
  const expectedCash = Number(openShift?.fondo_inicial || 0) + shiftSummary.efectivo - shiftSummary.egresosEfectivo;
  const attentionCount = (control?.criticalCount || 0) + (control?.warningCount || 0);
  const occupancy = roomSummary.total ? Math.round((roomSummary.occupied / roomSummary.total) * 100) : 0;

  if (loading) {
    return (
      <MainLayout title="Inicio" subtitle="Preparando el turno">
        <div className="mx-auto max-w-[1600px] animate-pulse space-y-4">
          <div className="h-36 rounded-3xl bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl bg-muted" />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-[420px] rounded-3xl bg-muted" />
            <div className="h-[420px] rounded-3xl bg-muted" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Inicio" subtitle="Tu operación de hoy" fullWidth>
      <div className="mx-auto max-w-[1600px] space-y-4 pb-8 lg:space-y-5">
        <section className={cn(
          'relative overflow-hidden rounded-3xl border px-5 py-5 shadow-sm sm:px-6 lg:px-7',
          readOnly
            ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white text-[#10233F]'
            : 'border-[#10233F] bg-[#10233F] text-white',
        )}>
          {!readOnly && <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />}
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className={cn('mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]', readOnly ? 'text-amber-700' : 'text-white/60')}>
                <CalendarCheck2 className="h-4 w-4" />
                <span className="capitalize">{dateLabel}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Buen día, {firstName}</h1>
              <p className={cn('mt-1.5 max-w-2xl text-sm', readOnly ? 'text-slate-600' : 'text-white/65')}>
                {readOnly
                  ? 'Estás revisando el hotel sin turno. Puedes consultar información, pero no registrar operaciones.'
                  : attentionCount
                    ? `Hay ${attentionCount} ${attentionCount === 1 ? 'situación que requiere' : 'situaciones que requieren'} seguimiento.`
                    : 'La operación está bajo control. Revisa los siguientes movimientos del día.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className={cn('flex min-w-[230px] items-center gap-3 rounded-2xl border px-4 py-3', readOnly ? 'border-amber-200 bg-white' : 'border-white/10 bg-white/[0.07]')}>
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', readOnly ? 'bg-amber-100 text-amber-700' : 'bg-emerald-400/15 text-emerald-300')}>
                  {readOnly ? <Eye className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{readOnly ? 'Modo sólo consulta' : openShift ? 'Turno abierto' : 'Operación disponible'}</p>
                  <p className={cn('truncate text-xs', readOnly ? 'text-slate-500' : 'text-white/55')}>
                    {readOnly ? 'Abre turno para operar' : openShift ? shiftDuration(openShift.abierto_at, now) : operatorName}
                  </p>
                </div>
              </div>
              <Button asChild className={cn('h-11 rounded-xl px-4 font-semibold', readOnly ? 'bg-[#10233F] text-white hover:bg-[#10233F]/90' : 'bg-white text-[#10233F] hover:bg-white/90')}>
                <Link to="/turnos">{readOnly ? 'Abrir turno' : 'Ver mi turno'}<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Llegadas por recibir',
              value: checkins.length,
              detail: checkins.length ? 'Programadas para hoy' : 'Sin llegadas pendientes',
              icon: LogIn,
              tone: 'bg-emerald-50 text-emerald-700',
              action: '/reservas/checkin',
            },
            {
              label: 'Salidas por completar',
              value: checkouts.length,
              detail: checkouts.length ? 'Revisar folio y saldo' : 'Sin salidas pendientes',
              icon: LogOut,
              tone: 'bg-orange-50 text-orange-700',
              action: '/reservas/checkout',
            },
            {
              label: 'Habitaciones listas',
              value: `${roomSummary.ready}/${roomSummary.total}`,
              detail: roomSummary.cleaning ? `${roomSummary.cleaning} requieren limpieza` : 'Inventario listo para vender',
              icon: BedDouble,
              tone: 'bg-blue-50 text-blue-700',
              action: '/habitaciones',
            },
            {
              label: 'Saldo por cobrar',
              value: formatCurrency(pendingBalance),
              detail: control?.alerts.find((alert) => alert.id === 'balances')?.count
                ? `${control.alerts.find((alert) => alert.id === 'balances')?.count} reservas activas`
                : 'Sin saldos pendientes',
              icon: CircleDollarSign,
              tone: 'bg-red-50 text-red-700',
              action: '/reservas?focus=balances',
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              data-shift-readonly-allow="true"
              onClick={() => navigate(item.action)}
              className="group flex min-h-24 items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#10233F]/20 hover:shadow-md"
            >
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', item.tone)}><item.icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-muted-foreground">{item.label}</span>
                <span className={cn('mt-0.5 block font-semibold tracking-tight text-foreground', item.label === 'Saldo por cobrar' ? 'text-xl' : 'text-2xl')}>{item.value}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-[#10233F]" />
            </button>
          ))}
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-[#10233F]">Qué sigue</h2>
                  {attentionCount > 0 && <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">{attentionCount} por atender</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">Prioridades y movimientos de hoy, ordenados para actuar.</p>
              </div>
              <div className="flex items-center gap-2">
                {updatedAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
                    Actualizado {new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(updatedAt)}
                  </span>
                )}
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => void load()} disabled={refreshing} aria-label="Actualizar inicio">
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </Button>
              </div>
            </div>

            {!workItems.length ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
                <h3 className="mt-4 font-semibold text-[#10233F]">Todo está bajo control</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">No hay alertas, llegadas ni salidas pendientes para este momento.</p>
                {!readOnly && (
                  <Button asChild className="mt-5 rounded-xl bg-[#10233F] hover:bg-[#10233F]/90">
                    <Link to="/reservas/nueva"><CalendarPlus className="mr-2 h-4 w-4" />Nueva reserva</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {workItems.map((item) => {
                  const tone = toneByPriority[item.priority];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.action)}
                      className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 sm:gap-4 sm:px-6"
                    >
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1', tone.icon)}><item.icon className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-semibold text-[#10233F]">{item.title}</span>
                          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] font-semibold', tone.badge)}>{tone.label}</Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <span className="block text-xs font-semibold text-foreground">{item.meta}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{item.actionLabel}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:translate-x-0.5 group-hover:text-[#10233F]" />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50/70 px-5 py-3 sm:px-6">
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-[#10233F]">
                <Search className="h-3.5 w-3.5" />Buscar huésped, reserva o habitación
              </button>
              <Link to="/reservas" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10233F] hover:underline">Abrir recepción<ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>

          <aside className="overflow-hidden rounded-3xl border border-[#10233F]/10 bg-[#10233F] text-white shadow-lg shadow-[#10233F]/10 xl:sticky xl:top-4">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-white/55">Mi turno y caja</p>
                  <h2 className="mt-0.5 text-lg font-semibold">{openShift ? operatorName : 'Sin turno abierto'}</h2>
                </div>
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', openShift ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/70')}><WalletCards className="h-5 w-5" /></span>
              </div>
              <p className="mt-2 text-xs text-white/55">{openShift ? shiftDuration(openShift.abierto_at, now) : 'Consulta disponible; las operaciones requieren apertura.'}</p>
            </div>

            {openShift ? (
              <div className="p-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs text-white/55">Efectivo esperado en caja</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">{formatCurrency(expectedCash)}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs">
                    <div><p className="text-white/45">Fondo</p><p className="mt-0.5 font-semibold">{formatCurrency(openShift.fondo_inicial || 0)}</p></div>
                    <div><p className="text-white/45">Efectivo</p><p className="mt-0.5 font-semibold text-emerald-300">+{formatCurrency(shiftSummary.efectivo)}</p></div>
                    <div><p className="text-white/45">Egresos</p><p className="mt-0.5 font-semibold text-red-300">-{formatCurrency(shiftSummary.egresosEfectivo)}</p></div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between"><span className="text-white/55">Ingresos del turno</span><span className="font-semibold">{formatCurrency(totalShiftIncome)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-white/55">Tarjeta</span><span>{formatCurrency(shiftSummary.tarjeta)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-white/55">Transferencia</span><span>{formatCurrency(shiftSummary.transferencia)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-white/55">Movimientos</span><span>{shiftSummary.movimientos.length}</span></div>
                </div>

                <Button asChild className="mt-5 h-11 w-full rounded-xl bg-white font-semibold text-[#10233F] hover:bg-white/90">
                  <Link to="/turnos">Revisar y cerrar turno<ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            ) : (
              <div className="p-5">
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.04] p-5 text-center">
                  <Eye className="mx-auto h-7 w-7 text-white/60" />
                  <p className="mt-3 text-sm font-semibold">El hotel está en modo consulta</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">Abre tu turno para crear reservas, cobrar, editar o registrar movimientos.</p>
                </div>
                <Button asChild className="mt-4 h-11 w-full rounded-xl bg-white font-semibold text-[#10233F] hover:bg-white/90">
                  <Link to="/turnos">Abrir turno ahora<ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs">
              <span className="text-white/50">Cierre operativo de hoy</span>
              <span className={cn('font-semibold', control?.dayClosure?.estado === 'Cerrado' ? 'text-emerald-300' : 'text-amber-300')}>
                {control?.dayClosure?.estado === 'Cerrado' ? 'Completado' : 'Pendiente'}
              </span>
            </div>
          </aside>
        </section>

        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#10233F]/5 text-[#10233F]"><DoorOpen className="h-5 w-5" /></span>
              <div>
                <h2 className="text-sm font-semibold text-[#10233F]">Estado de habitaciones</h2>
                <p className="text-xs text-muted-foreground">Disponibilidad operativa en este momento.</p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-3xl">
              {[
                { label: 'Listas', value: roomSummary.ready, icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Ocupadas', value: roomSummary.occupied, icon: BedDouble, color: 'text-[#10233F]' },
                { label: 'Por limpiar', value: roomSummary.cleaning, icon: Sparkles, color: 'text-blue-600' },
                { label: 'Mantenimiento', value: roomSummary.maintenance, icon: Wrench, color: 'text-orange-600' },
              ].map((item) => (
                <button key={item.label} type="button" data-shift-readonly-allow="true" onClick={() => navigate('/habitaciones')} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-slate-100">
                  <item.icon className={cn('h-4 w-4', item.color)} />
                  <span><strong className="mr-1 text-sm text-foreground">{item.value}</strong><span className="text-xs text-muted-foreground">{item.label}</span></span>
                </button>
              ))}
            </div>
            <Button asChild variant="outline" className="h-10 shrink-0 rounded-xl"><Link to="/habitaciones">Ver habitaciones<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>

        {isManager && (
          <section className="rounded-3xl border bg-card p-5 shadow-sm sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Lectura gerencial</p>
                <h2 className="mt-1 text-base font-semibold text-[#10233F]">Resultados de hoy</h2>
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
                <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><BedDouble className="h-3.5 w-3.5" />Ocupación actual</p><p className="mt-1 text-xl font-semibold text-[#10233F]">{occupancy}%</p></div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Banknote className="h-3.5 w-3.5" />Ventas POS</p><p className="mt-1 text-xl font-semibold text-[#10233F]">{formatCurrency(sales.total)}</p></div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><WalletCards className="h-3.5 w-3.5" />Operaciones POS</p><p className="mt-1 text-xl font-semibold text-[#10233F]">{sales.count}</p></div>
              </div>
              <Button asChild variant="outline" className="h-10 shrink-0 rounded-xl"><Link to="/reportes">Ver reportes<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </section>
        )}

        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 sm:hidden">
          {!readOnly && (
            <Button asChild className="h-12 rounded-full bg-[#10233F] px-5 font-semibold text-white shadow-xl hover:bg-[#10233F]/90">
              <Link to="/reservas/nueva"><CalendarPlus className="mr-2 h-4 w-4" />Nueva reserva</Link>
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
