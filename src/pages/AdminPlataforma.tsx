import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, ShieldCheck, Package, 
  Search, Trash2, Edit3, X, UserCog,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AdminPlataforma() {
  const queryClient = useQueryClient();
  
  const [busqueda, setBusqueda] = useState('');
  const [modalCliente, setModalCliente] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [formCliente, setFormCliente] = useState({ razon_social: '', email: '', password: '' });

  const { data: cuentas = [], isLoading: loadingCuentas } = useQuery({ queryKey: ['saas-cuentas'], queryFn: api.getCuentas });
  const { data: suscripciones = [], isLoading: loadingSuscripciones } = useQuery({ queryKey: ['saas-suscripciones'], queryFn: api.getSuscripcionesGlobales });
  const { data: planes = [], isLoading: loadingPlanes } = useQuery({ queryKey: ['saas-planes'], queryFn: api.getPlanes });

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c: any) => 
      !busqueda || 
      c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [cuentas, busqueda]);

  const suscripcionesFiltradas = useMemo(() => {
    return suscripciones.filter((s: any) => {
      const matchBusqueda = !busqueda || s.hotel_nombre?.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [suscripciones, busqueda, filtroEstado]);

  const crearClienteMutation = useMutation({
    mutationFn: (nuevo: any) => api.request('/saas/cuentas', 'POST', nuevo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      setModalCliente(false);
      setFormCliente({ razon_social: '', email: '', password: '' });
      toast.success("Cliente creado");
    },
    onError: () => toast.error("Error al crear cliente")
  });

  const eliminarSuscripcion = useMutation({
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción eliminada");
    }
  });

  const extenderSuscripcion = useMutation({
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}/extender`, 'POST', { dias: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("+30 días agregados");
    }
  });

  const handleCrearCliente = () => {
    if (!formCliente.razon_social || !formCliente.email || !formCliente.password) {
      toast.error("Completa todos los campos");
      return;
    }
    crearClienteMutation.mutate(formCliente);
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-slate-800">Control Diego</h1>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">ADMIN SAAS</span>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Buscar..." 
              className="pl-9 h-9 w-full md:w-56"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Button onClick={() => setModalCliente(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Nuevo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-lg mb-4">
          <TabsTrigger value="cuentas" className="data-[state=active]:bg-slate-100 rounded">
            <UserCog className="w-4 h-4 mr-2" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="suscripciones" className="data-[state=active]:bg-slate-100 rounded">
            <CreditCard className="w-4 h-4 mr-2" /> Suscripciones
          </TabsTrigger>
          <TabsTrigger value="planes" className="data-[state=active]:bg-slate-100 rounded">
            <Package className="w-4 h-4 mr-2" /> Planes
          </TabsTrigger>
        </TabsList>

        {/* CLIENTES */}
        <TabsContent value="cuentas">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-sm text-slate-600">{cuentasFiltradas.length} clientes</span>
              <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] })}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-600">Razón Social</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Email</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Hoteles</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Estado</th>
                  <th className="text-right p-3 font-semibold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingCuentas ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                ) : cuentasFiltradas.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400"><AlertCircle className="w-5 h-5 mx-auto mb-1" />Sin resultados</td></tr>
                ) : cuentasFiltradas.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{c.razon_social}</td>
                    <td className="p-3 text-slate-600">{c.email}</td>
                    <td className="p-3 text-center">{c.total_hoteles || 0}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.activo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit3 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* SUSCRIPCIONES */}
        <TabsContent value="suscripciones">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex flex-wrap gap-2 justify-between items-center bg-slate-50">
              <div className="flex gap-2 items-center">
                <select 
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="h-8 px-2 text-sm border border-slate-200 rounded bg-white"
                >
                  <option value="todos">Todos</option>
                  <option value="activa">Activas</option>
                  <option value="vencida">Vencidas</option>
                </select>
                <span className="text-sm text-slate-600">{suscripcionesFiltradas.length} resultados</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] })}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-600">Hotel</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Plan</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Vencimiento</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Días</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Estado</th>
                  <th className="text-right p-3 font-semibold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingSuscripciones ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                ) : suscripcionesFiltradas.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400"><AlertCircle className="w-5 h-5 mx-auto mb-1" />Sin resultados</td></tr>
                ) : suscripcionesFiltradas.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{s.hotel_nombre}</div>
                      <div className="text-xs text-slate-400">{s.cuenta_nombre}</div>
                    </td>
                    <td className="p-3 text-slate-600">{s.plan_nombre || 'Básico'}</td>
                    <td className="p-3 text-slate-600">{new Date(s.fecha_vencimiento).toLocaleDateString('es-MX')}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        s.dias_restantes <= 0 ? 'bg-red-100 text-red-700' :
                        s.dias_restantes <= 7 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {s.dias_restantes}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => extenderSuscripcion.mutate(s.id)}>+30</Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => eliminarSuscripcion.mutate(s.id)}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* PLANES */}
        <TabsContent value="planes">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-sm text-slate-600">{planes.length} planes</span>
              <Button size="sm" variant="outline" className="h-8"><Plus className="w-4 h-4 mr-1" /> Nuevo Plan</Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-600">ID</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Nombre</th>
                  <th className="text-right p-3 font-semibold text-slate-600">Costo Mensual</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Límite Hoteles</th>
                  <th className="text-center p-3 font-semibold text-slate-600">Hab. x Hotel</th>
                  <th className="text-right p-3 font-semibold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingPlanes ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                ) : planes.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-500">{p.id}</td>
                    <td className="p-3 font-medium text-slate-800">{p.nombre}</td>
                    <td className="p-3 text-right font-bold text-slate-800">${p.costo_mensual?.toLocaleString()}</td>
                    <td className="p-3 text-center">{p.limite_hoteles}</td>
                    <td className="p-3 text-center">{p.limite_habitaciones_por_hotel}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit3 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL CLIENTE */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Nuevo Cliente</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setModalCliente(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Razón Social</label>
                <Input 
                  placeholder="Empresa S.A." 
                  value={formCliente.razon_social}
                  onChange={(e) => setFormCliente({ ...formCliente, razon_social: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                <Input 
                  type="email" 
                  placeholder="admin@empresa.com"
                  value={formCliente.email}
                  onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Contraseña</label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={formCliente.password}
                  onChange={(e) => setFormCliente({ ...formCliente, password: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setModalCliente(false)}>Cancelar</Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700" 
                  onClick={handleCrearCliente}
                  disabled={crearClienteMutation.isPending}
                >
                  {crearClienteMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Crear'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
