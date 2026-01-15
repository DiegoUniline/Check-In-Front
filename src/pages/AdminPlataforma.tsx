import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, Hotel, ShieldCheck, Package, Save, Loader2,
  CheckCircle2, Globe, AlertTriangle, Search, Filter, Trash2, 
  CalendarPlus, Edit3, X, TrendingUp, Users
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PanelControlDiego() {
  const queryClient = useQueryClient();
  
  // --- ESTADOS DE FILTRO ---
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPlan, setFiltroPlan] = useState('todos');

  // --- CARGA DE DATOS ---
  const { data: cuentas } = useQuery({ queryKey: ['saas-cuentas'], queryFn: api.getCuentas });
  const { data: planes } = useQuery({ queryKey: ['saas-planes'], queryFn: api.getPlanes });
  const { data: suscripciones } = useQuery({ queryKey: ['saas-suscripciones'], queryFn: api.getSuscripcionesGlobales });

  // --- LÓGICA DE FILTRADO (SUSCRIPCIONES) ---
  const suscripcionesFiltradas = useMemo(() => {
    return suscripciones?.filter((s: any) => {
      const matchBusqueda = s.hotel_nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
                            s.razon_social?.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
      const matchPlan = filtroPlan === 'todos' || s.plan_nombre === filtroPlan;
      return matchBusqueda && matchEstado && matchPlan;
    });
  }, [suscripciones, busqueda, filtroEstado, filtroPlan]);

  // --- MUTACIONES ---
  const extenderMutation = useMutation({
    mutationFn: ({ id, dias }: { id: string, dias: number }) => api.extenderSuscripcion(id, dias),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Tiempo de acceso extendido");
    }
  });

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER & STATS */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                <ShieldCheck className="w-8 h-8" />
            </div>
            SaaS Master Control <span className="text-blue-600">Diego León</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Infraestructura Uniline • Estatus del Sistema: <span className="text-green-600">Online</span></p>
        </div>

        <div className="grid grid-cols-2 md:flex gap-4 w-full md:w-auto">
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Hotel className="w-5 h-5"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Hoteles</p>
                    <p className="text-xl font-black">{suscripciones?.length || 0}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-full text-green-600"><TrendingUp className="w-5 h-5"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Activos</p>
                    <p className="text-xl font-black">{suscripciones?.filter((s:any) => s.estado === 'activa').length || 0}</p>
                </div>
            </div>
        </div>
      </div>

      <Tabs defaultValue="suscripciones" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start gap-8 mb-6 h-auto p-0">
          <TabsTrigger value="suscripciones" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none pb-4 font-bold">Monitor de Accesos</TabsTrigger>
          <TabsTrigger value="cuentas" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none pb-4 font-bold">Base de Clientes</TabsTrigger>
          <TabsTrigger value="planes" className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none pb-4 font-bold">Configuración de Planes</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA PRINCIPAL: MONITOR --- */}
        <TabsContent value="suscripciones" className="space-y-6">
          
          {/* BARRA DE HERRAMIENTAS / FILTROS */}
          <Card className="border-none shadow-sm overflow-visible">
            <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center min-w-[300px]">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input 
                        placeholder="Buscar por hotel o razón social..." 
                        className="pl-10 h-11 bg-slate-50 border-none ring-1 ring-slate-200"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <select 
                    className="h-11 border-none ring-1 ring-slate-200 rounded-md px-3 text-sm font-medium bg-white"
                    onChange={(e) => setFiltroEstado(e.target.value)}
                >
                    <option value="todos">Todos los Estados</option>
                    <option value="activa">Solo Activos</option>
                    <option value="vencida">Solo Vencidos</option>
                </select>
                <select 
                    className="h-11 border-none ring-1 ring-slate-200 rounded-md px-3 text-sm font-medium bg-white"
                    onChange={(e) => setFiltroPlan(e.target.value)}
                >
                    <option value="todos">Todos los Planes</option>
                    {planes?.map((p:any) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* TABLA MAESTRA */}
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-5 font-bold uppercase text-[10px] tracking-widest">Información del Hotel</th>
                  <th className="text-left p-5 font-bold uppercase text-[10px] tracking-widest">Plan</th>
                  <th className="text-left p-5 font-bold uppercase text-[10px] tracking-widest">Vencimiento</th>
                  <th className="text-center p-5 font-bold uppercase text-[10px] tracking-widest">Estatus</th>
                  <th className="text-right p-5 font-bold uppercase text-[10px] tracking-widest">Gestión Directa</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {suscripcionesFiltradas?.map((s: any) => {
                  const esCritico = s.dias_restantes <= 7;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-5">
                        <p className="font-black text-slate-800 text-base">{s.hotel_nombre}</p>
                        <p className="text-xs text-slate-400 font-medium">ID: {s.hotel_id} • {s.razon_social}</p>
                      </td>
                      <td className="p-5">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase text-[10px]">
                            {s.plan_nombre}
                        </Badge>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                            <span className={`font-mono font-bold ${esCritico ? 'text-red-600' : 'text-slate-700'}`}>
                                {new Date(s.fecha_vencimiento).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{s.dias_restantes} días restantes</span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className={`mx-auto w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 ${s.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${s.estado === 'activa' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                            {s.estado}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white font-bold h-9"
                                onClick={() => extenderMutation.mutate({ id: s.id, dias: 30 })}
                            >
                                <CalendarPlus className="w-4 h-4 mr-2" /> +30 DÍAS
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-9">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA: PLANES (DISEÑO CARDS) --- */}
        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {planes?.map((p: any) => (
              <Card key={p.id} className="relative overflow-hidden border-2 hover:border-blue-500 transition-all shadow-lg group">
                <div className="bg-slate-900 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <Package className="w-10 h-10 opacity-50" />
                        <Badge className="bg-blue-600">ID: {p.id}</Badge>
                    </div>
                    <h3 className="text-2xl font-black mt-4">{p.nombre}</h3>
                </div>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <Label className="text-[10px] font-black uppercase text-slate-400">Costo Mensual ($)</Label>
                            <Input defaultValue={p.costo_mensual} type="number" className="text-xl font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[10px] font-black uppercase text-slate-400">Límite Hoteles</Label>
                                <Input defaultValue={p.limite_hoteles} type="number" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-black uppercase text-slate-400">Límite Hab.</Label>
                                <Input defaultValue={p.limite_habitaciones_por_hotel} type="number" />
                            </div>
                        </div>
                    </div>
                    <Button className="w-full bg-slate-100 text-slate-900 hover:bg-blue-600 hover:text-white transition-colors">
                        <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                    </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
