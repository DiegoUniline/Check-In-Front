import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, Hotel, ShieldCheck, Package, Save, 
  Search, Trash2, Edit3, X, UserCog, CalendarPlus, Check,
  Filter, RefreshCw, Download, ChevronDown, AlertCircle,
  Clock, CheckCircle2, XCircle, Building2, Mail, Key
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminPlataforma() {
  const queryClient = useQueryClient();
  
  // ESTADOS PARA MODALES Y FORMULARIOS
  const [busqueda, setBusqueda] = useState('');
  const [modalCliente, setModalCliente] = useState(false);
  const [modalPlan, setModalPlan] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  
  // FILTROS
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPlan, setFiltroPlan] = useState<string>('todos');
  const [filtroVencimiento, setFiltroVencimiento] = useState<string>('todos');
  
  // FORM CLIENTE
  const [formCliente, setFormCliente] = useState({
    razon_social: '',
    email: '',
    password: ''
  });

  // --- QUERIES (DATOS) ---
  const { data: cuentas = [], isLoading: loadingCuentas } = useQuery({ queryKey: ['saas-cuentas'], queryFn: api.getCuentas });
  const { data: suscripciones = [], isLoading: loadingSuscripciones } = useQuery({ queryKey: ['saas-suscripciones'], queryFn: api.getSuscripcionesGlobales });
  const { data: planes = [], isLoading: loadingPlanes } = useQuery({ queryKey: ['saas-planes'], queryFn: api.getPlanes });

  // --- DATOS FILTRADOS ---
  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c: any) => {
      const matchBusqueda = !busqueda || 
        c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.email?.toLowerCase().includes(busqueda.toLowerCase());
      return matchBusqueda;
    });
  }, [cuentas, busqueda]);

  const suscripcionesFiltradas = useMemo(() => {
    return suscripciones.filter((s: any) => {
      const matchBusqueda = !busqueda || 
        s.hotel_nombre?.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
      const matchVencimiento = filtroVencimiento === 'todos' ||
        (filtroVencimiento === 'proximos' && s.dias_restantes <= 7) ||
        (filtroVencimiento === 'vencidos' && s.dias_restantes <= 0);
      return matchBusqueda && matchEstado && matchVencimiento;
    });
  }, [suscripciones, busqueda, filtroEstado, filtroVencimiento]);

  // --- STATS ---
  const stats = useMemo(() => ({
    totalCuentas: cuentas.length,
    suscripcionesActivas: suscripciones.filter((s: any) => s.estado === 'activa').length,
    suscripcionesVencidas: suscripciones.filter((s: any) => s.estado !== 'activa').length,
    proximosVencer: suscripciones.filter((s: any) => s.dias_restantes <= 7 && s.dias_restantes > 0).length
  }), [cuentas, suscripciones]);

  // --- MUTACIONES (ACCIONES) ---
  const crearClienteMutation = useMutation({
    mutationFn: (nuevo: any) => api.request('/saas/cuentas', 'POST', nuevo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      setModalCliente(false);
      setFormCliente({ razon_social: '', email: '', password: '' });
      toast.success("Cliente creado con éxito");
    },
    onError: () => toast.error("Error 404: El servidor no acepta creación de cuentas")
  });

  const eliminarSuscripcion = useMutation({
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.error("Acceso eliminado");
    }
  });

  const extenderSuscripcion = useMutation({
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}/extender`, 'POST', { dias: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción extendida 30 días");
    }
  });

  const handleCrearCliente = () => {
    if (!formCliente.razon_social || !formCliente.email || !formCliente.password) {
      toast.error("Todos los campos son requeridos");
      return;
    }
    crearClienteMutation.mutate(formCliente);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('todos');
    setFiltroPlan('todos');
    setFiltroVencimiento('todos');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-lg border border-slate-200/60">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3.5 rounded-xl text-white shadow-lg shadow-blue-500/25">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Control Diego</h1>
              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 font-semibold">
                ADMIN SAAS v2.0
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="Buscar cliente, hotel..." 
                className="pl-10 h-11 rounded-xl border-slate-200 w-full lg:w-72 focus:ring-2 focus:ring-blue-500/20"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => setModalCliente(true)} 
              className="bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
            >
              <Plus className="mr-2 w-5 h-5" /> NUEVO CLIENTE
            </Button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.totalCuentas}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Clientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.suscripcionesActivas}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Activas</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.proximosVencer}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Por Vencer</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.suscripcionesVencidas}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vencidas</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-white p-1.5 rounded-xl h-14 shadow-sm border border-slate-200/60">
          <TabsTrigger value="cuentas" className="font-bold rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <UserCog className="mr-2 w-4 h-4" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="suscripciones" className="font-bold rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <CreditCard className="mr-2 w-4 h-4" /> Suscripciones
          </TabsTrigger>
          <TabsTrigger value="planes" className="font-bold rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <Package className="mr-2 w-4 h-4" /> Planes
          </TabsTrigger>
        </TabsList>

        {/* CONTENIDO CLIENTES */}
        <TabsContent value="cuentas">
          <Card className="rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden bg-white">
            {/* TOOLBAR */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold">
                  {cuentasFiltradas.length} resultados
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] })}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="w-4 h-4 mr-1" /> Exportar
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Razón Social</th>
                    <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email Acceso</th>
                    <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Hoteles</th>
                    <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingCuentas ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Cargando...
                      </td>
                    </tr>
                  ) : cuentasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No se encontraron clientes
                      </td>
                    </tr>
                  ) : (
                    cuentasFiltradas.map((c: any) => (
                      <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {c.razon_social?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">{c.razon_social}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">{c.email}</span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="outline" className="font-bold">{c.total_hoteles || 0}</Badge>
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={c.activo !== false ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                            {c.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-blue-100 hover:text-blue-600">
                              <Edit3 size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-red-100 hover:text-red-600">
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* CONTENIDO SUSCRIPCIONES */}
        <TabsContent value="suscripciones">
          <Card className="rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden bg-white">
            {/* FILTROS */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="w-4 h-4 text-slate-400" />
                  
                  <select 
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activa">Activas</option>
                    <option value="vencida">Vencidas</option>
                    <option value="suspendida">Suspendidas</option>
                  </select>
                  
                  <select 
                    value={filtroVencimiento}
                    onChange={(e) => setFiltroVencimiento(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="todos">Todos los vencimientos</option>
                    <option value="proximos">Próximos 7 días</option>
                    <option value="vencidos">Ya vencidos</option>
                  </select>

                  {(filtroEstado !== 'todos' || filtroVencimiento !== 'todos' || busqueda) && (
                    <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-slate-500 hover:text-slate-700">
                      <X className="w-4 h-4 mr-1" /> Limpiar
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="font-semibold">
                    {suscripcionesFiltradas.length} resultados
                  </Badge>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] })}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hotel</th>
                    <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                    <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimiento</th>
                    <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Días</th>
                    <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingSuscripciones ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Cargando...
                      </td>
                    </tr>
                  ) : suscripcionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No se encontraron suscripciones
                      </td>
                    </tr>
                  ) : (
                    suscripcionesFiltradas.map((s: any) => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                              <Hotel size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{s.hotel_nombre}</p>
                              <p className="text-xs text-slate-400">{s.cuenta_nombre}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="font-semibold uppercase">
                            {s.plan_nombre || 'Básico'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-700">{new Date(s.fecha_vencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-black text-sm ${
                            s.dias_restantes <= 0 ? 'bg-red-100 text-red-700' :
                            s.dias_restantes <= 7 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {s.dias_restantes}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={
                            s.estado === 'activa' ? 'bg-green-100 text-green-700 border-green-200' : 
                            s.estado === 'suspendida' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }>
                            {s.estado?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-lg shadow-sm shadow-emerald-500/25 h-8 px-3"
                              onClick={() => extenderSuscripcion.mutate(s.id)}
                            >
                              <CalendarPlus className="w-4 h-4 mr-1" /> +30
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50" 
                              onClick={() => eliminarSuscripcion.mutate(s.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* CONTENIDO PLANES */}
        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {planes.map((p: any) => (
              <Card key={p.id} className="p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-400 transition-all shadow-lg bg-white group hover:shadow-xl">
                <div className="flex justify-between items-start mb-5">
                  <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Package size={24} />
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 border-none font-bold uppercase text-[10px]">{p.id}</Badge>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{p.nombre}</h3>
                <p className="text-sm text-slate-400 mb-4">{p.descripcion || 'Plan de suscripción'}</p>
                
                <div className="mb-5">
                  <span className="text-4xl font-black text-slate-900">${p.costo_mensual?.toLocaleString()}</span>
                  <span className="text-slate-400 font-semibold ml-1 text-sm">/ mes</span>
                </div>
                
                <div className="space-y-3 mb-6 py-4 border-y border-slate-100">
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <Hotel className="text-blue-500 w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{p.limite_hoteles} Hoteles</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <Check className="text-green-500 w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{p.limite_habitaciones_por_hotel} Hab. x Hotel</span>
                  </div>
                </div>
                
                <Button className="w-full py-5 rounded-xl font-bold bg-slate-900 hover:bg-blue-600 transition-all">
                  EDITAR PLAN
                </Button>
              </Card>
            ))}
            
            <Card 
              onClick={() => setModalPlan(true)} 
              className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 cursor-pointer transition-all min-h-[340px] hover:bg-blue-50/30"
            >
              <div className="p-4 rounded-full bg-slate-100 mb-4">
                <Plus size={32} strokeWidth={2.5} />
              </div>
              <p className="font-bold text-lg uppercase tracking-tight">Nuevo Plan</p>
              <p className="text-sm text-slate-400 mt-1">Crear modelo de precios</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- MODAL PARA CREAR CLIENTE --- */}
      {modalCliente && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 bg-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nuevo Cliente</h2>
                <p className="text-sm text-slate-400">Crear acceso maestro al sistema</p>
              </div>
              <Button variant="ghost" onClick={() => setModalCliente(false)} className="rounded-full h-9 w-9 p-0 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Razón Social
                </label>
                <Input 
                  placeholder="Ej: Hotel Paradise S.A." 
                  className="h-11 rounded-xl border-slate-200"
                  value={formCliente.razon_social}
                  onChange={(e) => setFormCliente({ ...formCliente, razon_social: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email de Acceso
                </label>
                <Input 
                  type="email" 
                  placeholder="admin@hotel.com" 
                  className="h-11 rounded-xl border-slate-200"
                  value={formCliente.email}
                  onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-1.5">
                  <Key className="w-3.5 h-3.5" /> Contraseña Maestra
                </label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-11 rounded-xl border-slate-200"
                  value={formCliente.password}
                  onChange={(e) => setFormCliente({ ...formCliente, password: e.target.value })}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setModalCliente(false)} 
                  className="flex-1 h-11 rounded-xl font-semibold"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCrearCliente}
                  disabled={crearClienteMutation.isPending}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/25"
                >
                  {crearClienteMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  CREAR CLIENTE
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
