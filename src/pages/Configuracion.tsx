import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Hotel, Users, CreditCard, Bell, 
  Palette, Shield, Save, Building2, ExternalLink
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { mockHotel } from '@/data/mockData';
import api from '@/lib/api';

export default function Configuracion() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [hotelData, setHotelData] = useState(mockHotel);
  const [loadingHotel, setLoadingHotel] = useState(true);
  const [savingHotel, setSavingHotel] = useState(false);

  const mapBackendToUi = (h: any) => {
    /*
      Mapeo backend -> UI.
      Backend: `check-in-back/src/routes/hotel.js` devuelve columnas snake_case.
      UI (este archivo) usa camelCase (mockHotel).
      Relacionado con `POST /api/hotel` (updateHotel) en `Check-In-Front/src/lib/api.ts`.
    */
    if (!h) return mockHotel;
    return {
      ...hotelData,
      nombre: h.nombre ?? hotelData.nombre,
      razonSocial: h.razon_social ?? hotelData.razonSocial,
      rfc: h.rfc ?? hotelData.rfc,
      direccion: h.direccion ?? hotelData.direccion,
      ciudad: h.ciudad ?? hotelData.ciudad,
      estado: h.estado ?? hotelData.estado,
      pais: h.pais ?? (hotelData as any).pais ?? 'México',
      telefono: h.telefono ?? hotelData.telefono,
      email: h.email ?? hotelData.email,
      horaCheckin: h.hora_checkin ?? hotelData.horaCheckin,
      horaCheckout: h.hora_checkout ?? hotelData.horaCheckout,
      estrellas: Number(h.estrellas ?? hotelData.estrellas ?? 3),
    };
  };

  const mapUiToBackend = (ui: any) => {
    /*
      Mapeo UI -> backend (snake_case).
      Consumido por `check-in-back/src/routes/hotel.js` (POST `/api/hotel`).
    */
    return {
      nombre: ui.nombre,
      razon_social: ui.razonSocial,
      rfc: ui.rfc,
      direccion: ui.direccion,
      ciudad: ui.ciudad,
      estado: ui.estado,
      pais: ui.pais || 'México',
      telefono: ui.telefono,
      email: ui.email,
      hora_checkin: ui.horaCheckin,
      hora_checkout: ui.horaCheckout,
      estrellas: Number(ui.estrellas) || 3,
    };
  };

  const cargarHotel = async () => {
    setLoadingHotel(true);
    try {
      const h = await api.getHotel();
      setHotelData(mapBackendToUi(h));
    } catch (error: any) {
      // Si falla (ej. falta x-hotel-id o no hay token), dejamos mock pero avisamos.
      toast({
        title: 'No se pudo cargar el hotel',
        description: error.message || 'Revisa tu sesión y el hotel seleccionado.',
        variant: 'destructive',
      });
    } finally {
      setLoadingHotel(false);
    }
  };

  useEffect(() => {
    cargarHotel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSavingHotel(true);
    try {
      const payload = mapUiToBackend(hotelData);
      await api.updateHotel(payload);
      toast({
        title: 'Configuración guardada',
        description: 'Los cambios del hotel se guardaron correctamente.',
      });
      await cargarHotel();
    } catch (error: any) {
      toast({
        title: 'Error al guardar',
        description: error.message || 'No se pudieron guardar los cambios.',
        variant: 'destructive',
      });
    } finally {
      setSavingHotel(false);
    }
  };

  return (
    <MainLayout 
      title="Configuración" 
      subtitle="Ajustes del sistema y preferencias"
    >
      <Tabs defaultValue="hotel" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="hotel">
            <Hotel className="mr-2 h-4 w-4" /> Hotel
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="pagos">
            <CreditCard className="mr-2 h-4 w-4" /> Pagos
          </TabsTrigger>
          <TabsTrigger value="notificaciones">
            <Bell className="mr-2 h-4 w-4" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger value="apariencia">
            <Palette className="mr-2 h-4 w-4" /> Apariencia
          </TabsTrigger>
        </TabsList>

        {/* Hotel Settings */}
        <TabsContent value="hotel">
          {loadingHotel && (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                Cargando información del hotel...
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información del Hotel
                </CardTitle>
                <CardDescription>Datos generales de tu establecimiento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Hotel</Label>
                  <Input 
                    value={hotelData.nombre}
                    onChange={(e) => setHotelData({...hotelData, nombre: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Razón Social</Label>
                  <Input 
                    value={hotelData.razonSocial}
                    onChange={(e) => setHotelData({...hotelData, razonSocial: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>RFC</Label>
                    <Input 
                      value={hotelData.rfc}
                      onChange={(e) => setHotelData({...hotelData, rfc: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estrellas</Label>
                    <Select 
                      value={hotelData.estrellas.toString()}
                      onValueChange={(v) => setHotelData({...hotelData, estrellas: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} estrella{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contacto y Ubicación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Textarea 
                    value={hotelData.direccion}
                    onChange={(e) => setHotelData({...hotelData, direccion: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input 
                      value={hotelData.ciudad}
                      onChange={(e) => setHotelData({...hotelData, ciudad: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input 
                      value={hotelData.estado}
                      onChange={(e) => setHotelData({...hotelData, estado: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input 
                      value={hotelData.telefono}
                      onChange={(e) => setHotelData({...hotelData, telefono: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={hotelData.email}
                      onChange={(e) => setHotelData({...hotelData, email: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Check-in</Label>
                    <Input 
                      type="time"
                      value={hotelData.horaCheckin}
                      onChange={(e) => setHotelData({...hotelData, horaCheckin: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Check-out</Label>
                    <Input 
                      type="time"
                      value={hotelData.horaCheckout}
                      onChange={(e) => setHotelData({...hotelData, horaCheckout: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Administra los usuarios del sistema</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8 gap-4">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Gestiona usuarios, roles y permisos desde el panel dedicado.
              </p>
              <Button onClick={() => navigate('/usuarios')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Ir a Gestión de Usuarios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>Configura los métodos de pago aceptados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tarjeta de crédito/débito</p>
                  <p className="text-sm text-muted-foreground">Visa, Mastercard, Amex</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Efectivo</p>
                  <p className="text-sm text-muted-foreground">Pago en recepción</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Transferencia bancaria</p>
                  <p className="text-sm text-muted-foreground">SPEI / Depósito</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notificaciones">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>Configura cómo y cuándo recibir alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nuevas reservas</p>
                  <p className="text-sm text-muted-foreground">Notificar al recibir una reserva</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Check-ins del día</p>
                  <p className="text-sm text-muted-foreground">Resumen matutino de llegadas</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tareas de limpieza urgentes</p>
                  <p className="text-sm text-muted-foreground">Alertas de prioridad alta</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Stock bajo</p>
                  <p className="text-sm text-muted-foreground">Alertas de inventario</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="apariencia">
          <Card>
            <CardHeader>
              <CardTitle>Tema y Apariencia</CardTitle>
              <CardDescription>Personaliza la apariencia del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Modo de color</Label>
                <div className="flex gap-4">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="flex-1"
                  >
                    ☀️ Claro
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="flex-1"
                  >
                    🌙 Oscuro
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} size="lg" disabled={savingHotel || loadingHotel}>
          <Save className="mr-2 h-4 w-4" />
          {savingHotel ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </MainLayout>
  );
}