import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  FileText,
  Globe,
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
import api, { todayLocal, type OperationalAlert, type OperationalControl } from '@/lib/api';
import { isInHouseStay, occupiesNight } from '@/lib/stayOccupancy';
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
  const [webPendientes, setWebPendientes] = useState(0);
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
        api.getReservasOnlinePendientes(),
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
      const webResult = results[7];
      if (webResult?.status === 'fulfilled') setWebPendientes(Array.isArray(webResult.value) ? webResult.value.length : 0);

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


  const totalShiftIncome = shiftSummary.efectivo + shiftSummary.tarjeta + shiftSummary.transferencia + shiftSummary.otros;
  const expectedCash = Number(openShift?.fondo_inicial || 0) + shiftSummary.efectivo - shiftSummary.egresosEfectivo;
  const attentionCount = (control?.criticalCount || 0) + (control?.warningCount || 0);
  const occupancy = roomSummary.total ? Math.round((roomSummary.occupied / roomSummary.total) * 100) : 0;

  const todayKey = todayLocal();

  const roomTiles = useMemo(() => {
    return [...rooms]
      .sort((a, b) => String(a.numero).localeCompare(String(b.numero), undefined, { numeric: true }))
      .map((room) => {
        const maintenance = String(room.estado_mantenimiento || 'OK').toLowerCase() !== 'ok'
          || ['Mantenimiento', 'FueraDeServicio', 'Bloqueada'].includes(String(room.estado_habitacion || ''));
        const stay = reservations.find((r) => (r.habitacion_id || r.habitaciones?.id) === room.id && occupiesNight(r, todayKey, todayKey));
        const clean = ['limpia', 'lista'].some((v) => String(room.estado_limpieza || 'Limpia').toLowerCase().includes(v));
        const status: 'mantenimiento' | 'ocupada' | 'llega' | 'sucia' | 'libre' = maintenance
          ? 'mantenimiento'
          : stay && isInHouseStay(stay) ? 'ocupada'
          : stay ? 'llega'
          : !clean ? 'sucia' : 'libre';
        return { room, status, stay };
      });
  }, [rooms, reservations, todayKey]);

  const tileTone: Record<string, string> = {
    libre: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    ocupada: 'border-[#10233F] bg-[#10233F] text-white hover:bg-[#10233F]/90',
    llega: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
    sucia: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    mantenimiento: 'border-zinc-300 bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
  };
  const tileLabel: Record<string, string> = { libre: 'Libre', ocupada: 'Ocupada', llega: 'Llega hoy', sucia: 'Por limpiar', mantenimiento: 'Mantenimiento' };

  const inHouse = useMemo(() => reservations.filter((r) => isInHouseStay(r)).length, [reservations]);

  const nextDays = useMemo(() => {
    const total = rooms.length || 1;
    const base = new Date(`${todayKey}T12:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rooms = new Set(reservations.filter((r) => occupiesNight(r, key, todayKey)).map((r) => r.habitacion_id || r.habitaciones?.id));
      const pct = Math.min(100, Math.round((rooms.size / total) * 100));
      return {
        key,
        label: i === 0 ? 'Hoy' : new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(d).replace('.', ''),
        day: d.getDate(),
        count: rooms.size,
        pct,
      };
    });
  }, [reservations, rooms.length, todayKey]);

  const facturasPendientes = useMemo(() => reservations.filter((r) => r.requiere_factura && (r.factura_estado || 'Pendiente') === 'Pendiente' && r.estado !== 'Cancelada').length, [reservations]);

  const pendientes = [
    { label: 'Reservas web por confirmar', count: webPendientes, icon: Globe, to: '/reservas-online', tone: 'text-blue-600' },
    { label: 'Facturas pendientes', count: facturasPendientes, icon: FileText, to: '/facturacion', tone: 'text-amber-600' },
    { label: 'Habitaciones en mantenimiento', count: roomSummary.maintenance, icon: Wrench, to: '/mantenimiento', tone: 'text-zinc-600' },
    { label: 'Habitaciones por limpiar', count: roomSummary.cleaning, icon: Sparkles, to: '/limpieza', tone: 'text-sky-600' },
    ...(control?.alerts || []).filter((a: OperationalAlert) => a.id !== 'shift' && a.id !== 'balances').map((a: OperationalAlert) => ({
      label: a.title, count: a.count, icon: a.priority === 'critical' ? AlertTriangle : ShieldCheck, to: a.action, tone: a.priority === 'critical' ? 'text-red-600' : 'text-amber-600',
    })),
  ];
  const pendientesActivos = pendientes.filter((p) => p.count > 0);

  if (loading) {
    return (
      <MainLayout title="Inicio" subtitle="Preparando el turno" fullWidth>
        <div className="animate-pulse space-y-3 p-1">
          <div className="h-12 rounded-lg bg-muted" />
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-lg bg-muted" />)}</div>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">{[0, 1, 2].map((i) => <div key={i} className="h-72 rounded-lg bg-muted" />)}</div>
        </div>
      </MainLayout>
    );
  }

  const kpis = [
    { label: 'Llegadas hoy', value: checkins.length, icon: LogIn, tone: 'text-emerald-600', to: '/reservas/checkin' },
    { label: 'Salidas hoy', value: checkouts.length, icon: LogOut, tone: 'text-orange-600', to: '/reservas/checkout' },
    { label: 'Hospedados', value: inHouse, icon: BedDouble, tone: 'text-[#10233F]', to: '/reservas' },
    { label: 'Listas para vender', value: `${roomSummary.ready}/${roomSummary.total}`, icon: CheckCircle2, tone: 'text-emerald-600', to: '/habitaciones' },
    { label: 'Ocupación', value: `${occupancy}%`, icon: CalendarCheck2, tone: 'text-sky-600', to: '/reservas' },
    { label: 'Saldo por cobrar', value: formatCurrency(pendingBalance), icon: CircleDollarSign, tone: 'text-red-600', to: '/reservas?focus=balances' },
  ];

  const StayList = ({ title, icon: Icon, items, kind }: { title: string; icon: typeof LogIn; items: any[]; kind: 'in' | 'out' }) => (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#10233F]"><Icon className={cn('h-4 w-4', kind === 'in' ? 'text-emerald-600' : 'text-orange-600')} />{title}<span className="rounded bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{items.length}</span></p>
        <Link to={kind === 'in' ? '/reservas/checkin' : '/reservas/checkout'} className="text-[11px] font-medium text-muted-foreground hover:text-[#10233F]">Ver todas</Link>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-8 text-center text-xs text-muted-foreground">{kind === 'in' ? 'Sin llegadas pendientes hoy' : 'Sin salidas pendientes hoy'}</p>
      ) : (
        <div className="max-h-[320px] divide-y overflow-y-auto">
          {items.map((r) => {
            const saldo = Math.max(0, Number(r.saldo_pendiente || 0));
            return (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2">
                <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums">{getRoomNumber(r)}</span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/reservas/detalle/${r.id}`)}>
                  <p className="truncate text-sm font-medium">{getGuestName(r)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {kind === 'in' ? formatTime(r.horaLlegada || r.hora_llegada) : formatTime(r.hora_checkout || r.hora_salida)}
                    {saldo > 0 ? <span className="text-red-600"> · saldo {formatCurrency(saldo)}</span> : ' · sin saldo'}
                  </p>
                </button>
                {!readOnly && (
                  <Button size="sm" className={cn('h-7 shrink-0 px-2.5 text-xs', kind === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#10233F] hover:bg-[#10233F]/90')} onClick={() => navigate(kind === 'in' ? `/checkin/${r.id}` : `/checkout/${r.id}`)}>
                    {kind === 'in' ? 'Check-in' : 'Check-out'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <MainLayout title="Inicio" subtitle="Tu operación de hoy" fullWidth>
      <div className="space-y-3 pb-8">
        {/* Barra superior */}
        <section className={cn('flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2', readOnly ? 'border-amber-200 bg-amber-50' : 'bg-card')}>
          <div className="mr-auto min-w-0">
            <p className="text-sm font-semibold text-[#10233F]">Buen día, {firstName}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{dateLabel}</p>
          </div>
          <Link to="/turnos" className={cn('flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium', readOnly ? 'border-amber-300 bg-white text-amber-800' : openShift ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-muted')}>
            {readOnly ? <Eye className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
            {readOnly ? 'Sólo consulta · abrir turno' : openShift ? `Turno abierto · ${shiftDuration(openShift.abierto_at, now).replace(' en operación', '')}` : 'Sin turno'}
          </Link>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}><Search className="h-3.5 w-3.5" />Buscar</Button>
          {!readOnly && <>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Link to="/reservas/checkout"><LogOut className="h-3.5 w-3.5" />Check-out</Link></Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Link to="/reservas/nueva?origin=Recepcion"><LogIn className="h-3.5 w-3.5" />Entrada hoy</Link></Button>
            <Button asChild size="sm" className="h-8 gap-1.5 bg-[#10233F] text-xs hover:bg-[#10233F]/90"><Link to="/reservas/nueva"><CalendarPlus className="h-3.5 w-3.5" />Nueva reserva</Link></Button>
          </>}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void load()} disabled={refreshing} aria-label="Actualizar" title={updatedAt ? `Actualizado ${new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(updatedAt)}` : 'Actualizar'}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
        </section>

        {/* Indicadores */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <button key={k.label} type="button" data-shift-readonly-allow="true" onClick={() => navigate(k.to)} className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left transition hover:border-[#10233F]/30">
              <k.icon className={cn('h-4 w-4 shrink-0', k.tone)} />
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-muted-foreground">{k.label}</span>
                <span className="block truncate text-lg font-semibold leading-tight tabular-nums">{k.value}</span>
              </span>
            </button>
          ))}
        </section>

        {/* Llegadas, salidas y turno */}
        <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
          <StayList title="Llegan hoy" icon={LogIn} items={checkins} kind="in" />
          <StayList title="Salen hoy" icon={LogOut} items={checkouts} kind="out" />

          <aside className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#10233F]"><WalletCards className="h-4 w-4" />Mi turno y caja</p>
              <span className={cn('text-[11px] font-medium', control?.dayClosure?.estado === 'Cerrado' ? 'text-emerald-600' : 'text-amber-600')}>
                Cierre del día: {control?.dayClosure?.estado === 'Cerrado' ? 'hecho' : 'pendiente'}
              </span>
            </div>
            {openShift ? (
              <div className="space-y-2 p-3 text-sm">
                <div className="rounded-md bg-[#10233F] p-3 text-white">
                  <p className="text-[11px] text-white/60">Efectivo esperado en caja</p>
                  <p className="text-2xl font-semibold tabular-nums">{formatCurrency(expectedCash)}</p>
                  <p className="mt-1 text-[11px] text-white/60">Fondo {formatCurrency(openShift.fondo_inicial || 0)} · <span className="text-emerald-300">+{formatCurrency(shiftSummary.efectivo)}</span> · <span className="text-red-300">−{formatCurrency(shiftSummary.egresosEfectivo)}</span></p>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ingresos del turno</span><span className="font-semibold tabular-nums">{formatCurrency(totalShiftIncome)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tarjeta</span><span className="tabular-nums">{formatCurrency(shiftSummary.tarjeta)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Transferencia</span><span className="tabular-nums">{formatCurrency(shiftSummary.transferencia)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Movimientos</span><span className="tabular-nums">{shiftSummary.movimientos.length}</span></div>
                <Button asChild size="sm" variant="outline" className="mt-1 h-8 w-full text-xs"><Link to="/turnos">Revisar y cerrar turno<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
              </div>
            ) : (
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Abre tu turno para cobrar, reservar y registrar movimientos.</p>
                <Button asChild size="sm" className="mt-2 h-8 w-full bg-[#10233F] text-xs hover:bg-[#10233F]/90"><Link to="/turnos">Abrir turno<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
              </div>
            )}
            {isManager && (
              <div className="grid grid-cols-2 gap-2 border-t p-3 text-xs">
                <div><p className="text-muted-foreground">Ventas POS hoy</p><p className="font-semibold tabular-nums">{formatCurrency(sales.total)}</p></div>
                <div><p className="text-muted-foreground">Operaciones POS</p><p className="font-semibold tabular-nums">{sales.count}</p></div>
              </div>
            )}
          </aside>
        </section>

        {/* Habitaciones, próximos días y pendientes */}
        <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_320px]">
          <div className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#10233F]"><DoorOpen className="h-4 w-4" />Habitaciones ahora</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                {Object.entries(tileLabel).map(([k, label]) => (
                  <span key={k} className="flex items-center gap-1"><span className={cn('h-2.5 w-2.5 rounded-sm border', tileTone[k].split(' hover:')[0])} />{label}</span>
                ))}
              </div>
            </div>
            <div className="grid max-h-[300px] grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5 overflow-y-auto p-3">
              {roomTiles.map(({ room, status, stay }) => (
                <button
                  key={room.id}
                  type="button"
                  data-shift-readonly-allow="true"
                  title={`Hab. ${room.numero} · ${room.tipo_nombre || ''} · ${tileLabel[status]}${stay ? ` · ${getGuestName(stay)}` : ''}`}
                  onClick={() => navigate(stay ? `/reservas/detalle/${stay.id}` : '/habitaciones')}
                  className={cn('h-10 rounded-md border text-xs font-semibold tabular-nums transition', tileTone[status])}
                >
                  {room.numero}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-3 py-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#10233F]"><CalendarCheck2 className="h-4 w-4" />Ocupación próximos 7 días</p>
            </div>
            <div className="flex h-[196px] items-end gap-2 px-3 pb-3 pt-4">
              {nextDays.map((d) => (
                <button key={d.key} type="button" data-shift-readonly-allow="true" onClick={() => navigate('/reservas')} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.count} habitaciones ocupadas`}>
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{d.pct}%</span>
                  <span className="flex w-full flex-1 items-end rounded-sm bg-muted">
                    <span className={cn('w-full rounded-sm transition-all group-hover:opacity-80', d.pct >= 80 ? 'bg-emerald-600' : d.pct >= 40 ? 'bg-[#10233F]' : 'bg-[#10233F]/50')} style={{ height: `${Math.max(d.pct, 2)}%` }} />
                  </span>
                  <span className="text-[10px] capitalize text-muted-foreground">{d.label}</span>
                  <span className="text-[11px] font-semibold tabular-nums">{d.day}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#10233F]"><AlertTriangle className="h-4 w-4" />Pendientes</p>
              {attentionCount > 0 && <Badge className="border-red-200 bg-red-50 text-[10px] text-red-700 hover:bg-red-50">{attentionCount} por atender</Badge>}
            </div>
            {pendientesActivos.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Todo al día</p>
            ) : (
              <div className="divide-y">
                {pendientesActivos.map((p) => (
                  <button key={p.label} type="button" data-shift-readonly-allow="true" onClick={() => navigate(p.to)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <p.icon className={cn('h-4 w-4 shrink-0', p.tone)} />
                    <span className="min-w-0 flex-1 truncate">{p.label}</span>
                    <span className="rounded bg-muted px-1.5 text-xs font-semibold tabular-nums">{p.count}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
