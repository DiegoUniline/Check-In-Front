import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, ShieldCheck, Package, 
  Search, Trash2, Edit3, X, UserCog,
  RefreshCw, AlertCircle, ChevronDown, ChevronRight, Hotel, Save
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
  const [expandedCuenta, setExpandedCuenta] = useState<string | null>(null);
  const [formCliente, setFormCliente] = useState({ razon_social: '', email: '', password: '' });

  // --- QUERIES ---
  const { data: cuentas = [], isLoading: loadingCuentas } = useQuery({ 
    queryKey: ['saas-cuentas'], 
    queryFn: api.getCuentas 
  });

  const { data: suscripciones = [] } = useQuery({ 
    queryKey: ['saas-suscripciones'], 
    queryFn: api.getSuscripcionesGlobales 
  });

  const { data: planes = [] } = useQuery({ 
    queryKey: ['saas-planes'], 
    queryFn: api.getPlanes 
  });

  // --- MUTACIONES ---
  
  // 1. CREAR CLIENTE
  const crearCliente = useMutation({
    mutationFn: (nuevo: typeof formCliente) => api.request('/saas/cuentas', 'POST', nuevo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cliente creado exitosamente");
      setModalCliente(false);
      setFormCliente({ razon_social: '', email: '', password: '' });
    },
    onError: (error: any) => toast.error("Error: " + error.message)
  });

  // 2. EXTENDER SUSCRIPCIÓN (CORREGIDO)
  const mutationExtender = useMutation({
    // Forzamos el POST y el body para que el backend lo reciba bien
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}/extender`, 'POST', { dias: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("¡Suscripción extendida +30 días!");
    },
    onError: () => toast.error("No se pudo extender la suscripción")
  });

  // 3. ELIMINAR CLIENTE
  const eliminarCliente = useMutation({
    mutationFn: (id: string) => api.request(`/saas/cuentas/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cliente eliminado definitivamente");
    }
  });

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c: any) => 
      !busqueda || 
      c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [cuentas, busqueda]);

  // --- COMPONENTE FILA CLIENTE ---
  const RenderFilaCliente = ({ cliente }: { cliente: any }) => {
    const isExpanded = expandedCuenta === cliente.id;
    const suscripcionesDelCliente = suscripciones.filter((s: any) => s.cuenta_id === cliente.id);

    return (
      <>
        <tr className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
            onClick={() => setExpandedCuenta(isExpanded ? null : cliente.id)}>
          <td className="p-4">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown size={16} className="text-blue-600" /> : <ChevronRight size={16} className="text-slate-400" />}
              <span className="font-bold text-slate-800">{cliente.razon_social}</span>
            </div>
          </td>
          <td className="p-4 text-slate-600 font-mono text-xs">{cliente.email}</td>
          <td className="p-4 text-center">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
              {suscripcionesDelCliente.length} Hoteles
            </span>
          </td>
          <td className="p-4 text-center">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${cliente.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {cliente.activo ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td className="p-4 text-right">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-400 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                if(confirm('¿Eliminar cliente y todos sus datos?')) eliminarCliente.mutate(cliente.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan={5} className="bg-slate-50/50 p-6 border-b border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suscripcionesDelCliente.length > 0 ? (
                  suscripcionesDelCliente.map((s: any) => (
                    <div key={s.id} className="bg-white border-2 border-white shadow-sm rounded-xl p-4">
                      <div className="flex justify-between mb-3">
                        <h4 className="font-black text-slate-800 uppercase text-xs">{s.hotel_nombre}</h4>
                        <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">{s.plan_nombre}</span>
                      </div>
                      <div className="space-y-1 mb-4">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimiento</p>
                        <p className="text-sm font-black text-slate-700">{new Date(s.fecha_vencimiento).toLocaleDateString()}</p>
                        <p className={`text-[10px] font-black uppercase ${s.dias_restantes < 5 ? 'text-red-500' : 'text-green-500'}`}>
                           {s.dias_restantes} DÍAS RESTANTES
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        disabled={mutationExtender.isPending}
                        onClick={() => mutationExtender.mutate(s.id)}
                        className="w-full bg-blue-600 hover:bg-slate-900 text-white font-bold text-[10px]"
                      >
                        {mutationExtender.isPending ? 'PROCESANDO...' : 'EXTENDER +30 DÍAS'}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center text-slate-400 italic py-4">Sin hoteles registrados.</p>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">SaaS Master Panel</h1>
          <p className="text-xs text-slate-400 font-bold">GESTIÓN DE INFRAESTRUCTURA - UNILINE</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Input 
            placeholder="Buscar por cliente..." 
            className="bg-white rounded-xl border-slate-200"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Button onClick={() => setModalCliente(true)} className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> NUEVO CLIENTE
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="space-y-6">
        <TabsList className="bg-slate-200 rounded-xl p-1">
          <TabsTrigger value="cuentas" className="rounded-lg font-bold">CLIENTES</TabsTrigger>
          <TabsTrigger value="planes" className="rounded-lg font-bold">PLANES DE SERVICIO</TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="text-left p-4">Razón Social</th>
                  <th className="text-left p-4">Email Acceso</th>
                  <th className="text-center p-4">Hoteles</th>
                  <th className="text-center p-4">Estado</th>
                  <th className="text-right p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingCuentas ? (
                  <tr><td colSpan={5} className="p-20 text-center animate-pulse">Cargando datos...</td></tr>
                ) : (
                  cuentasFiltradas.map((c: any) => <RenderFilaCliente key={c.id} cliente={c} />)
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.map((p: any) => (
              <div key={p.id} className="bg-white border-2 border-slate-100 p-6 rounded-2xl">
                <Package className="text-blue-600 mb-4" />
                <h3 className="font-black text-lg uppercase italic">{p.nombre}</h3>
                <p className="text-3xl font-black my-2">${p.costo_mensual}</p>
                <div className="space-y-2 mt-4 text-[10px] font-bold text-slate-500 uppercase">
                  <div className="flex justify-between border-b pb-1"><span>Límite Hoteles</span><span className="text-slate-900">{p.limite_hoteles}</span></div>
                  <div className="flex justify-between border-b pb-1"><span>Habitaciones</span><span className="text-slate-900">{p.limite_habitaciones_por_hotel}</span></div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL NUEVO CLIENTE */}
      {modalCliente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-black text-slate-900 uppercase italic">Nuevo Registro</h2>
              <button onClick={() => setModalCliente(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Razón Social</label>
                <Input 
                  value={formCliente.razon_social} 
                  onChange={e => setFormCliente({...formCliente, razon_social: e.target.value})}
                  className="rounded-xl mt-1" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Email Administrativo</label>
                <Input 
                  value={formCliente.email} 
                  onChange={e => setFormCliente({...formCliente, email: e.target.value})}
                  className="rounded-xl mt-1" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Contraseña Temporal</label>
                <Input 
                  type="password"
                  value={formCliente.password} 
                  onChange={e => setFormCliente({...formCliente, password: e.target.value})}
                  className="rounded-xl mt-1" 
                />
              </div>
              <Button 
                onClick={() => crearCliente.mutate(formCliente)}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold"
                disabled={crearCliente.isPending}
              >
                {crearCliente.isPending ? 'GUARDANDO...' : 'CREAR CUENTA'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
