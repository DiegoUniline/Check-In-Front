import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Hotel, Users, CreditCard, Bell, 
  Palette, Shield, Save, Building2, ExternalLink, ListChecks, Globe, Copy, MessageCircle
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
import api from '@/lib/api';
import { CURRENCY_PRESETS } from '@/lib/currency';
import { ChecklistConfig } from '@/components/configuracion/ChecklistConfig';
import { WhatsAppConfig } from '@/components/configuracion/WhatsAppConfig';
import { EvolutionConfig } from '@/components/configuracion/EvolutionConfig';
import { WhatsAppAgentConfig } from '@/components/configuracion/WhatsAppAgentConfig';
import { SaveButton, isDirty } from '@/components/ui/save-button';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { ImageUpload } from '@/components/ui/image-upload';

const emptyHotel = {
  nombre: '',
  razonSocial: '',
  rfc: '',
  direccion: '',
  ciudad: '',
  estado: '',
  pais: 'México',
  telefono: '',
  email: '',
  logoUrl: '' as string | null | '',
  horaCheckin: '15:00',
  horaCheckout: '12:00',
  estrellas: 3,
  slug: '',
  descripcionPublica: '',
  permiteReservasOnline: false,
  requiereAnticipo: false,
  porcentajeAnticipo: 30,
  monedaCodigo: 'MXN',
  monedaSimbolo: '$',
  monedaLocale: 'es-MX',
};

export default function Configuracion() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [hotelData, setHotelData] = useState<any>(emptyHotel);
  const [hotelInitial, setHotelInitial] = useState<any>(emptyHotel);
  const [loadingHotel, setLoadingHotel] = useState(true);
  const [savingHotel, setSavingHotel] = useState(false);

  const mapBackendToUi = (h: any) => {
    // Mapeo backend (snake_case) -> UI (camelCase)
    if (!h) return emptyHotel;
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
      logoUrl: h.logo_url ?? hotelData.logoUrl ?? '',
      horaCheckin: h.hora_checkin ?? hotelData.horaCheckin,
      horaCheckout: h.hora_checkout ?? hotelData.horaCheckout,
      timezone: h.timezone ?? hotelData.timezone ?? 'America/Mexico_City',
      estrellas: Number(h.estrellas ?? hotelData.estrellas ?? 3),
      slug: h.slug ?? hotelData.slug ?? '',
      descripcionPublica: h.descripcion_publica ?? hotelData.descripcionPublica ?? '',
      permiteReservasOnline: !!(h.permite_reservas_online ?? hotelData.permiteReservasOnline),
      requiereAnticipo: !!(h.requiere_anticipo ?? hotelData.requiereAnticipo),
      porcentajeAnticipo: Number(h.porcentaje_anticipo ?? hotelData.porcentajeAnticipo ?? 30),
      monedaCodigo: h.moneda_codigo ?? hotelData.monedaCodigo ?? 'MXN',
      monedaSimbolo: h.moneda_simbolo ?? hotelData.monedaSimbolo ?? '$',
      monedaLocale: h.moneda_locale ?? hotelData.monedaLocale ?? 'es-MX',
    };
  };

  const mapUiToBackend = (ui: any) => {
    const slugify = (s: string) =>
      (s || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    // El slug se deriva SIEMPRE del nombre del hotel para que la URL coincida.
    const slug = slugify(ui.nombre) || null;
    // Mapeo UI (camelCase) -> backend (snake_case)
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
      logo_url: ui.logoUrl || null,
      hora_checkin: ui.horaCheckin,
      hora_checkout: ui.horaCheckout,
      timezone: ui.timezone || 'America/Mexico_City',
      estrellas: Number(ui.estrellas) || 3,
      slug,
      descripcion_publica: ui.descripcionPublica || null,
      permite_reservas_online: !!ui.permiteReservasOnline,
      requiere_anticipo: !!ui.requiereAnticipo,
      porcentaje_anticipo: Number(ui.porcentajeAnticipo) || 0,
      moneda_codigo: (ui.monedaCodigo || 'MXN').toUpperCase(),
      moneda_simbolo: ui.monedaSimbolo || '$',
      moneda_locale: ui.monedaLocale || 'es-MX',
    };
  };

  const cargarHotel = async () => {
    setLoadingHotel(true);
    try {
      const h = await api.getHotel();
      const ui = mapBackendToUi(h);
      setHotelData(ui);
      setHotelInitial(ui);
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

  const hotelDirty = useMemo(
    () => isDirty(hotelInitial, hotelData),
    [hotelInitial, hotelData]
  );
  useUnsavedChanges(hotelDirty && !loadingHotel);

  return (
    <MainLayout 
      title="Configuración" 
      subtitle="Ajustes del sistema y preferencias"
    >
      <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') ?? 'hotel'} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-8 w-full max-w-5xl">
          <TabsTrigger value="hotel">
            <Hotel className="mr-2 h-4 w-4" /> Hotel
          </TabsTrigger>
          <TabsTrigger value="reservas-online">
            <Globe className="mr-2 h-4 w-4" /> Reservas Web
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="checklists">
            <ListChecks className="mr-2 h-4 w-4" /> Checklists
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
                <Separator />
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={hotelData.monedaCodigo || 'MXN'}
                    onValueChange={(v) => {
                      const preset = CURRENCY_PRESETS.find((p) => p.codigo === v);
                      setHotelData({
                        ...hotelData,
                        monedaCodigo: v,
                        monedaSimbolo: preset?.simbolo ?? hotelData.monedaSimbolo,
                        monedaLocale: preset?.locale ?? hotelData.monedaLocale,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_PRESETS.map((p) => (
                        <SelectItem key={p.codigo} value={p.codigo}>
                          {p.codigo} — {p.simbolo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Esta moneda se aplica a todos los precios, cobros y reportes del sistema. Los valores guardados no se convierten — solo cambia el formato y el código mostrado.
                  </p>
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
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={hotelData.timezone || 'America/Mexico_City'}
                    onChange={(e) => setHotelData({ ...hotelData, timezone: e.target.value })}
                  >
                    <optgroup label="México y Centroamérica">
                      <option value="America/Mexico_City">México (Ciudad de México) — UTC-6</option>
                      <option value="America/Cancun">México (Cancún) — UTC-5</option>
                      <option value="America/Tijuana">México (Tijuana) — UTC-8</option>
                      <option value="America/Hermosillo">México (Hermosillo) — UTC-7</option>
                      <option value="America/Guatemala">Guatemala — UTC-6</option>
                      <option value="America/Tegucigalpa">Honduras — UTC-6</option>
                      <option value="America/El_Salvador">El Salvador — UTC-6</option>
                      <option value="America/Managua">Nicaragua — UTC-6</option>
                      <option value="America/Costa_Rica">Costa Rica — UTC-6</option>
                      <option value="America/Panama">Panamá — UTC-5</option>
                      <option value="America/Belize">Belice — UTC-6</option>
                    </optgroup>
                    <optgroup label="Caribe">
                      <option value="America/Havana">Cuba — UTC-5</option>
                      <option value="America/Santo_Domingo">Rep. Dominicana — UTC-4</option>
                      <option value="America/Puerto_Rico">Puerto Rico — UTC-4</option>
                    </optgroup>
                    <optgroup label="Sudamérica">
                      <option value="America/Bogota">Colombia — UTC-5</option>
                      <option value="America/Caracas">Venezuela — UTC-4</option>
                      <option value="America/Lima">Perú — UTC-5</option>
                      <option value="America/Quito">Ecuador — UTC-5</option>
                      <option value="America/La_Paz">Bolivia — UTC-4</option>
                      <option value="America/Santiago">Chile — UTC-4/-3</option>
                      <option value="America/Argentina/Buenos_Aires">Argentina — UTC-3</option>
                      <option value="America/Asuncion">Paraguay — UTC-4/-3</option>
                      <option value="America/Montevideo">Uruguay — UTC-3</option>
                      <option value="America/Sao_Paulo">Brasil (São Paulo) — UTC-3</option>
                    </optgroup>
                    <optgroup label="Europa">
                      <option value="Europe/Madrid">España (Península) — UTC+1/+2</option>
                      <option value="Atlantic/Canary">España (Canarias) — UTC+0/+1</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Define la zona horaria del hotel. Determina qué día se considera "hoy" para check-ins, check-outs y reportes.
                  </p>
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
        <TabsContent value="reservas-online">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Reservas en línea</CardTitle>
              <CardDescription>Configura tu página pública para que los huéspedes reserven directo desde la web.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="font-medium">Activar reservas desde la web</p>
                  <p className="text-sm text-muted-foreground">Tus huéspedes podrán reservar desde tu página pública. Las reservas aparecen al instante en el sistema.</p>
                </div>
                <Switch
                  checked={!!hotelData.permiteReservasOnline}
                  onCheckedChange={(v) => setHotelData({ ...hotelData, permiteReservasOnline: v })}
                />
              </div>

              {(() => {
                const slugAuto = (hotelData.nombre || '')
                  .toString()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '');
                const url = slugAuto ? `${window.location.origin}/h/${slugAuto}` : '';
                return (
                  <div className="space-y-2">
                    <Label>URL pública de tu hotel</Label>
                    <p className="text-xs text-muted-foreground">
                      Se genera automáticamente con el nombre del hotel. Cámbialo desde el campo "Nombre del hotel" arriba.
                    </p>
                    <div className="flex gap-2">
                      <Input value={url} readOnly placeholder="Define el nombre del hotel para generar la URL" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          toast({ title: 'Enlace copiado', description: url });
                        }}
                        disabled={!slugAuto}
                      >
                        <Copy className="h-4 w-4 mr-1" /> Copiar
                      </Button>
                      {slugAuto && (
                        <Button type="button" variant="outline" asChild>
                          <a href={`/h/${slugAuto}`} target="_blank" rel="noreferrer">
                            <Globe className="h-4 w-4 mr-1" /> Abrir
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label>Descripción pública del hotel</Label>
                <Textarea
                  rows={3}
                  value={hotelData.descripcionPublica || ''}
                  onChange={(e) => setHotelData({ ...hotelData, descripcionPublica: e.target.value })}
                  placeholder="Bienvenido a nuestro hotel ubicado en..."
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="font-medium">Solicitar anticipo al reservar</p>
                  <p className="text-sm text-muted-foreground">Mostrará al huésped el monto de anticipo. El cobro se coordina por separado con el hotel.</p>
                </div>
                <Switch
                  checked={!!hotelData.requiereAnticipo}
                  onCheckedChange={(v) => setHotelData({ ...hotelData, requiereAnticipo: v })}
                />
              </div>

              {hotelData.requiereAnticipo && (
                <div className="space-y-2 max-w-xs">
                  <Label>Porcentaje de anticipo (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={hotelData.porcentajeAnticipo || 0}
                    onChange={(e) => setHotelData({ ...hotelData, porcentajeAnticipo: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="rounded-md border bg-muted/30 p-4 text-sm">
                <p className="font-medium mb-1">¿Cómo elijo qué habitaciones se publican?</p>
                <p className="text-muted-foreground">
                  Ve a <strong>Catálogos → Tipos de Habitación</strong> y activa "Publicar en web" en cada tipo que quieras ofrecer. También puedes excluir habitaciones individuales en la pantalla de <strong>Habitaciones</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <div className="space-y-6">
            <EvolutionConfig />
            <WhatsAppAgentConfig />
            <WhatsAppConfig />
          </div>
        </TabsContent>

        {/* Checklists */}
        <TabsContent value="checklists">
          <ChecklistConfig />
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
        <SaveButton
          onClick={handleSave}
          size="lg"
          dirty={hotelDirty && !loadingHotel}
          loading={savingHotel}
        />
      </div>
    </MainLayout>
  );
}