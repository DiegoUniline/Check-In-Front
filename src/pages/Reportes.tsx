import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, 
  Users, BedDouble, Calendar, Download, FileText, RefreshCw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportarReportePDF } from '@/lib/pdfExport';

// Colores para gráficos
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
];

export default function Reportes() {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState('mes');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
  // Stats
  const [stats, setStats] = useState({
    ingresos: 0,
    ocupacion: 0,
    huespedes: 0,
    adr: 0,
    ingresosChange: 0,
    ocupacionChange: 0,
    huespedesChange: 0,
    adrChange: 0,
  });
  
  // Chart data
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [roomTypeData, setRoomTypeData] = useState<any[]>([]);
  const [historicoData, setHistoricoData] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Get date range based on periodo
      const now = new Date();
      let fechaDesde: Date;
      let fechaHasta = now;
      
      switch (periodo) {
        case 'semana':
          fechaDesde = subDays(now, 7);
          break;
        case 'mes':
          fechaDesde = startOfMonth(now);
          break;
        case 'trimestre':
          fechaDesde = subMonths(now, 3);
          break;
        case 'año':
          fechaDesde = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          fechaDesde = startOfMonth(now);
      }
      // Período anterior para comparativa
      const diffDays = Math.max(1, Math.ceil((fechaHasta.getTime() - fechaDesde.getTime()) / 86400000));
      const prevHasta = subDays(fechaDesde, 1);
      const prevDesde = subDays(prevHasta, diffDays);

      // Cargar datos del dashboard y estadísticas (incluyendo período anterior)
      const [dashStats, tiposHab, gastos, pagos, reservas, pagosPrev] = await Promise.all([
        api.getDashboardStats().catch(() => ({})),
        api.getTiposHabitacion().catch(() => []),
        api.getGastos({ fecha_desde: format(fechaDesde, 'yyyy-MM-dd'), fecha_hasta: format(fechaHasta, 'yyyy-MM-dd') }).catch(() => []),
        api.getPagos({ fecha_desde: format(fechaDesde, 'yyyy-MM-dd'), fecha_hasta: format(fechaHasta, 'yyyy-MM-dd') }).catch(() => []),
        api.getReservas().catch(() => []),
        api.getPagos({ fecha_desde: format(prevDesde, 'yyyy-MM-dd'), fecha_hasta: format(prevHasta, 'yyyy-MM-dd') }).catch(() => []),
      ]);

      // Calculate stats
      const totalIngresos = Array.isArray(pagos) ? pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0) : 0;
      const totalGastos = Array.isArray(gastos) ? gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0) : 0;
      const ocupacionActual = dashStats?.ocupacion || dashStats?.porcentaje_ocupacion || 0;
      const totalReservas = Array.isArray(reservas) ? reservas.length : 0;

      const totalIngresosPrev = Array.isArray(pagosPrev) ? pagosPrev.reduce((s, p) => s + (Number(p.monto) || 0), 0) : 0;
      const reservasPeriodo = Array.isArray(reservas)
        ? reservas.filter((r: any) => {
            const d = new Date(r.fecha_checkin);
            return d >= fechaDesde && d <= fechaHasta;
          }).length
        : 0;
      const reservasPrev = Array.isArray(reservas)
        ? reservas.filter((r: any) => {
            const d = new Date(r.fecha_checkin);
            return d >= prevDesde && d <= prevHasta;
          }).length
        : 0;

      const pct = (curr: number, prev: number) =>
        prev <= 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

      setStats({
        ingresos: totalIngresos,
        ocupacion: Math.round(ocupacionActual),
        huespedes: dashStats?.huespedes_actuales || totalReservas,
        adr: totalReservas > 0 ? Math.round(totalIngresos / totalReservas) : 0,
        ingresosChange: pct(totalIngresos, totalIngresosPrev),
        ocupacionChange: 0,
        huespedesChange: pct(reservasPeriodo, reservasPrev),
        adrChange: pct(
          reservasPeriodo > 0 ? totalIngresos / reservasPeriodo : 0,
          reservasPrev > 0 ? totalIngresosPrev / reservasPrev : 0,
        ),
      });

      // Generate revenue chart data
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const revenueChartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const monthPagos = Array.isArray(pagos) ? pagos.filter((p: any) => {
          const pDate = new Date(p.fecha || p.created_at);
          return pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear();
        }) : [];
        const monthGastos = Array.isArray(gastos) ? gastos.filter((g: any) => {
          const gDate = new Date(g.fecha || g.created_at);
          return gDate.getMonth() === d.getMonth() && gDate.getFullYear() === d.getFullYear();
        }) : [];
        
        revenueChartData.push({
          mes: monthNames[d.getMonth()],
          ingresos: monthPagos.reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0),
          gastos: monthGastos.reduce((sum: number, g: any) => sum + (Number(g.monto) || 0), 0),
        });
      }
      setRevenueData(revenueChartData);

      // Histórico 12 meses: ingresos, ADR, ocupación estimada
      const totalHab = Array.isArray(tiposHab) && tiposHab.length
        ? tiposHab.reduce((s: number, t: any) => s + (Number(t.cantidad_habitaciones) || 1), 0)
        : (dashStats?.total_habitaciones || 1);
      const hist: any[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        const mPagos = Array.isArray(pagos) ? pagos.filter((p: any) => {
          const pd = new Date(p.fecha || p.created_at);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        }) : [];
        const mReservas = Array.isArray(reservas) ? reservas.filter((r: any) => {
          const rd = new Date(r.fecha_checkin);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        }) : [];
        const ingresos = mPagos.reduce((s: number, p: any) => s + (Number(p.monto) || 0), 0);
        const noches = mReservas.reduce((s: number, r: any) => s + (Number(r.noches) || 1), 0);
        const diasMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const adr = mReservas.length > 0 ? Math.round(ingresos / mReservas.length) : 0;
        const ocup = totalHab > 0 ? Math.min(100, Math.round((noches / (totalHab * diasMes)) * 100)) : 0;
        const revpar = totalHab > 0 ? Math.round(ingresos / (totalHab * diasMes)) : 0;
        hist.push({ mes: monthNames[d.getMonth()], ingresos, adr, ocup, revpar });
      }
      setHistoricoData(hist);

      // Occupancy by day of week
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const occupancyChartData = dayNames.map((dia) => {
        const reservasDia = Array.isArray(reservas)
          ? reservas.filter((r: any) => {
              const f = new Date(r.fecha_checkin);
              return f.getDay() === dayNames.indexOf(dia);
            }).length
          : 0;
        return { dia, ocupacion: reservasDia };
      });
      setOccupancyData(occupancyChartData);

      // Source data calculado desde reservas reales (campo origen)
      if (Array.isArray(reservas) && reservas.length > 0) {
        const origenes: Record<string, number> = {};
        reservas.forEach((r: any) => {
          const o = r.origen || 'Directo';
          origenes[o] = (origenes[o] || 0) + 1;
        });
        const total = reservas.length;
        setSourceData(
          Object.entries(origenes).map(([name, count], i) => ({
            name,
            value: Math.round((count / total) * 100),
            color: CHART_COLORS[i % CHART_COLORS.length],
          }))
        );
      } else {
        setSourceData([]);
      }

      // Room type performance
      if (Array.isArray(tiposHab) && tiposHab.length > 0) {
        const roomData = tiposHab.map((tipo: any) => {
          const tipoReservas = Array.isArray(reservas) 
            ? reservas.filter((r: any) => r.tipo_habitacion_id === tipo.id || r.tipo_habitacion === tipo.nombre).length 
            : 0;
          return {
            tipo: tipo.nombre,
            reservas: tipoReservas,
            ingresos: tipoReservas * (Number(tipo.precio_base) || 1000),
          };
        });
        setRoomTypeData(roomData);
      }
    } catch (error) {
      console.error('Error cargando reportes:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los reportes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const periodoLabel = ({ semana: 'Última semana', mes: 'Este mes', trimestre: 'Trimestre', año: 'Este año' } as any)[periodo] || periodo;
      exportarReportePDF({
        titulo: 'Reporte de Operación',
        subtitulo: 'Resumen financiero y de ocupación',
        periodo: periodoLabel,
        kpis: [
          { label: 'Ingresos', value: `$${stats.ingresos.toLocaleString()}` },
          { label: 'Ocupación', value: `${stats.ocupacion}%` },
          { label: 'Huéspedes', value: String(stats.huespedes) },
          { label: 'ADR', value: `$${stats.adr.toLocaleString()}` },
        ],
        tablas: [
          {
            title: 'Ingresos vs Gastos por mes',
            head: ['Mes', 'Ingresos', 'Gastos', 'Utilidad'],
            rows: revenueData.map((r) => [
              r.mes,
              `$${Number(r.ingresos).toLocaleString()}`,
              `$${Number(r.gastos).toLocaleString()}`,
              `$${(Number(r.ingresos) - Number(r.gastos)).toLocaleString()}`,
            ]),
          },
          {
            title: 'Histórico 12 meses (KPIs)',
            head: ['Mes', 'Ingresos', 'ADR', 'Ocupación %', 'RevPAR'],
            rows: historicoData.map((h) => [
              h.mes,
              `$${Number(h.ingresos).toLocaleString()}`,
              `$${Number(h.adr).toLocaleString()}`,
              `${h.ocup}%`,
              `$${Number(h.revpar).toLocaleString()}`,
            ]),
          },
          {
            title: 'Rendimiento por tipo de habitación',
            head: ['Tipo', 'Reservas', 'Ingresos'],
            rows: roomTypeData.map((r) => [r.tipo, r.reservas, `$${Number(r.ingresos).toLocaleString()}`]),
          },
        ],
      });
      toast({ title: 'PDF generado', description: 'Se descargó el reporte' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo generar el PDF', variant: 'destructive' });
    }
  };

  return (
    <MainLayout 
      title="Reportes" 
      subtitle="Estadísticas y análisis del hotel"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
            <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="año">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                <p className="text-2xl font-bold">${stats.ingresos.toLocaleString()}</p>
                <p className={`text-sm flex items-center gap-1 ${stats.ingresosChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.ingresosChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stats.ingresosChange >= 0 ? '+' : ''}{stats.ingresosChange}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ocupación Promedio</p>
                <p className="text-2xl font-bold">{stats.ocupacion}%</p>
                <p className={`text-sm flex items-center gap-1 ${stats.ocupacionChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.ocupacionChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stats.ocupacionChange >= 0 ? '+' : ''}{stats.ocupacionChange}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <BedDouble className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Huéspedes</p>
                <p className="text-2xl font-bold">{stats.huespedes}</p>
                <p className={`text-sm flex items-center gap-1 ${stats.huespedesChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.huespedesChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stats.huespedesChange >= 0 ? '+' : ''}{stats.huespedesChange}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-info/10">
                <Users className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ADR</p>
                <p className="text-2xl font-bold">${stats.adr.toLocaleString()}</p>
                <p className={`text-sm flex items-center gap-1 ${stats.adrChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats.adrChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stats.adrChange >= 0 ? '+' : ''}{stats.adrChange}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10">
                <BarChart3 className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos vs Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorIngresos)" />
                  <Area type="monotone" dataKey="gastos" stroke="hsl(var(--muted-foreground))" fillOpacity={0.3} fill="hsl(var(--muted))" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ocupación Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}`, 'Reservas']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="ocupacion" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Source Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fuentes de Reserva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {sourceData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sin reservas registradas
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Room Type Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Rendimiento por Tipo de Habitación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roomTypeData.length > 0 ? roomTypeData.map(room => (
                <div key={room.tipo} className="flex items-center gap-4">
                  <div className="w-24 font-medium">{room.tipo}</div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min((room.ingresos / (stats.ingresos || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-muted-foreground">
                    {room.reservas} res.
                  </div>
                  <div className="w-24 text-right font-medium">
                    ${(room.ingresos / 1000).toFixed(0)}k
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">No hay datos de tipos de habitación</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico 12 meses */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Tendencia 12 meses · Ingresos / RevPAR / Ocupación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicoData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" className="text-xs" tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line yAxisId="left" type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} name="Ingresos" />
                <Line yAxisId="left" type="monotone" dataKey="revpar" stroke="hsl(var(--info))" strokeWidth={2} name="RevPAR" />
                <Line yAxisId="right" type="monotone" dataKey="ocup" stroke="hsl(var(--success))" strokeWidth={2} name="Ocupación %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}