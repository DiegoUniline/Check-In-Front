import React, { useState } from 'react';
import { 
  Plus, CreditCard, Hotel, 
  ShieldCheck, Package, Save, Loader2,
  CheckCircle2, Globe
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // --- MUTACIONES (GUARDAR DATOS) ---
  const createCuentaMutation = useMutation({
    mutationFn: (data: any) => api.createCuenta(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cuenta creada exitosamente");
    }
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: any) => api.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-planes'] });
      toast.success("Nuevo plan comercial activado");
    }
  });

  // --- HANDLERS ---
  const handleNuevaCuenta = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombre_propietario: formData.get('nombre'),
      email_contacto: formData.get('email'),
      rfc: formData.get('rfc'),
    };
    createCuentaMutation.mutate(data);
    e.currentTarget.reset();
  };

  const handleNuevoPlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombre: formData.get('nombre'),
      precio: parseFloat(formData.get('precio') as string),
      meses: parseInt(formData.get('meses') as string),
      limite_habitaciones: parseInt(formData.get('limite') as string),
    };
    createPlanMutation.mutate(data);
    e.currentTarget.reset();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel Maestro: Diego León</h1>
          <p className="text-slate-500">Gestión de infraestructura y facturación Uniline</p>
        </div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg">
          <ShieldCheck className="w-5 h-5" /> MODO SUPERUSER
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-white border">
          <TabsTrigger value="cuentas" className="flex gap-2">
            <Hotel className="w-4 h-4" /> Cuentas y Clientes
          </TabsTrigger>
          <TabsTrigger value="suscripciones" className="flex gap-2">
            <CreditCard className="w-4 h-4" /> Suscripciones Activas
          </TabsTrigger>
          <TabsTrigger value="planes" className="flex gap-2">
            <Package className="w-4 h-4" /> Configuración de Planes
          </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA CUENTAS --- */}
        <TabsContent value="cuentas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 shadow-sm border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-700">Registrar Dueño / Empresa</CardTitle>
                <CardDescription>Crea la entidad legal que contratará el servicio</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNuevaCuenta} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre o Razón Social</Label>
                    <Input name="nombre" required placeholder="Ej: Operadora Hotelera S.A." />
                  </div>
                  <div className="space-y-2">
                    <Label>Email de Facturación / Admin</Label>
                    <Input name="email" type="email" required placeholder="admin@hotel.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>RFC (Opcional)</Label>
                    <Input name="rfc" placeholder="XAXX010101000" />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createCuentaMutation.isPending}>
                    {createCuentaMutation.isPending ? <Loader2 className="animate-spin" /> : "Crear Cuenta Maestro"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle>Cuentas en el Sistema</CardTitle>
                <CardDescription>Listado de clientes registrados actualmente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium">Cliente</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">RFC</th>
                        <th className="text-center p-3 font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loadingCuentas ? (
                        <tr><td colSpan={4} className="p-4 text-center">Cargando cuentas...</td></tr>
                      ) : cuentas?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold">{c.nombre_propietario}</td>
                          <td className="p-3 text-slate-500">{c.email_contacto}</td>
                          <td className="p-3 text-slate-500">{c.rfc || 'N/A'}</td>
                          <td className="p-3 text-center">
                            <Button size="sm" variant="ghost" className="text-blue-600">Ver Hoteles</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- PESTAÑA PLANES --- */}
        <TabsContent value="planes">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-900 text-white rounded-t-lg">
              <CardTitle>Estructura de Precios Uniline</CardTitle>
              <CardDescription className="text-slate-400">Define los productos que Diego puede vender</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleNuevoPlan} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Nombre del Plan</Label>
                  <Input name="nombre" placeholder="Ej: Plan Gold" required />
                </div>
                <div className="space-y-2">
                  <Label>Costo Mensual ($)</Label>
                  <Input name="precio" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label>Duración (Meses)</Label>
                  <Input name="meses" type="number" defaultValue="1" required />
                </div>
                <div className="space-y-2">
                  <Label>Límite Habs.</Label>
                  <Input name="limite" type="number" placeholder="999" />
                </div>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                  <Save className="mr-2 w-4 h-4" /> Guardar Plan
                </Button>
              </form>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {planes?.map((p: any) => (
                  <div key={p.id} className="border p-4 rounded-xl bg-white flex justify-between items-center shadow-sm">
                    <div>
                      <h3 className="font-bold text-lg">{p.nombre}</h3>
                      <p className="text-2xl font-black text-blue-600">${p.precio} <span className="text-xs text-slate-400">/mes</span></p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{p.meses} meses</p>
                      <p>{p.limite_habitaciones} habitaciones</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA SUSCRIPCIONES --- */}
        <TabsContent value="suscripciones">
          <Card className="shadow-md border-green-100">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Globe className="text-green-600 w-5 h-5" /> 
                Contratos de Acceso Global
              </CardTitle>
              <CardDescription>Visualiza qué hoteles tienen acceso permitido y hasta cuándo</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {suscripciones?.length === 0 && <p className="text-center py-10 text-slate-400">No hay suscripciones activas registradas.</p>}
                {suscripciones?.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50/30">
                    <div className="flex gap-4 items-center">
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle2 className="text-green-600 w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold">{s.nombre_propietario}</p>
                        <p className="text-xs text-slate-500">Plan: {s.plan_nombre}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Vence el:</p>
                      <p className="text-sm text-red-600 font-bold">{new Date(s.fecha_vencimiento).toLocaleDateString()}</p>
                    </div>
                    <div className="px-3 py-1 bg-white border border-green-200 rounded text-green-700 text-xs font-bold uppercase">
                      {s.estado}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
