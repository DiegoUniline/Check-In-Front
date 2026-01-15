import React, { useState } from 'react';
import { 
  Plus, Settings, CreditCard, Hotel, 
  ShieldCheck, Package, Save, Trash2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PanelControlDiego() {
  // Estados para formularios
  const [activeTab, setActiveTab] = useState('cuentas');

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Panel Maestro: Diego León</h1>
          <p className="text-slate-500">Gestión global de la plataforma SaaS Uniline</p>
        </div>
        <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full flex items-center gap-2 font-medium">
          <ShieldCheck className="w-5 h-5" /> Super Administrador
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="cuentas" className="flex gap-2 items-center">
            <Hotel className="w-4 h-4" /> Cuentas y Hoteles
          </TabsTrigger>
          <TabsTrigger value="suscripciones" className="flex gap-2 items-center">
            <CreditCard className="w-4 h-4" /> Suscripciones
          </TabsTrigger>
          <TabsTrigger value="planes" className="flex gap-2 items-center">
            <Package className="w-4 h-4" /> Planes Comerciales
          </TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA CUENTAS --- */}
        <TabsContent value="cuentas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Nueva Cuenta</CardTitle>
                <CardDescription>Registra un nuevo dueño de hotel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Razón Social</Label>
                  <Input placeholder="Ej: Grupo Hotelero del Norte" />
                </div>
                <div className="space-y-2">
                  <Label>Email de Acceso (Admin)</Label>
                  <Input type="email" placeholder="admin@cliente.com" />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña Inicial</Label>
                  <Input type="password" />
                </div>
                <Button className="w-full bg-blue-600">Crear Cuenta</Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Hoteles por Cuenta</CardTitle>
                <CardDescription>Asigna hoteles a las cuentas existentes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Seleccionar Cuenta</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Elegir Dueño" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="c1">Corporativo Sol</SelectItem>
                          <SelectItem value="c2">Inversiones Luna</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Nombre del Hotel</Label>
                      <Input placeholder="Ej: Hotel Paraíso" />
                    </div>
                 </div>
                 <Button variant="outline" className="w-full border-dashed border-2">
                   <Plus className="mr-2 w-4 h-4" /> Registrar Hotel en esta Cuenta
                 </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- PESTAÑA PLANES --- */}
        <TabsContent value="planes">
          <Card>
            <CardHeader>
              <CardTitle>Configurador de Planes</CardTitle>
              <CardDescription>Define los costos y límites de tu SaaS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Plan</Label>
                  <Input placeholder="Básico, Pro..." />
                </div>
                <div className="space-y-2">
                  <Label>Costo Mensual ($)</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Límite Hoteles</Label>
                  <Input type="number" />
                </div>
                <div className="space-y-2 flex items-end">
                  <Button className="w-full"><Save className="mr-2 h-4 w-4" /> Guardar Plan</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA SUSCRIPCIONES --- */}
        <TabsContent value="suscripciones">
          <Card>
            <CardHeader>
              <CardTitle>Activar Contrato</CardTitle>
              <CardDescription>Asigna un plan a una cuenta y define su vencimiento</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Cuenta / Cliente</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan a Asignar</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Vencimiento</Label>
                <Input type="date" />
              </div>
              <Button className="md:col-span-3 bg-green-600 hover:bg-green-700 text-white font-bold h-12">
                CREAR CONTRATO Y ACTIVAR ACCESO
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
