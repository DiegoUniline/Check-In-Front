import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, Hotel, ShieldCheck, Package, Save, 
  Search, Trash2, Edit3, X, UserCog, CalendarPlus, Check
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

  // --- QUERIES (DATOS) ---
  const { data: cuentas = [] } = useQuery({ queryKey: ['saas-cuentas'], queryFn: api.getCuentas });
  const { data: suscripciones = [] } = useQuery({ queryKey: ['saas-suscripciones'], queryFn: api.getSuscripcionesGlobales });
  const { data: planes = [] } = useQuery({ queryKey: ['saas-planes'], queryFn: api.getPlanes });

  // --- MUTACIONES (ACCIONES) ---
  const crearClienteMutation = useMutation({
    mutationFn: (nuevo: any) => api.request('/saas/cuentas', 'POST', nuevo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      setModalCliente(false);
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

  return (
    <div className="p-6 space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-xl border border-blue-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Control Diego</h1>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">ADMIN SAAS v2.0</Badge>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Buscar en el sistema..." 
              className="pl-10 rounded-xl border-slate-200 w-full md:w-64"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Button onClick={() => setModalCliente(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-blue-200 shadow-lg">
            <Plus className="mr-2 w-5 h-5" /> NUEVO CLIENTE
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 p-1.5 rounded-2xl h-16 shadow-inner">
          <TabsTrigger value="cuentas" className="font-bold text-lg rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
            <UserCog className="mr-2" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="suscripciones" className="font-bold text-lg rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
            <CreditCard className="mr-2" /> Suscripciones
          </TabsTrigger>
          <TabsTrigger value="planes" className="font-bold text-lg rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">
            <Package className="mr-2" /> Planes
          </TabsTrigger>
        </TabsList>

        {/* CONTENIDO CLIENTES */}
        <TabsContent value="cuentas">
          <Card className="rounded-3xl border-none shadow-2xl overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Razón Social</th>
                  <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Email Acceso</th>
                  <th className="p-5 text-right text-xs font-black text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cuentas.map((c: any) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-5 font-bold text-slate-800">{c.razon_social}</td>
                    <td className="p-5 font-mono text-blue-600">{c.email}</td>
                    <td className="p-5 text-right">
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-blue-600">
                        <Edit3 size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* CONTENIDO SUSCRIPCIONES */}
        <TabsContent value="suscripciones">
          <Card className="rounded-3xl border-none shadow-2xl overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Hotel</th>
                  <th className="p-5 text-left text-xs font-black text-slate-400 uppercase">Vencimiento</th>
                  <th className="p-5 text-center text-xs font-black text-slate-400 uppercase">Estado</th>
                  <th className="p-5 text-right text-xs font-black text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suscripciones.map((s: any) => (
                  <tr key={s.id}>
                    <td className="p-5 font-black text-slate-800 uppercase tracking-tight">{s.hotel_nombre}</td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-bold">{new Date(s.fecha_vencimiento).toLocaleDateString()}</span>
                        <span className="text-[10px] text-red-500 font-black">{s.dias_restantes} DÍAS RESTANTES</span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <Badge className={s.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {s.estado.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-5 text-right gap-2 flex justify-end">
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 font-bold">+30 DÍAS</Button>
                      <Button size="sm" variant="ghost" className="text-slate-300 hover:text-red-500" onClick={() => eliminarSuscripcion.mutate(s.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* CONTENIDO PLANES */}
        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {planes.map((p: any) => (
              <Card key={p.id} className="p-8 rounded-3xl border-2 border-slate-100 hover:border-blue-500 transition-all shadow-xl bg-white group">
                <div className="flex justify-between items-center mb-6">
                  <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Package size={28} />
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 border-none font-bold italic uppercase">{p.id}</Badge>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic">{p.nombre}</h3>
                <div className="my-6">
                  <span className="text-5xl font-black text-slate-900">${p.costo_mensual}</span>
                  <span className="text-slate-400 font-bold ml-1">/ MES</span>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-600 font-medium">
                    <Hotel className="text-blue-500" size={20} /> {p.limite_hoteles} Hoteles permitidos
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 font-medium">
                    <Check className="text-green-500" size={20} /> {p.limite_habitaciones_por_hotel} Habitaciones x Hotel
                  </div>
                </div>
                <Button className="w-full py-7 rounded-2xl font-black text-lg bg-slate-900 hover:bg-blue-600 transition-all">
                  EDITAR COSTOS
                </Button>
              </Card>
            ))}
            <Card onClick={() => setModalPlan(true)} className="p-8 rounded-3xl border-4 border-dashed border-slate-200 hover:border-blue-400 flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 cursor-pointer transition-all min-h-[400px]">
              <Plus size={64} strokeWidth={3} />
              <p className="font-black text-xl mt-4 uppercase">Nuevo Modelo</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- MODAL PARA CREAR CLIENTE --- */}
      {modalCliente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Nuevo Cliente Directo</h2>
              <Button variant="ghost" onClick={() => setModalCliente(false)} className="rounded-full h-10 w-10 p-0"><X /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Razón Social</label>
                <Input placeholder="Ej: Diego León S.A.S" className="h-12 rounded-xl border-slate-200 mt-1" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Email de Acceso</label>
                <Input type="email" placeholder="diego@leon.com" className="h-12 rounded-xl border-slate-200 mt-1" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Contraseña Maestra</label>
                <Input type="password" placeholder="••••••••" className="h-12 rounded-xl border-slate-200 mt-1" />
              </div>
              <Button onClick={() => crearClienteMutation.mutate({})} className="w-full py-7 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black text-lg shadow-lg shadow-blue-200 mt-4">
                CREAR ACCESO MAESTRO
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
