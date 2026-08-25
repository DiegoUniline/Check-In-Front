import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart3,
  BedDouble,
  CalendarIcon,
  DollarSign,
  Download,
  FilterX,
  Moon,
  Percent,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import {
  exportarCorteCaja,
  exportarReporteIngresos,
  exportarReporteOcupacion,
  exportarReportePDF,
} from '@/lib/pdfExport';
import { currencySymbol, formatCurrency } from '@/lib/currency';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Filtros = {
  desde: Date;
  hasta: Date;
  habitacionIds: string[];
  tipoIds: string[];
  usuarioIds: string[];
  origenes: string[];
};

const PRESETS = [
  { id: '7d', label: 'Últimos 7 días', fn: () => ({ desde: subDays(new Date(), 6), hasta: new Date() }) },
  { id: '30d', label: 'Últimos 30 días', fn: () => ({ desde: subDays(new Date(), 29), hasta: new Date() }) },
  { id: 'mes', label: 'Este mes', fn: () => ({ desde: startOfMonth(new Date()), hasta: new Date() }) },
  { id: '3m', label: 'Últimos 3 meses', fn: () => ({ desde: subMonths(new Date(), 3), hasta: new Date() }) },
  { id: '12m', label: 'Últimos 12 meses', fn: () => ({ desde: subMonths(new Date(), 12), hasta: new Date() }) },
  { id: 'ytd', label: 'Año actual', fn: () => ({ desde: new Date(new Date().getFullYear(), 0, 1), hasta: new Date() }) },
];

const asLocalDay = (value: unknown): Date | null => {
  if (!value) return null;
  try {
    const d = typeof value === 'string' ? parseISO(value) : new Date(value as any);
    if (Number.isNaN(d.getTime())) return null;
    return startOfDay(d);
  } catch {
    return null;
  }
};

const isCancelled = (r: any) => ['Cancelada', 'NoShow'].includes(String(r?.estado || ''));

export default function Reportes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...PRESETS[1].fn(),
    habitacionIds: [],
    tipoIds: [],
    usuarioIds: [],
    origenes: [],
  }));

  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [pagosPrev, setPagosPrev] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);

  const rango = useMemo(() => {
    const a = startOfDay(filtros.desde);
    const b = startOfDay(filtros.hasta);
    const desde = a <= b ? a : b;
    const hasta = a <= b ? b : a;
    const hastaExclusivo = addDays(hasta, 1);
    const dias = Math.max(1, differenceInCalendarDays(hastaExclusivo, desde));
    return { desde, hasta, hastaExclusivo, dias };
  }, [filtros.desde, filtros.hasta]);

  useEffect(() => {
    Promise.all([
      api.getHabitaciones().catch(() => []),
      api.getTiposHabitacion().catch(() => []),
      api.getUsuarios().catch(() => []),
    ]).then(([h, t, u]) => {
      setHabitaciones(Array.isArray(h) ? h : []);
      setTipos(Array.isArray(t) ? t : []);
      setUsuarios(Array.isArray(u) ? u : []);
    });
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango.desde.getTime(), rango.hasta.getTime()]);

  const cargar = async () => {
    setLoading(true);
    try {
      const desdeStr = format(rango.desde, 'yyyy-MM-dd');
      const hastaStr = format(rango.hasta, 'yyyy-MM-dd');
      const prevHasta = subDays(rango.desde, 1);
      const prevDesde = subDays(prevHasta, rango.dias - 1);
      const [p, g, r, pp] = await Promise.all([
        api.getPagos({ fecha_desde: desdeStr, fecha_hasta: hastaStr }).catch(() => []),
        api.getGastos({ fecha_desde: desdeStr, fecha_hasta: hastaStr }).catch(() => []),
        api.getReservas().catch(() => []),
        api.getPagos({
          fecha_desde: format(prevDesde, 'yyyy-MM-dd'),
          fecha_hasta: format(prevHasta, 'yyyy-MM-dd'),
        }).catch(() => []),
      ]);
      setPagos(Array.isArray(p) ? p : []);
      setGastos(Array.isArray(g) ? g : []);
      setReservas(Array.isArray(r) ? r : []);
      setPagosPrev(Array.isArray(pp) ? pp : []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos del reporte', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const nochesEnRango = (r: any) => {
    if (isCancelled(r)) return 0;
    const checkin = asLocalDay(r.fecha_checkin);
    const checkout = asLocalDay(r.fecha_checkout);
    if (!checkin || !checkout || checkout <= checkin) return 0;
    const inicio = checkin > rango.desde ? checkin : rango.desde;
    const fin = checkout < rango.hastaExclusivo ? checkout : rango.hastaExclusivo;
    return Math.max(0, differenceInCalendarDays(fin, inicio));
  };

  const ingresoHospedajeEnRango = (r: any) => {
    const nochesRango = nochesEnRango(r);
    if (!nochesRango) return 0;
    const nochesReserva = Math.max(1, Number(r.noches) || differenceInCalendarDays(asLocalDay(r.fecha_checkout)!, asLocalDay(r.fecha_checkin)!));
    const tarifa = Number(r.tarifa_noche) ||
      (Number(r.subtotal_hospedaje) > 0 ? Number(r.subtotal_hospedaje) / nochesReserva : 0) ||
      (Number(r.total) > 0 ? Number(r.total) / nochesReserva : 0);
    return tarifa * nochesRango;
  };

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r: any) => {
      if (nochesEnRango(r) <= 0) return false;
      if (filtros.habitacionIds.length && !filtros.habitacionIds.includes(r.habitacion_id)) return false;
      if (filtros.tipoIds.length && !filtros.tipoIds.includes(r.tipo_habitacion_id)) return false;
      if (filtros.usuarioIds.length && !filtros.usuarioIds.includes(r.created_by)) return false;
      if (filtros.origenes.length && !filtros.origenes.includes(r.origen || 'Reserva')) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservas, filtros, rango.desde.getTime(), rango.hastaExclusivo.getTime()]);

  const reservaIdsFiltradas = useMemo(() => new Set(reservasFiltradas.map((r) => r.id)), [reservasFiltradas]);
  const hayFiltrosDimension = Boolean(
    filtros.habitacionIds.length || filtros.tipoIds.length || filtros.usuarioIds.length || filtros.origenes.length,
  );

  const pagosFiltrados = useMemo(() => {
    if (!hayFiltrosDimension) return pagos;
    return pagos.filter((p: any) => p.reserva_id && reservaIdsFiltradas.has(p.reserva_id));
  }, [pagos, reservaIdsFiltradas, hayFiltrosDimension]);

  const totalIngresos = useMemo(() => pagosFiltrados.reduce((s, p) => s + (Number(p.monto) || 0), 0), [pagosFiltrados]);
  const totalGastos = useMemo(() => gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0), [gastos]);
  const totalIngresosPrev = useMemo(() => pagosPrev.reduce((s, p) => s + (Number(p.monto) || 0), 0), [pagosPrev]);
  const utilidad = totalIngresos - totalGastos;
  const nochesVendidas = useMemo(() => reservasFiltradas.reduce((s, r) => s + nochesEnRango(r), 0), [reservasFiltradas]);
  const ingresoHospedaje = useMemo(() => reservasFiltradas.reduce((s, r) => s + ingresoHospedajeEnRango(r), 0), [reservasFiltradas]);

  const habitacionesElegibles = useMemo(() => {
    if (!filtros.habitacionIds.length) return habitaciones.length;
    return habitaciones.filter((h) => filtros.habitacionIds.includes(h.id)).length;
  }, [habitaciones, filtros.habitacionIds]);

  const habitacionesDisponiblesNoche = Math.max(1, habitacionesElegibles || habitaciones.length || 1) * rango.dias;
  const ocupacion = Math.min(100, Math.round((nochesVendidas / habitacionesDisponiblesNoche) * 100));
  const adr = nochesVendidas > 0 ? ingresoHospedaje / nochesVendidas : 0;
  const revpar = habitacionesDisponiblesNoche > 0 ? ingresoHospedaje / habitacionesDisponiblesNoche : 0;
  const pct = (actual: number, previo: number) => previo <= 0 ? (actual > 0 ? 100 : 0) : Math.round(((actual - previo) / previo) * 100);
  const cambioIngresos = pct(totalIngresos, totalIngresosPrev);

  const serieTemporal = useMemo(() => {
    if (rango.dias <= 60) {
      const buckets: Record<string, { label: string; ingresos: number; gastos: number; reservas: number }> = {};
      for (let i = 0; i < rango.dias; i++) {
        const d = addDays(rango.desde, i);
        const key = format(d, 'yyyy-MM-dd');
        buckets[key] = { label: format(d, 'dd MMM', { locale: es }), ingresos: 0, gastos: 0, reservas: 0 };
      }
      pagosFiltrados.forEach((p) => {
        const d = asLocalDay(p.fecha || p.created_at);
        if (!d) return;
        const key = format(d, 'yyyy-MM-dd');
        if (buckets[key]) buckets[key].ingresos += Number(p.monto) || 0;
      });
      gastos.forEach((g) => {
        const d = asLocalDay(g.fecha || g.created_at);
        if (!d) return;
        const key = format(d, 'yyyy-MM-dd');
        if (buckets[key]) buckets[key].gastos += Number(g.monto) || 0;
      });
      reservasFiltradas.forEach((r) => {
        const d = asLocalDay(r.fecha_checkin);
        if (!d) return;
        const key = format(d, 'yyyy-MM-dd');
        if (buckets[key]) buckets[key].reservas += 1;
      });
      return Object.values(buckets);
    }

    const meses = Math.max(1, Math.ceil(rango.dias / 30));
    const buckets: any[] = [];
    for (let i = meses; i >= 0; i--) {
      const d = subMonths(rango.hasta, i);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        ingresos: 0,
        gastos: 0,
        reservas: 0,
      });
    }
    const idx = (d: Date) => buckets.findIndex((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    pagosFiltrados.forEach((p) => { const d = asLocalDay(p.fecha || p.created_at); if (d) { const i = idx(d); if (i >= 0) buckets[i].ingresos += Number(p.monto) || 0; } });
    gastos.forEach((g) => { const d = asLocalDay(g.fecha || g.created_at); if (d) { const i = idx(d); if (i >= 0) buckets[i].gastos += Number(g.monto) || 0; } });
    reservasFiltradas.forEach((r) => { const d = asLocalDay(r.fecha_checkin); if (d) { const i = idx(d); if (i >= 0) buckets[i].reservas += 1; } });
    return buckets;
  }, [rango, pagosFiltrados, gastos, reservasFiltradas]);

  const porOrigen = useMemo(() => {
    const mapa: Record<string, number> = {};
    reservasFiltradas.forEach((r) => { const origen = r.origen || 'Directo'; mapa[origen] = (mapa[origen] || 0) + 1; });
    const total = reservasFiltradas.length || 1;
    return Object.entries(mapa).map(([name, count], i) => ({
      name,
      count,
      value: Math.round((count / total) * 100),
      color: COLORS[i % COLORS.length],
    }));
  }, [reservasFiltradas]);

  const porTipo = useMemo(() => tipos.map((tipo) => {
    const rs = reservasFiltradas.filter((r) => r.tipo_habitacion_id === tipo.id);
    return {
      tipo: tipo.nombre,
      reservas: rs.length,
      ingresos: rs.reduce((s, r) => s + ingresoHospedajeEnRango(r), 0),
    };
  }).filter((x) => x.reservas > 0), [tipos, reservasFiltradas]);

  const porHabitacion = useMemo(() => {
    const mapa: Record<string, { numero: string; reservas: number; ingresos: number }> = {};
    reservasFiltradas.forEach((r) => {
      const h = habitaciones.find((x) => x.id === r.habitacion_id);
      const numero = h?.numero || r.habitacion_numero || '—';
      if (!mapa[numero]) mapa[numero] = { numero, reservas: 0, ingresos: 0 };
      mapa[numero].reservas += 1;
      mapa[numero].ingresos += ingresoHospedajeEnRango(r);
    });
    return Object.values(mapa).sort((a, b) => b.ingresos - a.ingresos).slice(0, 10);
  }, [reservasFiltradas, habitaciones]);

  const porUsuario = useMemo(() => {
    const mapa: Record<string, { nombre: string; reservas: number; ingresos: number }> = {};
    reservasFiltradas.forEach((r) => {
      const u = usuarios.find((x) => x.id === r.created_by);
      const nombre = u ? `${u.nombre || ''} ${u.apellido_paterno || ''}`.trim() || u.email : 'Sistema';
      if (!mapa[nombre]) mapa[nombre] = { nombre, reservas: 0, ingresos: 0 };
      mapa[nombre].reservas += 1;
      mapa[nombre].ingresos += ingresoHospedajeEnRango(r);
    });
    return Object.values(mapa).sort((a, b) => b.ingresos - a.ingresos);
  }, [reservasFiltradas, usuarios]);

  const setPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) setFiltros((f) => ({ ...f, ...preset.fn() }));
  };

  const resetFiltros = () => setFiltros({
    ...PRESETS[1].fn(),
    habitacionIds: [],
    tipoIds: [],
    usuarioIds: [],
    origenes: [],
  });

  const exportar = () => {
    exportarReportePDF({
      titulo: 'Reporte Ejecutivo',
      subtitulo: 'Resumen financiero, ocupación y operación',
      periodo: `${format(rango.desde, 'dd MMM yyyy', { locale: es })} – ${format(rango.hasta, 'dd MMM yyyy', { locale: es })}`,
      kpis: [
        { label: 'Ingresos cobrados', value: formatCurrency(totalIngresos) },
        { label: 'Gastos', value: formatCurrency(totalGastos) },
        { label: 'Utilidad caja', value: formatCurrency(utilidad) },
        { label: 'Ocupación', value: `${ocupacion}%` },
        { label: 'ADR', value: formatCurrency(adr) },
        { label: 'RevPAR', value: formatCurrency(revpar) },
      ],
      tablas: [
        { title: 'Por origen', head: ['Origen', 'Estancias', '%'], rows: porOrigen.map((o) => [o.name, o.count, `${o.value}%`]) },
        { title: 'Por tipo de habitación', head: ['Tipo', 'Estancias', 'Ingreso hospedaje'], rows: porTipo.map((t) => [t.tipo, t.reservas, formatCurrency(t.ingresos)]) },
        { title: 'Top habitaciones', head: ['Habitación', 'Estancias', 'Ingreso hospedaje'], rows: porHabitacion.map((h) => [h.numero, h.reservas, formatCurrency(h.ingresos)]) },
        { title: 'Por usuario', head: ['Usuario', 'Estancias', 'Ingreso hospedaje'], rows: porUsuario.map((u) => [u.nombre, u.reservas, formatCurrency(u.ingresos)]) },
      ],
    });
    toast({ title: 'PDF generado' });
  };

  const exportarOcupacion = () => {
    exportarReporteOcupacion({ desde: rango.desde, hasta: rango.hasta, habitaciones, reservas: reservasFiltradas });
    toast({ title: 'PDF de ocupación generado' });
  };
  const exportarIngresos = () => {
    exportarReporteIngresos({ desde: rango.desde, hasta: rango.hasta, pagos: pagosFiltrados });
    toast({ title: 'PDF de ingresos generado' });
  };
  const exportarCorte = () => {
    exportarCorteCaja({ desde: rango.desde, hasta: rango.hasta, pagos: pagosFiltrados, gastos });
    toast({ title: 'Corte de caja generado' });
  };

  const filtrosActivos = filtros.habitacionIds.length + filtros.tipoIds.length + filtros.usuarioIds.length + filtros.origenes.length;

  return (
    <MainLayout title="Reportes" subtitle="Indicadores hoteleros, caja y análisis por período">
      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-center gap-2">
            <div className="grid grid-cols-2 gap-2 flex-1 xl:max-w-md">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start font-normal min-w-0">
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{format(rango.desde, 'dd MMM yy', { locale: es })}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filtros.desde} onSelect={(d) => d && setFiltros((f) => ({ ...f, desde: d }))} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start font-normal min-w-0">
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{format(rango.hasta, 'dd MMM yy', { locale: es })}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filtros.hasta} onSelect={(d) => d && setFiltros((f) => ({ ...f, hasta: d }))} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <Select onValueChange={setPreset}>
              <SelectTrigger className="xl:w-[180px]"><SelectValue placeholder="Período rápido" /></SelectTrigger>
              <SelectContent>{PRESETS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
            </Select>

            <div className="flex gap-2 xl:ml-auto">
              <Button variant="outline" size="icon" onClick={cargar} disabled={loading} title="Actualizar">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex-1 xl:flex-none"><Download className="mr-2 h-4 w-4" />Exportar</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>PDF</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportar}><BarChart3 className="mr-2 h-4 w-4" />Ejecutivo</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportarOcupacion}><Percent className="mr-2 h-4 w-4" />Ocupación</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportarIngresos}><DollarSign className="mr-2 h-4 w-4" />Ingresos</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportarCorte}><TrendingUp className="mr-2 h-4 w-4" />Corte de caja</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MultiSelect options={tipos.map((t) => ({ value: t.id, label: t.nombre }))} values={filtros.tipoIds} onChange={(v) => setFiltros((f) => ({ ...f, tipoIds: v }))} allLabel="Todos los tipos" />
            <MultiSelect options={habitaciones.map((h) => ({ value: h.id, label: `Hab. ${h.numero}` }))} values={filtros.habitacionIds} onChange={(v) => setFiltros((f) => ({ ...f, habitacionIds: v }))} allLabel="Todas las habitaciones" />
            <MultiSelect options={usuarios.map((u) => ({ value: u.id, label: `${u.nombre || ''} ${u.apellido_paterno || ''}`.trim() || u.email }))} values={filtros.usuarioIds} onChange={(v) => setFiltros((f) => ({ ...f, usuarioIds: v }))} allLabel="Todos los usuarios" />
            <MultiSelect options={[{ value: 'Reserva', label: 'Reserva' }, { value: 'Web', label: 'Web' }, { value: 'Walk-in', label: 'Walk-in' }, { value: 'OTA', label: 'OTA' }]} values={filtros.origenes} onChange={(v) => setFiltros((f) => ({ ...f, origenes: v }))} allLabel="Todos los orígenes" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{rango.dias} noches de análisis</Badge>
              <Badge variant="outline">{nochesVendidas} noches vendidas</Badge>
              <Badge variant="outline">{reservasFiltradas.length} estancias</Badge>
              {filtrosActivos > 0 && <Badge variant="secondary">{filtrosActivos} filtros activos</Badge>}
            </div>
            <Button variant="ghost" size="sm" onClick={resetFiltros}>
              <FilterX className="mr-1.5 h-4 w-4" />Restablecer
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6 mb-4">
        <KpiCard label="Ingresos cobrados" value={formatCurrency(totalIngresos)} change={cambioIngresos} icon={DollarSign} tone="primary" />
        <KpiCard label="Gastos" value={formatCurrency(totalGastos)} icon={TrendingDown} tone="destructive" />
        <KpiCard label="Utilidad de caja" value={formatCurrency(utilidad)} icon={TrendingUp} tone={utilidad >= 0 ? 'success' : 'destructive'} />
        <KpiCard label="Ocupación" value={`${ocupacion}%`} hint={`${nochesVendidas}/${habitacionesDisponiblesNoche} noches`} icon={Percent} tone="info" />
        <KpiCard label="ADR" value={formatCurrency(adr)} hint="por noche vendida" icon={BedDouble} tone="warning" />
        <KpiCard label="RevPAR" value={formatCurrency(revpar)} hint="por noche disponible" icon={Moon} tone="primary" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 mb-4 lg:w-fit">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
          <TabsTrigger value="desglose">Desglose</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Ingresos cobrados vs gastos</CardTitle></CardHeader>
            <CardContent>
              <ChartBox>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" minTickGap={24} />
                    <YAxis className="text-xs" width={55} tickFormatter={(v) => `${currencySymbol()}${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: any) => formatCurrency(Number(v || 0))} />
                    <Legend />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                    <Area type="monotone" dataKey="gastos" name="Gastos" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.14} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartBox>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Estancias por origen</CardTitle></CardHeader>
              <CardContent>
                <ChartBox small>
                  {porOrigen.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={porOrigen} cx="50%" cy="50%" innerRadius={48} outerRadius={82} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                          {porOrigen.map((item, i) => <Cell key={item.name} fill={item.color || COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartBox>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Ingreso de hospedaje por tipo</CardTitle></CardHeader>
              <CardContent>
                <ChartBox small>
                  {porTipo.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porTipo}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="tipo" className="text-xs" minTickGap={12} />
                        <YAxis className="text-xs" width={52} tickFormatter={(v) => `${currencySymbol()}${Math.round(v / 1000)}k`} />
                        <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
                        <Bar dataKey="ingresos" name="Hospedaje" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartBox>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ingresos">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Tendencia de cobros</CardTitle></CardHeader>
            <CardContent>
              <ChartBox>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" minTickGap={24} />
                    <YAxis className="text-xs" width={55} tickFormatter={(v) => `${currencySymbol()}${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} />
                    <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocupacion">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Entradas por fecha</CardTitle></CardHeader>
            <CardContent>
              <ChartBox>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" minTickGap={24} />
                    <YAxis className="text-xs" allowDecimals={false} width={36} />
                    <Tooltip />
                    <Bar dataKey="reservas" name="Entradas" fill="hsl(var(--info))" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desglose">
          <div className="grid gap-4 lg:grid-cols-2">
            <DesgloseTabla title="Top habitaciones" rows={porHabitacion.map((h) => ({ k: `Hab. ${h.numero}`, n: h.reservas, v: h.ingresos }))} />
            <DesgloseTabla title="Por usuario" rows={porUsuario.map((u) => ({ k: u.nombre, n: u.reservas, v: u.ingresos }))} />
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}

function KpiCard({ label, value, change, hint, icon: Icon, tone }: { label: string; value: string; change?: number; hint?: string; icon: any; tone: string }) {
  const toneClass: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg sm:text-xl font-bold truncate">{value}</p>
            {typeof change === 'number' && (
              <p className={cn('text-[10px] sm:text-xs flex items-center gap-1', change >= 0 ? 'text-success' : 'text-destructive')}>
                {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change >= 0 ? '+' : ''}{change}% vs periodo anterior
              </p>
            )}
            {hint && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{hint}</p>}
          </div>
          <div className={cn('rounded-lg p-2 shrink-0', toneClass[tone] || toneClass.primary)}><Icon className="h-4 w-4" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartBox({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return <div className={cn('w-full', small ? 'h-[250px] sm:h-[280px]' : 'h-[280px] sm:h-[320px]')}>{children}</div>;
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sin datos para este período</div>;
}

function DesgloseTabla({ title, rows }: { title: string; rows: Array<{ k: string; n: number; v: number }> }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">Sin datos</div> : (
          <div className="divide-y">
            {rows.map((row, index) => (
              <div key={`${row.k}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{row.k}</p>
                  <p className="text-xs text-muted-foreground">{row.n} estancia{row.n === 1 ? '' : 's'}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(row.v)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
