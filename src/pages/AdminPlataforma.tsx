import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, ShieldCheck, Package, 
  Search, Trash2, Edit3, X, UserCog,
  RefreshCw, AlertCircle, ChevronDown, ChevronRight, Hotel
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

  // --- LÓGICA DE FILTRADO ---
  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c: any) => 
      !busqueda || 
      c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [cuentas, busqueda]);

  // --- MUTACIONES ---
  const extenderSuscripcion = useMutation({
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}/extender`, 'POST', { dias: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción extendida +30 días");
    },
    onError: () => toast.error("Error al extender suscripción")
  });

  // --- RENDERIZADO DE FILA DE CLIENTE ---
  const RenderFilaCliente = ({ cliente }: { cliente: any }) => {
    const isExpanded = expandedCuenta === cliente.id;
    // Buscamos los hoteles/suscripciones que pertenecen a este cliente
    const suscripcionesDelCliente = suscripciones.filter((s: any) => s.cuenta_id === cliente.id);

    return (
      <>
        <tr className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
            onClick={() => setExpandedCuenta(isExpanded ? null : cliente.id)}>
          <td className="p-3">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown size={16} className="text-blue-600" /> : <ChevronRight size={16} className="text-slate-400" />}
              <span className="font-bold text-slate-800">{cliente.razon_social}</span>
            </div>
          </td>
          <td className="p-3 text-slate-600 font-mono text-xs">{cliente.email}</td>
          <td className="p-3 text-center">
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {suscripcionesDelCliente.length} Hoteles
            </span>
          </td>
          <td className="p-3 text-center">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${cliente.activo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {cliente.activo !== false ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td className="p-3 text-right">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}><Edit3 className="w-4 h-4" /></Button>
          </td>
        </tr>

        {/* DETALLE EXPANDIDO: HOTELES Y SUSCRIPCIONES */}
        {isExpanded && (
          <tr>
            <td colSpan={5} className="bg-slate-50/50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suscripcionesDelCliente.length > 0 ? (
                  suscripcionesDelCliente.map((s: any) => (
                    <div key={s.id} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-black text-slate-800 uppercase text-sm leading-tight">{s.hotel_nombre}</h4>
                          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{s.plan_nombre || 'Plan Básico'}</p>
                        </div>
                        <Hotel className="text-slate-200" size={20} />
                      </div>

                      <div className="flex items-center justify-between text-xs border-t pt-3">
                        <div>
                          <p className="text-slate-400 font-medium">Vence el:</p>
                          <p className="font-bold text-slate-700">{new Date(s.fecha_vencimiento).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 font-medium">Estado:</p>
                          <span className={`font-black uppercase text-[9px] ${s.estado === 'activa' ? 'text-green-600' : 'text-red-600'}`}>
                            {s.estado}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button 
                          onClick={() => extenderSuscripcion.mutate(s.id)}
                          className="flex-1 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-bold h-8 rounded-lg"
                        >
                          EXTENDER (+30 DÍAS)
                        </Button>
                        <Button variant="outline" className="h-8 w-8 p-0 text-red-500 border-red-100 hover:bg-red-50">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm italic">
                    Este cliente no tiene hoteles registrados aún.
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
             <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">SaaS Master Control</h1>
            <p className="text-[10px] text-slate-400 font-bold">DIEGO LEÓN ADMIN PANEL</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Buscar cliente o email..." 
              className="pl-9 h-10 w-full md:w-64 rounded-xl border-slate-200"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Button onClick={() => setModalCliente(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold px-4">
            <Plus className="w-4 h-4 mr-1" /> NUEVO CLIENTE
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="bg-slate-200/50 p-1 rounded-xl mb-6 inline-flex w-full md:w-auto">
          <TabsTrigger value="cuentas" className="rounded-lg font-bold px-6">GESTIÓN DE CLIENTES</TabsTrigger>
          <TabsTrigger value="planes" className="rounded-lg font-bold px-6">PLANES</TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest">Cliente</th>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest">Credenciales</th>
                  <th className="text-center p-4 font-bold text-xs uppercase tracking-widest">Activos</th>
                  <th className="text-center p-4 font-bold text-xs uppercase tracking-widest">Estatus</th>
                  <th className="text-right p-4 font-bold text-xs uppercase tracking-widest">⚙️</th>
                </tr>
              </thead>
              <tbody>
                {loadingCuentas ? (
                  <tr><td colSpan={5} className="p-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 opacity-20" /></td></tr>
                ) : cuentasFiltradas.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-400">No se encontraron clientes</td></tr>
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
              <CardPlan key={p.id} plan={p} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* REUTILIZAMOS TU MODAL DE CLIENTE AQUÍ ABAJO */}
      {/* ... (ModalCliente igual al anterior) ... */}
    </div>
  );
}

function CardPlan({ plan }: { plan: any }) {
  return (
    <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl shadow-sm hover:border-blue-500 transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Package size={24} /></div>
        <BadgePlan id={plan.id} />
      </div>
      <h3 className="text-xl font-black text-slate-800 uppercase italic">{plan.nombre}</h3>
      <div className="my-4">
        <span className="text-4xl font-black">${plan.costo_mensual}</span>
        <span className="text-slate-400 text-xs font-bold"> / MES</span>
      </div>
      <div className="space-y-2 text-xs font-bold text-slate-500 uppercase tracking-tighter">
        <div className="flex justify-between border-b pb-1"><span>Límite Hoteles</span><span className="text-slate-900">{plan.limite_hoteles}</span></div>
        <div className="flex justify-between border-b pb-1"><span>Habs x Hotel</span><span className="text-slate-900">{plan.limite_habitaciones_por_hotel}</span></div>
      </div>
      <Button className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl h-12 shadow-none border-none">
        MODIFICAR PLAN
      </Button>
    </div>
  );
}

function BadgePlan({ id }: { id: string }) {
  return <span className="bg-slate-900 text-white text-[9px] px-2 py-1 rounded font-black uppercase italic">{id}</span>;
}
