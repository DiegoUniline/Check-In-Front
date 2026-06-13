import { useEffect, useMemo, useState } from 'react';
import { format, subDays, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, Download, RefreshCw, DollarSign, BedDouble, Users, BarChart3,
  TrendingUp, TrendingDown, Percent,
} from 'lucide-react';
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
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { exportarReportePDF } from '@/lib/pdfExport';
import { formatCurrency, currencySymbol } from '@/lib/currency';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type Filtros = {
  desde: Date;
  hasta: Date;
  habitacionIds: string[];  // [] = todas
  tipoIds: string[];        // [] = todos
  usuarioIds: string[];     // [] = todos
  origenes: string[];       // [] = todos
};

const PRESETS = [
  { id: '7d',  label: 'Últimos 7 días',   fn: () => ({ desde: subDays(new Date(), 7),  hasta: new Date() }) },
  { id: '30d', label: 'Últimos 30 días',  fn: () => ({ desde: subDays(new Date(), 30), hasta: new Date() }) },
  { id: 'mes', label: 'Este mes',         fn: () => ({ desde: startOfMonth(new Date()), hasta: new Date() }) },
  { id: '3m',  label: 'Últimos 3 meses',  fn: () => ({ desde: subMonths(new Date(), 3), hasta: new Date() }) },
  { id: '12m', label: 'Últimos 12 meses', fn: () => ({ desde: subMonths(new Date(), 12), hasta: new Date() }) },
  { id: 'ytd', label: 'Año actual',       fn: () => ({ desde: new Date(new Date().getFullYear(), 0, 1), hasta: new Date() }) },
];

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

  // Catálogos para filtros
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Datos crudos
  const [pagos, setPagos] = useState<any[]>([]);
  const [pagosPrev, setPagosPrev] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);

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

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [filtros.desde, filtros.hasta]);

  const cargar = async () => {
    setLoading(true);
    try {
      const desdeStr = format(filtros.desde, 'yyyy-MM-dd');
      const hastaStr = format(filtros.hasta, 'yyyy-MM-dd');
      const diff = Math.max(1, Math.ceil((filtros.hasta.getTime() - filtros.desde.getTime()) / 86400000));
      const prevHasta = subDays(filtros.desde, 1);
      const prevDesde = subDays(prevHasta, diff);
      const [p, g, r, pp] = await Promise.all([
        api.getPagos({ fecha_desde: desdeStr, fecha_hasta: hastaStr }).catch(() => []),
        api.getGastos({ fecha_desde: desdeStr, fecha_hasta: hastaStr }).catch(() => []),
        api.getReservas().catch(() => []),
        api.getPagos({ fecha_desde: format(prevDesde, 'yyyy-MM-dd'), fecha_hasta: format(prevHasta, 'yyyy-MM-dd') }).catch(() => []),
      ]);
      setPagos(Array.isArray(p) ? p : []);
      setGastos(Array.isArray(g) ? g : []);
      setReservas(Array.isArray(r) ? r : []);
      setPagosPrev(Array.isArray(pp) ? pp : []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Aplica filtros (habitación, tipo, usuario, origen) sobre reservas y derivados
  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r: any) => {
      const f = new Date(r.fecha_checkin);
      if (f < filtros.desde || f > filtros.hasta) return false;
      if (filtros.habitacionIds.length && !filtros.habitacionIds.includes(r.habitacion_id)) return false;
      if (filtros.tipoIds.length && !filtros.tipoIds.includes(r.tipo_habitacion_id)) return false;
      if (filtros.usuarioIds.length && !filtros.usuarioIds.includes(r.created_by)) return false;
      if (filtros.origenes.length && !filtros.origenes.includes(r.origen || 'Reserva')) return false;
      return true;
    });
  }, [reservas, filtros]);

  const reservaIdsFiltradas = useMemo(() => new Set(reservasFiltradas.map((r) => r.id)), [reservasFiltradas]);

  const pagosFiltrados = useMemo(() => {
    const sinFiltros = !filtros.habitacionIds.length && !filtros.tipoIds.length && !filtros.usuarioIds.length && !filtros.origenes.length;
    if (sinFiltros) return pagos;
    return pagos.filter((p: any) => !p.reserva_id || reservaIdsFiltradas.has(p.reserva_id));
  }, [pagos, reservaIdsFiltradas, filtros]);

  // KPIs
  const totalIngresos = useMemo(() => pagosFiltrados.reduce((s, p) => s + (Number(p.monto) || 0), 0), [pagosFiltrados]);
  const totalGastos   = useMemo(() => gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0), [gastos]);
  const totalIngresosPrev = useMemo(() => pagosPrev.reduce((s, p) => s + (Number(p.monto) || 0), 0), [pagosPrev]);
  const totalReservas = reservasFiltradas.length;
  const utilidad = totalIngresos - totalGastos;

  const totalHab = habitaciones.length || 1;
  const dias = Math.max(1, Math.ceil((filtros.hasta.getTime() - filtros.desde.getTime()) / 86400000));
  const noches = reservasFiltradas.reduce((s, r: any) => s + (Number(r.noches) || 1), 0);
  const ocupacion = Math.min(100, Math.round((noches / (totalHab * dias)) * 100));
  const adr = totalReservas > 0 ? Math.round(totalIngresos / totalReservas) : 0;
  const revpar = totalHab > 0 ? Math.round(totalIngresos / (totalHab * dias)) : 0;

  const pct = (c: number, p: number) => (p <= 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100));
  const cambioIngresos = pct(totalIngresos, totalIngresosPrev);

  // Series temporales (auto-resolución: día si <=60d, mes si >60d)
  const useMensual = dias > 60;
  const serieTemporal = useMemo(() => {
    if (!useMensual) {
      const buckets: Record<string, { label: string; ingresos: number; gastos: number; reservas: number }> = {};
      for (let i = 0; i <= dias; i++) {
        const d = subDays(filtros.hasta, dias - i);
        const key = format(d, 'yyyy-MM-dd');
        buckets[key] = { label: format(d, 'dd MMM', { locale: es }), ingresos: 0, gastos: 0, reservas: 0 };
      }
      pagosFiltrados.forEach((p) => {
        const k = format(new Date(p.fecha || p.created_at), 'yyyy-MM-dd');
        if (buckets[k]) buckets[k].ingresos += Number(p.monto) || 0;
      });
      gastos.forEach((g) => {
        const k = format(new Date(g.fecha || g.created_at), 'yyyy-MM-dd');
        if (buckets[k]) buckets[k].gastos += Number(g.monto) || 0;
      });
      reservasFiltradas.forEach((r) => {
        const k = format(new Date(r.fecha_checkin), 'yyyy-MM-dd');
        if (buckets[k]) buckets[k].reservas += 1;
      });
      return Object.values(buckets);
    }
    const meses = Math.ceil(dias / 30);
    const buckets: any[] = [];
    for (let i = meses; i >= 0; i--) {
      const d = subMonths(filtros.hasta, i);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, ingresos: 0, gastos: 0, reservas: 0 });
    }
    const idx = (d: Date) => buckets.findIndex((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    pagosFiltrados.forEach((p) => { const i = idx(new Date(p.fecha || p.created_at)); if (i >= 0) buckets[i].ingresos += Number(p.monto) || 0; });
    gastos.forEach((g) => { const i = idx(new Date(g.fecha || g.created_at)); if (i >= 0) buckets[i].gastos += Number(g.monto) || 0; });
    reservasFiltradas.forEach((r) => { const i = idx(new Date(r.fecha_checkin)); if (i >= 0) buckets[i].reservas += 1; });
    return buckets;
  }, [pagosFiltrados, gastos, reservasFiltradas, filtros, dias, useMensual]);

  // Distribución por origen
  const porOrigen = useMemo(() => {
    const m: Record<string, number> = {};
    reservasFiltradas.forEach((r) => { const o = r.origen || 'Directo'; m[o] = (m[o] || 0) + 1; });
    const total = reservasFiltradas.length || 1;
    return Object.entries(m).map(([name, count], i) => ({ name, value: Math.round((count / total) * 100), count, color: COLORS[i % COLORS.length] }));
  }, [reservasFiltradas]);

  // Por tipo de habitación
  const porTipo = useMemo(() => {
    return tipos.map((t) => {
      const rs = reservasFiltradas.filter((r) => r.tipo_habitacion_id === t.id);
      const ing = rs.reduce((s, r: any) => s + (Number(r.total) || 0), 0);
      return { tipo: t.nombre, reservas: rs.length, ingresos: ing };
    }).filter((x) => x.reservas > 0 || x.ingresos > 0);
  }, [tipos, reservasFiltradas]);

  // Por habitación (top 10)
  const porHabitacion = useMemo(() => {
    const m: Record<string, { numero: string; reservas: number; ingresos: number }> = {};
    reservasFiltradas.forEach((r: any) => {
      const h = habitaciones.find((x) => x.id === r.habitacion_id);
      const numero = h?.numero || r.habitacion_id || '—';
      if (!m[numero]) m[numero] = { numero, reservas: 0, ingresos: 0 };
      m[numero].reservas += 1;
      m[numero].ingresos += Number(r.total) || 0;
    });
    return Object.values(m).sort((a, b) => b.ingresos - a.ingresos).slice(0, 10);
  }, [reservasFiltradas, habitaciones]);

  // Por usuario
  const porUsuario = useMemo(() => {
    const m: Record<string, { nombre: string; reservas: number; ingresos: number }> = {};
    reservasFiltradas.forEach((r: any) => {
      const u = usuarios.find((x) => x.id === r.created_by);
      const nombre = u ? `${u.nombre || ''} ${u.apellido_paterno || ''}`.trim() || u.email : 'Sistema';
      if (!m[nombre]) m[nombre] = { nombre, reservas: 0, ingresos: 0 };
      m[nombre].reservas += 1;
      m[nombre].ingresos += Number(r.total) || 0;
    });
    return Object.values(m).sort((a, b) => b.ingresos - a.ingresos);
  }, [reservasFiltradas, usuarios]);

  const setPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) setFiltros((f) => ({ ...f, ...p.fn() }));
  };

  const exportar = () => {
    exportarReportePDF({
      titulo: 'Reporte Ejecutivo',
      subtitulo: 'Resumen financiero, ocupación y operación',
      periodo: `${format(filtros.desde, 'dd MMM yyyy', { locale: es })} – ${format(filtros.hasta, 'dd MMM yyyy', { locale: es })}`,
      kpis: [
        { label: 'Ingresos', value: formatCurrency(totalIngresos) },
        { label: 'Gastos', value: formatCurrency(totalGastos) },
        { label: 'Utilidad', value: formatCurrency(utilidad) },
        { label: 'Ocupación', value: `${ocupacion}%` },
        { label: 'ADR', value: formatCurrency(adr) },
        { label: 'RevPAR', value: formatCurrency(revpar) },
      ],
      tablas: [
        { title: 'Por origen', head: ['Origen', 'Reservas', '%'], rows: porOrigen.map((o) => [o.name, o.count, `${o.value}%`]) },
        { title: 'Por tipo de habitación', head: ['Tipo', 'Reservas', 'Ingresos'], rows: porTipo.map((t) => [t.tipo, t.reservas, formatCurrency(t.ingresos)]) },
        { title: 'Top habitaciones', head: ['Habitación', 'Reservas', 'Ingresos'], rows: porHabitacion.map((h) => [h.numero, h.reservas, formatCurrency(h.ingresos)]) },
        { title: 'Por usuario', head: ['Usuario', 'Reservas', 'Ingresos'], rows: porUsuario.map((u) => [u.nombre, u.reservas, formatCurrency(u.ingresos)]) },
      ],
    });
    toast({ title: 'PDF generado' });
  };

  return (
    <MainLayout title="Reportes" subtitle="Dashboard ejecutivo · KPIs y análisis con filtros">
      {/* Toolbar de filtros */}
      <Card className="mb-6">
        <CardContent className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-2 flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(filtros.desde, 'dd MMM yy', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filtros.desde} onSelect={(d) => d && setFiltros((f) => ({ ...f, desde: d }))} className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(filtros.hasta, 'dd MMM yy', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filtros.hasta} onSelect={(d) => d && setFiltros((f) => ({ ...f, hasta: d }))} className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>

          <Select onValueChange={setPreset}>
            <SelectTrigger><SelectValue placeholder="Presets" /></SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}
            </SelectContent>
          </Select>

          <MultiSelect
            options={tipos.map((t) => ({ value: t.id, label: t.nombre }))}
            values={filtros.tipoIds}
            onChange={(v) => setFiltros((f) => ({ ...f, tipoIds: v }))}
            allLabel="Todos los tipos"
          />

          <MultiSelect
            options={habitaciones.map((h) => ({ value: h.id, label: `Hab. ${h.numero}` }))}
            values={filtros.habitacionIds}
            onChange={(v) => setFiltros((f) => ({ ...f, habitacionIds: v }))}
            allLabel="Todas las habs."
          />

          <MultiSelect
            options={usuarios.map((u) => ({ value: u.id, label: `${u.nombre || ''} ${u.apellido_paterno || ''}`.trim() || u.email }))}
            values={filtros.usuarioIds}
            onChange={(v) => setFiltros((f) => ({ ...f, usuarioIds: v }))}
            allLabel="Todos los usuarios"
          />

          <MultiSelect
            options={[
              { value: 'Reserva', label: 'Reserva' },
              { value: 'Web', label: 'Web' },
              { value: 'Walk-in', label: 'Walk-in' },
              { value: 'OTA', label: 'OTA' },
            ]}
            values={filtros.origenes}
            onChange={(v) => setFiltros((f) => ({ ...f, origenes: v }))}
            allLabel="Todos los orígenes"
          />
        </CardContent>
        <CardContent className="p-4 pt-0 flex justify-between items-center">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {filtros.tipoIds.length > 0 && <Badge variant="secondary">{filtros.tipoIds.length} tipo(s)</Badge>}
            {filtros.habitacionIds.length > 0 && <Badge variant="secondary">{filtros.habitacionIds.length} habitación(es)</Badge>}
            {filtros.usuarioIds.length > 0 && <Badge variant="secondary">{filtros.usuarioIds.length} usuario(s)</Badge>}
            {filtros.origenes.length > 0 && <Badge variant="secondary">{filtros.origenes.length} origen(es)</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={cargar} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={exportar}><Download className="mr-2 h-4 w-4" />Exportar PDF</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <KpiCard label="Ingresos" value={formatCurrency(totalIngresos)} change={cambioIngresos} icon={DollarSign} color="primary" />
        <KpiCard label="Gastos" value={formatCurrency(totalGastos)} icon={DollarSign} color="destructive" />
        <KpiCard label="Utilidad" value={formatCurrency(utilidad)} icon={TrendingUp} color={utilidad >= 0 ? 'success' : 'destructive'} />
        <KpiCard label="Ocupación" value={`${ocupacion}%`} icon={Percent} color="info" />
        <KpiCard label="ADR" value={formatCurrency(adr)} icon={BedDouble} color="warning" />
        <KpiCard label="RevPAR" value={formatCurrency(revpar)} icon={BarChart3} color="primary" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
          <TabsTrigger value="desglose">Desglose</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Ingresos vs Gastos</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${currencySymbol()}${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="gastos" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Reservas por origen</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {porOrigen.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={porOrigen} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                          {porOrigen.map((e, i) => (<Cell key={i} fill={e.color} />))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Por tipo de habitación</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {porTipo.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porTipo}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="tipo" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `${currencySymbol()}${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ingresos" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Tendencia de ingresos</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${currencySymbol()}${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocupacion" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Reservas en el período</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="reservas" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desglose" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <DesgloseTabla title="Top habitaciones" rows={porHabitacion.map((h) => ({ k: `Hab. ${h.numero}`, n: h.reservas, v: h.ingresos }))} />
            <DesgloseTabla title="Por usuario" rows={porUsuario.map((u) => ({ k: u.nombre, n: u.reservas, v: u.ingresos }))} />
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}

function KpiCard({ label, value, change, icon: Icon, color }: { label: string; value: string; change?: number; icon: any; color: string }) {
  const colorClass: any = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold truncate">{value}</p>
            {typeof change === 'number' && (
              <p className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change >= 0 ? '+' : ''}{change}% vs anterior
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorClass[color] || colorClass.primary}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DesgloseTabla({ title, rows }: { title: string; rows: { k: string; n: number; v: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <Empty /> : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.k} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <span className="font-medium truncate">{r.k}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground"><Users className="inline h-3 w-3 mr-1" />{r.n}</span>
                  <span className="font-semibold">${r.v.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos para los filtros aplicados</div>;
}