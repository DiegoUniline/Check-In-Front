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

// DATOS DE RESPALDO (Por si el servidor falla o está vacío)
const PLANES_POR_DEFECTO = [
  { id: '1', nombre: 'Plan Básico', precio: 49, estado: 'Activo' },
  { id: '2', nombre: 'Plan Pro', precio: 99, estado: 'Activo' },
  { id: '3', nombre: 'Plan Enterprise', precio: 199, estado: 'Activo' }
];

export default function AdminPlataforma() {
  const queryClient = useQueryClient();
  
  // ESTADOS DE INTERFAZ
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>({});

  // --- CARGA DE DATOS ---
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

  // Intentamos traer planes, si no hay nada, usamos PLANES_POR_DEFECTO
  const { data: planesRaw = [] } = useQuery({ 
    queryKey: ['saas-planes'], 
    queryFn: api.getPlanes,
    retry: 1
  });

  const planes = planesRaw.length > 0 ? planesRaw : PLANES_POR_DEFECTO;

  // --- MUTACIONES ---
  const actualizarCuenta = useMutation({
    mutationFn: (data: any) => api.updateCuenta(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      setEditandoId(null);
      toast.success("Cliente actualizado");
    },
    onError: () => toast.error("Error al actualizar: Endpoint no encontrado (404)")
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
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><ShieldCheck /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Master Control Diego</h1>
            <p className="text-slate-500 text-sm font-medium">Panel de Administración Plataforma</p>
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
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white border h-14 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="cuentas" className="font-bold">Clientes Directos</TabsTrigger>
          <TabsTrigger value="suscripciones" className="font-bold">Suscripciones</TabsTrigger>
          <TabsTrigger value="planes" className="font-bold">Planes de Venta</TabsTrigger>
        </TabsList>

        {/* CONTENIDO CLIENTES */}
        <TabsContent value="cuentas">
          <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4">RAZÓN SOCIAL</th>
                  <th className="text-left p-4">EMAIL ACCESO</th>
                  <th className="text-right p-4">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {clientesFiltrados.length > 0 ? clientesFiltrados.map((c: any) => (
                  <tr key={c.id} className="hover:bg-blue-50/50">
                    <td className="p-4">
                      {editandoId === c.id ? (
                        <Input 
                          value={tempData.razon_social || ''} 
                          onChange={(e) => setTempData({...tempData, razon_social: e.target.value})}
                          className="h-8"
                        />
                      ) : (
                        <span className="font-bold text-slate-700">{c.razon_social || 'Sin nombre'}</span>
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
                          <Button size="sm" className="bg-green-600 h-8 px-2" onClick={() => actualizarCuenta.mutate(tempData)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditandoId(null)}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditandoId(c.id); setTempData(c); }}>
                          <Edit3 className="w-4 h-4 text-slate-400" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="p-10 text-center text-slate-400">No hay clientes registrados.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* CONTENIDO PLANES (CORREGIDO) */}
        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.map((p: any) => (
              <Card key={p.id} className="p-6 border-2 border-blue-50 shadow-md hover:shadow-lg transition-shadow bg-white rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-none">{p.estado}</Badge>
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{p.nombre}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">${p.precio}</span>
                  <span className="text-slate-500 text-sm">/mes</span>
                </div>
                <Button className="w-full mt-6 bg-slate-900 hover:bg-blue-600 font-bold py-5">
                  GESTIONAR PLAN
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="suscripciones">
           <Card className="p-10 text-center text-slate-400 border-dashed border-2">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Módulo de Suscripciones listo para vincular con pasarelas de pago.</p>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
