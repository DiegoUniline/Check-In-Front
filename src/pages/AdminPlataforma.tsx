import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, Hotel, ShieldCheck, Package, Save, 
  Search, Trash2, Edit3, X, UserCog, CalendarPlus, AlertTriangle
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
  
  // ESTADOS
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>({});
  const [mostrarCrearCuenta, setMostrarCrearCuenta] = useState(false);

  // --- QUERIES ---
  const { data: cuentas = [] } = useQuery({ queryKey: ['saas-cuentas'], queryFn: api.getCuentas });
  const { data: suscripciones = [] } = useQuery({ queryKey: ['saas-suscripciones'], queryFn: api.getSuscripcionesGlobales });
  const { data: planes = [] } = useQuery({ queryKey: ['saas-planes'], queryFn: api.getPlanes });

  // --- MUTACIONES (ACCIONES) ---
  const mutarSuscripcion = useMutation({
    mutationFn: ({ id, dias }: { id: string, dias: number }) => api.extenderSuscripcion(id, dias),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Vencimiento actualizado");
    },
    onError: () => toast.error("Error 404: El servidor no tiene la ruta /extender")
  });

  const eliminarSuscripcion = useMutation({
    mutationFn: (id: string) => api.eliminarSuscripcion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción eliminada");
    }
  });

  // --- FILTRADO ---
  const clientesFiltrados = useMemo(() => {
    return (cuentas || []).filter((c: any) => 
      c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [cuentas, busqueda]);

  return (
    <div className="p-6 space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER CON BOTÓN CREAR */}
      <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-2xl shadow-sm border gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><ShieldCheck /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">Master Control Diego</h1>
            <p className="text-slate-500 text-sm">Gestión de Clientes e Infraestructura</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => setMostrarCrearCuenta(true)} className="bg-blue-600 hover:bg-blue-700 font-bold">
              <Plus className="w-4 h-4 mr-2" /> NUEVO CLIENTE
           </Button>
           <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="Buscar..." className="pl-10" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
           </div>
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white border h-14 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="cuentas" className="font-bold">CLIENTES ({cuentas.length})</TabsTrigger>
          <TabsTrigger value="suscripciones" className="font-bold">ACCESOS Y PAGOS ({suscripciones.length})</TabsTrigger>
          <TabsTrigger value="planes" className="font-bold">PLANES CONFIG</TabsTrigger>
        </TabsList>

        {/* TABLA CLIENTES */}
        <TabsContent value="cuentas">
          <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4">RAZÓN SOCIAL</th>
                  <th className="text-left p-4">EMAIL</th>
                  <th className="text-right p-4">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientesFiltrados.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold">{c.razon_social}</td>
                    <td className="p-4 text-blue-600">{c.email}</td>
                    <td className="p-4 text-right">
                       <Button size="sm" variant="ghost"><Edit3 className="w-4 h-4" /></Button>
                       <Button size="sm" variant="ghost" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* TABLA SUSCRIPCIONES (¡AQUÍ GESTIONAS LOS ACCESOS!) */}
        <TabsContent value="suscripciones">
          <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4">HOTEL</th>
                  <th className="text-left p-4">VENCIMIENTO</th>
                  <th className="text-center p-4">ESTADO</th>
                  <th className="text-right p-4">GESTIÓN RÁPIDA</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suscripciones.length > 0 ? suscripciones.map((s: any) => (
                  <tr key={s.id}>
                    <td className="p-4 font-black">{s.hotel_nombre}</td>
                    <td className="p-4">
                      <div className="flex flex-col text-xs">
                        <span className="font-bold text-slate-700">{new Date(s.fecha_vencimiento).toLocaleDateString()}</span>
                        <span className="text-red-500 uppercase">{s.dias_restantes} días restantes</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={s.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {s.estado.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="sm" variant="outline" className="border-blue-600 text-blue-600 font-bold"
                              onClick={() => mutarSuscripcion.mutate({id: s.id, dias: 30})}>
                        +30 DÍAS
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" 
                              onClick={() => confirm('¿Cortar acceso?') && eliminarSuscripcion.mutate(s.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-400">No hay suscripciones activas vinculadas.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* PLANES */}
        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.map((p: any) => (
              <Card key={p.id} className="p-6 border-2 border-blue-50 bg-white rounded-2xl shadow-md">
                <h3 className="text-xl font-black uppercase tracking-tighter">{p.nombre}</h3>
                <p className="text-3xl font-black my-4 text-blue-600">${p.costo_mensual}</p>
                <div className="space-y-2 mb-6 text-sm text-slate-600">
                   <p>Max Hoteles: <strong>{p.limite_hoteles}</strong></p>
                   <p>Max Habs: <strong>{p.limite_habitaciones_por_hotel}</strong></p>
                </div>
                <Button className="w-full bg-slate-900">EDITAR REGLAS</Button>
              </Card>
            ))}
            {/* CARD PARA CREAR NUEVO PLAN */}
            <Card className="p-6 border-dashed border-2 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-400 cursor-pointer transition-all bg-white/50">
                <Plus className="w-10 h-10 mb-2" />
                <span className="font-bold uppercase text-xs">Crear Nuevo Modelo de Plan</span>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
