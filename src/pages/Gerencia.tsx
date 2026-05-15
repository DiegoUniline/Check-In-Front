import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, BedDouble, Percent, Download } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, BarChart, Bar,
} from 'recharts';
import api from '@/lib/api';
import { format, subMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { exportarReportePDF } from '@/lib/pdfExport';

export default function Gerencia() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hist, setHist] = useState<any[]>([]);
  const [resumen, setResumen] = useState({
    ingresosAnual: 0, gastosAnual: 0, utilidadAnual: 0,
    adrPromedio: 0, ocupPromedio: 0, revparPromedio: 0,
    mejorMes: '—', peorMes: '—',
  });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const desde = subMonths(now, 12);
      const [pagos, gastos, reservas, tipos, dash] = await Promise.all([
        api.getPagos({ fecha_desde: format(desde, 'yyyy-MM-dd'), fecha_hasta: format(now, 'yyyy-MM-dd') }).catch(() => []),
        api.getGastos({ fecha_desde: format(desde, 'yyyy-MM-dd'), fecha_hasta: format(now, 'yyyy-MM-dd') }).catch(() => []),
        api.getReservas().catch(() => []),
        api.getTiposHabitacion().catch(() => []),
        api.getDashboardStats().catch(() => ({})),
      ]);
      const totalHab = (Array.isArray(tipos) && tipos.length)
        ? tipos.reduce((s: number, t: any) => s + (Number(t.cantidad_habitaciones) || 1), 0)
        : ((dash as any)?.total_habitaciones || 1);
      const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const data: any[] = [];
      let ingTotal = 0, gasTotal = 0, ocupSum = 0, adrSum = 0, revSum = 0, count = 0;
      let best = { v: -1, m: '—' }, worst = { v: Infinity, m: '—' };
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        const mPagos = (pagos as any[]).filter((p) => {
          const pd = new Date(p.fecha || p.created_at);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        });
        const mGastos = (gastos as any[]).filter((g) => {
          const gd = new Date(g.fecha || g.created_at);
          return gd.getMonth() === d.getMonth() && gd.getFullYear() === d.getFullYear();
        });
        const mReservas = (reservas as any[]).filter((r) => {
          const rd = new Date(r.fecha_checkin);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        });
        const ingresos = mPagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
        const gastosM = mGastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);
        const noches = mReservas.reduce((s, r) => s + (Number(r.noches) || 1), 0);
        const dias = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const adr = mReservas.length > 0 ? Math.round(ingresos / mReservas.length) : 0;
        const ocup = totalHab > 0 ? Math.min(100, Math.round((noches / (totalHab * dias)) * 100)) : 0;
        const revpar = totalHab > 0 ? Math.round(ingresos / (totalHab * dias)) : 0;
        const utilidad = ingresos - gastosM;
        const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
        data.push({ mes: label, ingresos, gastos: gastosM, utilidad, adr, ocup, revpar });
        ingTotal += ingresos; gasTotal += gastosM; ocupSum += ocup; adrSum += adr; revSum += revpar; count++;
        if (ingresos > best.v) best = { v: ingresos, m: label };
        if (ingresos < worst.v) worst = { v: ingresos, m: label };
      }
      setHist(data);
      setResumen({
        ingresosAnual: ingTotal,
        gastosAnual: gasTotal,
        utilidadAnual: ingTotal - gasTotal,
        adrPromedio: count ? Math.round(adrSum / count) : 0,
        ocupPromedio: count ? Math.round(ocupSum / count) : 0,
        revparPromedio: count ? Math.round(revSum / count) : 0,
        mejorMes: best.m,
        peorMes: worst.m,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportar = () => {
    exportarReportePDF({
      titulo: 'Dashboard Gerencia',
      subtitulo: 'KPIs históricos · Últimos 12 meses',
      periodo: 'Últimos 12 meses',
      kpis: [
        { label: 'Ingresos anuales', value: `$${resumen.ingresosAnual.toLocaleString()}` },
        { label: 'Utilidad anual', value: `$${resumen.utilidadAnual.toLocaleString()}` },
        { label: 'Ocupación prom.', value: `${resumen.ocupPromedio}%` },
        { label: 'ADR prom.', value: `$${resumen.adrPromedio.toLocaleString()}` },
        { label: 'RevPAR prom.', value: `$${resumen.revparPromedio.toLocaleString()}` },
      ],
      tablas: [{
        title: 'Histórico mensual',
        head: ['Mes', 'Ingresos', 'Gastos', 'Utilidad', 'ADR', 'Ocupación %', 'RevPAR'],
        rows: hist.map((h) => [
          h.mes,
          `$${h.ingresos.toLocaleString()}`,
          `$${h.gastos.toLocaleString()}`,
          `$${h.utilidad.toLocaleString()}`,
          `$${h.adr.toLocaleString()}`,
          `${h.ocup}%`,
          `$${h.revpar.toLocaleString()}`,
        ]),
      }],
    });
    toast({ title: 'PDF generado' });
  };

  return (
    <MainLayout title="Dashboard Gerencia" subtitle="KPIs históricos y rentabilidad">
      <div className="flex justify-end mb-4">
        <Button onClick={exportar} disabled={loading}>
          <Download className="mr-2 h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Ingresos 12m</p>
          <p className="text-2xl font-bold">${resumen.ingresosAnual.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><DollarSign className="h-3 w-3" />Total acumulado</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Utilidad 12m</p>
          <p className={`text-2xl font-bold ${resumen.utilidadAnual >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${resumen.utilidadAnual.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Gastos: ${resumen.gastosAnual.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Ocupación promedio</p>
          <p className="text-2xl font-bold">{resumen.ocupPromedio}%</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Percent className="h-3 w-3" />Promedio mensual</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">RevPAR promedio</p>
          <p className="text-2xl font-bold">${resumen.revparPromedio.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">ADR: ${resumen.adrPromedio.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Ingresos vs Gastos · 12 meses</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hist}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Ingresos" />
                  <Area type="monotone" dataKey="gastos" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.2} name="Gastos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Utilidad mensual</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hist}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="utilidad" fill="hsl(var(--success))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">RevPAR · ADR · Ocupación</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hist}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" className="text-xs" tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line yAxisId="left" type="monotone" dataKey="adr" stroke="hsl(var(--info))" strokeWidth={2} name="ADR" />
                <Line yAxisId="left" type="monotone" dataKey="revpar" stroke="hsl(var(--primary))" strokeWidth={2} name="RevPAR" />
                <Line yAxisId="right" type="monotone" dataKey="ocup" stroke="hsl(var(--success))" strokeWidth={2} name="Ocupación %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-success" />
          <div>
            <p className="text-xs text-muted-foreground">Mejor mes</p>
            <p className="text-lg font-bold">{resumen.mejorMes}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <BedDouble className="h-8 w-8 text-warning" />
          <div>
            <p className="text-xs text-muted-foreground">Mes a mejorar</p>
            <p className="text-lg font-bold">{resumen.peorMes}</p>
          </div>
        </CardContent></Card>
      </div>
    </MainLayout>
  );
}