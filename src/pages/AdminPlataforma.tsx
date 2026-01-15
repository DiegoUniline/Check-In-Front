import React, { useState } from 'react';
import { 
  Plus, CreditCard, Hotel, 
  ShieldCheck, Package, Save, Loader2,
  CheckCircle2, Globe, AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api'; // Asegúrate de que api.ts tenga los métodos actualizados
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PanelControlDiego() {
  const queryClient = useQueryClient();
  
  // --- CARGA DE DATOS ---
  const { data: cuentas, isLoading: loadingCuentas } = useQuery({
    queryKey: ['saas-cuentas'],
    queryFn: () => api.getCuentas()
  });

  const { data: planes, isLoading: loadingPlanes } = useQuery({
    queryKey: ['saas-planes'],
    queryFn: () => api.getPlanes()
  });

  const { data: suscripciones } = useQuery({
    queryKey: ['saas-suscripciones'],
    queryFn: () => api.getSuscripcionesGlobales()
  });

  // --- MUTACIÓN PARA REGISTRAR HOTEL (Transacción Maestra) ---
  const registrarHotelMutation = useMutation({
    mutationFn: (data: any) => api.registrarHotelFull(data), // Usa el endpoint POST /registrar-hotel
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Hotel y Cuenta creados exitosamente");
    },
    onError: (error: any) => {
      toast.error("Error al registrar: " + error.message);
    }
  });

  const handleRegistroHotel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      razon_social: formData.get('razon_social'),
      administrador: formData.get('administrador'),
      email: formData.get('email'),
      hotel_nombre: formData.get('hotel_nombre'),
      plan_id: formData.get('plan_id')
    };

    registrarHotelMutation.mutate(data);
    e.currentTarget.reset();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel Maestro: Diego León</h1>
          <p className="text-slate-500">Gestión de infraestructura SaaS Uniline</p>
        </div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg">
          <ShieldCheck className="w-5 h-5" /> MODO SUPERUSER
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white border">
          <TabsTrigger value="cuentas"><Hotel className="w-4 h-4 mr-2" /> Cuentas y Hoteles</TabsTrigger>
          <TabsTrigger value="suscripciones"><CreditCard className="w-4 h-4 mr-2" /> Suscripciones</TabsTrigger>
          <TabsTrigger value="planes"><Package className="w-4 h-4 mr-2" /> Planes Comerciales</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA CUENTAS Y REGISTRO --- */}
        <TabsContent value="cuentas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border-blue-100 shadow-md">
              <CardHeader>
                <CardTitle className="text-blue-700">Alta de Nuevo Cliente</CardTitle>
                <CardDescription>Crea cuenta, hotel y suscripción en un paso</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegistroHotel} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Razón Social (Dueño)</Label>
                    <Input name="razon_social" required placeholder="Ej: Inversiones Hoteleras S.A." />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del Hotel</Label>
                    <Input name="hotel_nombre" required placeholder="Ej: Hotel Paraíso" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Admin</Label>
                    <Input name="email" type="email" required placeholder="admin@hotel.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Seleccionar Plan</Label>
                    <select name="plan_id" className="w-full border rounded-md p-2 text-sm bg-white" required>
                      <option value="">Seleccione un plan...</option>
                      {planes?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.nombre} - ${p.costo_mensual}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={registrarHotelMutation.isPending}>
                    {registrarHotelMutation.isPending ? <Loader2 className="animate-spin" /> : "Activar Acceso Full"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle>Cuentas Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-3">Cliente / Razón Social</th>
                        <th className="text-left p-3">Administrador</th>
                        <th className="text-left p-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cuentas?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold">{c.razon_social}</td>
                          <td className="p-3">{c.nombre_administrador}</td>
                          <td className="p-3 text-slate-500">{c.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- PESTAÑA PLANES (Con nombres de columnas reales) --- */}
        <TabsContent value="planes">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-900 text-white rounded-t-lg">
              <CardTitle>Configuración de Productos</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {planes?.map((p: any) => (
                  <div key={p.id} className="relative border-2 border-slate-100 p-5 rounded-2xl bg-white hover:border-blue-500 transition-all shadow-sm">
                    {p.activo ? <div className="absolute top-3 right-3 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVO</div> : null}
                    <h3 className="font-bold text-xl text-slate-800">{p.nombre}</h3>
                    <div className="my-4">
                      <span className="text-3xl font-black text-blue-600">${p.costo_mensual}</span>
                      <span className="text-slate-400 text-sm ml-1">/mes</span>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600 mb-6">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Máx. {p.limite_hoteles} Hotel(es)</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {p.limite_habitaciones_por_hotel} Habitaciones</li>
                    </ul>
                    <Button variant="outline" className="w-full border-slate-200">Editar Beneficios</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA SUSCRIPCIONES (Lógica de alertas) --- */}
        <TabsContent value="suscripciones">
          <Card className="shadow-md border-green-100">
            <CardHeader className="border-b bg-green-50/50">
              <CardTitle className="text-green-800 flex items-center gap-2">Monitor de Accesos</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {suscripciones?.map((s: any) => {
                  const dias = s.dias_restantes;
                  const esCritico = dias <= 7;
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-4 border rounded-xl ${esCritico ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                      <div className="flex gap-4 items-center">
                        <div className={`p-2 rounded-full ${esCritico ? 'bg-red-100' : 'bg-green-100'}`}>
                          {esCritico ? <AlertTriangle className="text-red-600 w-5 h-5" /> : <CheckCircle2 className="text-green-600 w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{s.hotel_nombre || 'Hotel sin nombre'}</p>
                          <p className="text-xs text-slate-500">Titular: {s.razon_social}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Plan</p>
                          <p className="text-sm font-semibold">{s.plan_nombre}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Vence</p>
                          <p className={`text-sm font-bold ${esCritico ? 'text-red-600' : 'text-slate-700'}`}>
                            {new Date(s.fecha_vencimiento).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`px-4 py-1 rounded-full text-xs font-black ${esCritico ? 'bg-red-600 text-white' : 'bg-green-100 text-green-700'}`}>
                          {esCritico ? `${dias} DÍAS RESTANTES` : 'ACTIVO'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
