import React, { useState, useMemo } from 'react';
import { 
  Plus, CreditCard, Hotel, ShieldCheck, Package, Save, Loader2,
  CheckCircle2, AlertTriangle, Search, Trash2, 
  CalendarPlus, Edit3, X, TrendingUp, UserCog
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // --- CARGA DE DATOS ---
  const { data: cuentas, isLoading: loadCuentas } = useQuery({ queryKey: ['saas-cuentas'], queryFn: api.getCuentas });
  const { data: suscripciones, isLoading: loadSusc } = useQuery({ queryKey: ['saas-suscripciones'], queryFn: api.getSuscripcionesGlobales });
  const { data: planes } = useQuery({ queryKey: ['saas-planes'], queryFn: api.getPlanes });

  // --- MUTACIONES (LAS QUE HACEN EL TRABAJO) ---
  const extenderMutation = useMutation({
    mutationFn: ({ id, dias }: { id: string, dias: number }) => api.extenderSuscripcion(id, dias),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Tiempo extendido correctamente");
    }
  });

  const eliminarSuscripcion = useMutation({
    mutationFn: (id: string) => api.eliminarSuscripcion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.error("Suscripción eliminada");
    }
  });

  const actualizarCuenta = useMutation({
    mutationFn: (data: any) => api.updateCuenta(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      setEditandoId(null);
      toast.success("Cliente actualizado");
    }
  });

  // --- FILTRADO ---
  const clientesFiltrados = useMemo(() => {
    return cuentas?.filter((c: any) => 
      c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [cuentas, busqueda]);

  return (
    <div className="p-6 space-y-8 bg-[#f8fafc] min-h-screen">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><ShieldCheck /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Master Control Diego</h1>
            <p className="text-slate-500 text-sm font-medium">Gestión de Clientes e Infraestructura SaaS</p>
          </div>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            placeholder="Buscar en todo el sistema..." 
            className="pl-10 bg-slate-50 border-none ring-1 ring-slate-200"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white border h-14 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="cuentas" className="font-bold"><UserCog className="mr-2 w-4 h-4"/> Clientes Directos</TabsTrigger>
          <TabsTrigger value="suscripciones" className="font-bold"><CreditCard className="mr-2 w-4 h-4"/> Pagos y Accesos</TabsTrigger>
          <TabsTrigger value="planes" className="font-bold"><Package className="mr-2 w-4 h-4"/> Config. de Planes</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA CLIENTES (CORREGIDA) --- */}
        <TabsContent value="cuentas">
          <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4 uppercase text-[10px]">Razón Social / Dueño</th>
                  <th className="text-left p-4 uppercase text-[10px]">Admin Contacto</th>
                  <th className="text-left p-4 uppercase text-[10px]">Email Acceso</th>
                  <th className="text-right p-4 uppercase text-[10px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {clientesFiltrados?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4">
                      {editandoId === c.id ? (
                        <Input 
                          defaultValue={c.razon_social} 
                          onChange={(e) => setTempData({...tempData, razon_social: e.target.value})}
                          className="h-8"
                        />
                      ) : (
                        <p className="font-bold text-slate-800">{c.razon_social || 'Sin Razón Social'}</p>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">
                      {editandoId === c.id ? (
                        <Input 
                          defaultValue={c.nombre_administrador} 
                          onChange={(e) => setTempData({...tempData, nombre_administrador: e.target.value})}
                          className="h-8"
                        />
                      ) : (
                        c.nombre_administrador || 'N/A'
                      )}
                    </td>
                    <td className="p-4 font-mono text-blue-600">
                      {editandoId === c.id ? (
                        <Input 
                          defaultValue={c.email} 
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
                          <Button size="sm" className="bg-green-600 h-8" onClick={() => actualizarCuenta.mutate({id: c.id, ...tempData})}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditandoId(null)}>
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
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA SUSCRIPCIONES (CON BOTONES REALES) --- */}
        <TabsContent value="suscripciones">
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4">HOTEL</th>
                  <th className="text-left p-4">VENCIMIENTO</th>
                  <th className="text-center p-4">ESTADO</th>
                  <th className="text-right p-4">GESTIÓN RÁPIDA</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {suscripciones?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold">{s.hotel_nombre}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono">{new Date(s.fecha_vencimiento).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{s.dias_restantes} días libres</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={s.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {s.estado.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-200" onClick={() => extenderMutation.mutate({id: s.id, dias: 30})}>
                        +30 DÍAS
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => { if(confirm('¿Eliminar acceso?')) eliminarSuscripcion.mutate(s.id) }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
