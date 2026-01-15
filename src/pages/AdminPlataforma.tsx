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

export default function AdminPlataforma() {
  const queryClient = useQueryClient();
  
  // ESTADOS DE INTERFAZ
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>({});

  // --- CARGA DE DATOS REALES ---
  const { data: cuentas = [] } = useQuery({ 
    queryKey: ['saas-cuentas'], 
    queryFn: api.getCuentas 
  });

  const { data: planes = [] } = useQuery({ 
    queryKey: ['saas-planes'], 
    queryFn: api.getPlanes 
  });

  // --- MUTACIONES ---
  const actualizarCuenta = useMutation({
    mutationFn: (data: any) => api.updateCuenta(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      setEditandoId(null);
      toast.success("Cliente actualizado");
    },
    onError: () => toast.error("Error 404: El servidor no tiene la ruta PUT configurada")
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
      
      {/* HEADER DINÁMICO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><ShieldCheck /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Master Control Diego</h1>
            <p className="text-slate-500 text-sm font-medium">Infraestructura SaaS Check-In</p>
          </div>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            placeholder="Buscar clientes o emails..." 
            className="pl-10 bg-slate-50 border-none ring-1 ring-slate-200"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white border h-14 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="cuentas" className="font-bold">Clientes Directos</TabsTrigger>
          <TabsTrigger value="suscripciones" className="font-bold">Suscripciones</TabsTrigger>
          <TabsTrigger value="planes" className="font-bold">Estructura de Planes</TabsTrigger>
        </TabsList>

        {/* SECCIÓN CLIENTES */}
        <TabsContent value="cuentas">
          <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4">RAZÓN SOCIAL</th>
                  <th className="text-left p-4">EMAIL DE ACCESO</th>
                  <th className="text-right p-4">GESTIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {clientesFiltrados.map((c: any) => (
                  <tr key={c.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4">
                      {editandoId === c.id ? (
                        <Input 
                          value={tempData.razon_social || ''} 
                          onChange={(e) => setTempData({...tempData, razon_social: e.target.value})}
                          className="h-8"
                        />
                      ) : (
                        <span className="font-bold text-slate-700">{c.razon_social || 'N/A'}</span>
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
                          <Button size="sm" className="bg-green-600 h-8" onClick={() => actualizarCuenta.mutate(tempData)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditandoId(null)}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setEditandoId(c.id); setTempData(c); }}>
                          <Edit3 className="w-4 h-4 text-slate-400" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* SECCIÓN PLANES - YA FUNCIONA CON costo_mensual */}
        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.map((p: any) => (
              <Card key={p.id} className="p-6 border-2 border-blue-50 shadow-md bg-white rounded-2xl relative">
                <div className="absolute top-4 right-4">
                  <Badge className={p.activo ? "bg-green-100 text-green-700 border-none" : "bg-red-100 text-red-700 border-none"}>
                    {p.activo ? 'ACTIVO' : 'INACTIVO'}
                  </Badge>
                </div>

                <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                  <Package className="text-white w-6 h-6" />
                </div>

                <h3 className="text-xl font-black text-slate-800 uppercase italic">{p.nombre}</h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">${p.costo_mensual}</span>
                  <span className="text-slate-500 text-sm font-medium">/ mes</span>
                </div>

                <div className="mt-6 space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                    <Hotel className="w-4 h-4 text-blue-500" />
                    Límite: {p.limite_hoteles} {p.limite_hoteles === 1 ? 'Hotel' : 'Hoteles'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Max {p.limite_habitaciones_por_hotel} habs/hotel
                  </div>
                </div>

                <Button className="w-full mt-6 bg-slate-900 hover:bg-blue-700 text-white font-bold h-12 rounded-xl transition-all">
                  AJUSTAR LÍMITES
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suscripciones">
          <Card className="p-12 text-center border-dashed border-2 border-slate-200 rounded-2xl">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-bold text-slate-700">Control de Facturación</h3>
            <p className="text-slate-400 max-w-xs mx-auto">Aquí verás los ingresos mensuales y las fechas de corte de cada hotel.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
