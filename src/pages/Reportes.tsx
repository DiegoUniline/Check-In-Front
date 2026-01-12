import { useState } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, 
  Users, BedDouble, Calendar, Download, FileText
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

// Mock data for charts
const revenueData = [
  { mes: 'Ene', ingresos: 245000, gastos: 180000 },
  { mes: 'Feb', ingresos: 312000, gastos: 195000 },
  { mes: 'Mar', ingresos: 289000, gastos: 188000 },
  { mes: 'Abr', ingresos: 356000, gastos: 210000 },
  { mes: 'May', ingresos: 398000, gastos: 225000 },
  { mes: 'Jun', ingresos: 420000, gastos: 240000 },
];

const occupancyData = [
  { dia: 'Lun', ocupacion: 65 },
  { dia: 'Mar', ocupacion: 72 },
  { dia: 'Mié', ocupacion: 78 },
  { dia: 'Jue', ocupacion: 85 },
  { dia: 'Vie', ocupacion: 92 },
  { dia: 'Sáb', ocupacion: 98 },
  { dia: 'Dom', ocupacion: 88 },
];

const sourceData = [
  { name: 'Directo', value: 45, color: 'hsl(var(--primary))' },
  { name: 'Booking', value: 25, color: 'hsl(var(--info))' },
  { name: 'Expedia', value: 15, color: 'hsl(var(--warning))' },
  { name: 'Otros', value: 15, color: 'hsl(var(--muted-foreground))' },
];

const roomTypeData = [
  { tipo: 'Estándar', reservas: 120, ingresos: 144000 },
  { tipo: 'Superior', reservas: 85, ingresos: 153000 },
  { tipo: 'Deluxe', reservas: 45, ingresos: 112500 },
  { tipo: 'Suite', reservas: 20, ingresos: 80000 },
  { tipo: 'Familiar', reservas: 30, ingresos: 84000 },
];

export default function Reportes() {
  const [periodo, setPeriodo] = useState('mes');

  return (
    <MainLayout 
      title="Reportes" 
      subtitle="Estadísticas y análisis del hotel"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Tabs defaultValue="general">
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
          <Button variant="outline">
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
                <p className="text-2xl font-bold">$420,000</p>
                <p className="text-sm text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12.5%
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
                <p className="text-2xl font-bold">84%</p>
                <p className="text-sm text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +5.2%
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
                <p className="text-2xl font-bold">342</p>
                <p className="text-sm text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +8.1%
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
                <p className="text-2xl font-bold">$1,850</p>
                <p className="text-sm text-destructive flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> -2.3%
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
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v/1000}k`} />
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
                  <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Ocupación']}
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
              {roomTypeData.map(room => (
                <div key={room.tipo} className="flex items-center gap-4">
                  <div className="w-24 font-medium">{room.tipo}</div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(room.ingresos / 160000) * 100}%` }}
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}