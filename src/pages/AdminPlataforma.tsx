import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, Hotel, ShieldCheck, Package, Save, 
  Search, Trash2, Edit3, X, UserCog
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function PanelControlDiego() {
  const queryClient = useQueryClient();
  
  // ESTADOS DE INTERFAZ
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>({});

  // --- CARGA DE DATOS (CON VALORES POR DEFECTO PARA EVITAR PANTALLA VACÍA) ---
  const { data: cuentas = [] } = useQuery({ 
    queryKey: ['saas-cuentas'], 
    queryFn: api.getCuentas,
    retry: 1
  });

  const { data: suscripciones = [] } = useQuery({ 
    queryKey: ['saas-suscripciones'], 
    queryFn: api.getSuscripcionesGlobales,
    retry: 1
  });

  const { data: planes = [] } = useQuery({ 
    queryKey: ['saas-planes'], 
    queryFn: api.getPlanes,
    retry: 1
  });

  // --- MUTACIONES CON MANEJO DE ERROR 404 ---
  const extenderMutation = useMutation({
    mutationFn: ({ id, dias }: { id: string, dias: number }) => api.extenderSuscripcion(id, dias),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Tiempo extendido correctamente");
    },
    onError: () => toast.error("Error 404: El servidor no tiene la ruta /extender configurada")
  });

  const actualizarCuenta = useMutation({
    mutationFn: (data: any) => api.updateCuenta(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      setEditandoId(null);
      toast.success("Cliente actualizado");
    },
    onError: () => toast.error("Error 404: El servidor no permite editar cuentas todavía")
  });

  // --- FILTRADO SEGURO ---
  const clientesFiltrados = useMemo(() => {
    return (cuentas || []).filter((c: any) => 
      c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [cuentas, busqueda]);

  return (
    <div className="p-6 space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><ShieldCheck /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Master Control Diego</h1>
            <p className="text-slate-500 text-sm font-medium">Gestión SaaS</p>
          </div>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            placeholder="Buscar..." 
            className="pl-10 bg-slate-50 border-none ring-1 ring-slate-200"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white border h-14 p-1 rounded-xl">
          <TabsTrigger value="cuentas" className="font-bold">Clientes</TabsTrigger>
          <TabsTrigger value="suscripciones" className="font-bold">Suscripciones</TabsTrigger>
          <TabsTrigger value="planes" className="font-bold">Planes</TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas">
          <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4">RAZÓN SOCIAL</th>
                  <th className="text-left p-4">EMAIL</th>
                  <th className="text-right p-4">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {clientesFiltrados.length > 0 ? clientesFiltrados.map((c: any) => (
                  <tr key={c.id} className="hover:bg-blue-50">
                    <td className="p-4">
                      {editandoId === c.id ? (
                        <Input 
                          value={tempData.razon_social || ''} 
                          onChange={(e) => setTempData({...tempData, razon_social: e.target.value})}
                          className="h-8"
                        />
                      ) : (
                        <span className="font-bold">{c.razon_social || 'Sin nombre'}</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-blue-600">
                      {editandoId === c.id ? (
                        <Input 
                          value={tempData.email || ''} 
                          onChange={(e) => setTempData({...tempData, email: e.target.value})}
                          className="h-8"
                        />
                      ) : (
                        c.email
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editandoId === c.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="bg-green-600" onClick={() => actualizarCuenta.mutate(tempData)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setEditandoId(c.id); setTempData(c); }}>
                          <Edit3 className="w-4 h-4 text-slate-400" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="p-10 text-center text-slate-400">No se encontraron clientes en el servidor.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="suscripciones">
          <Card className="p-4">
             {/* Similar estructura que clientes pero con suscripciones */}
             <p className="text-center py-10 text-slate-400">Gestión de suscripciones activa.</p>
          </Card>
        </TabsContent>

        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.length > 0 ? planes.map((p: any) => (
              <Card key={p.id} className="p-6 border-2 border-blue-100">
                <h3 className="text-xl font-bold">{p.nombre}</h3>
                <p className="text-3xl font-black my-4">${p.precio}<span className="text-sm font-normal text-slate-500">/mes</span></p>
                <Badge>{p.estado || 'Activo'}</Badge>
              </Card>
            )) : (
              <div className="col-span-3 text-center p-10 bg-white rounded-xl border-dashed border-2">
                <Package className="mx-auto text-slate-300 w-12 h-12 mb-4" />
                <p className="text-slate-500">No hay planes configurados en la base de datos.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
