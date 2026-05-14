import { useEffect, useState } from 'react';
import { MessageCircle, Save, Send, RefreshCw, Sparkles, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
// Tipos aún no se regeneran hasta que se aplica la migración; usamos un cliente sin tipos.
const sb = supabase as any;

/**
 * Configuración de WhatsApp:
 * - Token y switch enabled (en tabla hotels)
 * - Plantillas editables (recordatorio_checkin, gracias_checkout)
 * - Enviar mensaje de prueba
 */

const TEMPLATES_DEFAULT = [
  {
    template_key: 'recordatorio_checkin',
    nombre: 'Recordatorio (1 día antes del check-in)',
    mensaje:
      'Hola {{nombre}} 👋\nTe recordamos que mañana te esperamos en *{{hotel}}*.\nReserva: {{numero_reserva}}\nCheck-in: {{fecha_checkin}}\n¡Que tengas buen viaje! 🏨',
    descripcion: 'Se envía automáticamente la tarde antes de la llegada.',
  },
  {
    template_key: 'gracias_checkout',
    nombre: 'Gracias (día de check-out, 9 am)',
    mensaje:
      'Buen día {{nombre}} ☀️\nHoy es tu día de salida en *{{hotel}}* (check-out hasta las 12:00).\n¡Gracias por reservar con nosotros, esperamos verte pronto! 🙌',
    descripcion: 'Se envía a las 9:00 AM solo a reservas hechas por la página web.',
  },
];

const VARIABLES = ['nombre', 'hotel', 'numero_reserva', 'fecha_checkin', 'fecha_checkout', 'habitacion'];

export function WhatsAppConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [hotel, setHotel] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [testPhone, setTestPhone] = useState('5213171035768');

  const cargar = async () => {
    setLoading(true);
    try {
      const { data: hotels } = await sb.from('hotels').select('*').limit(1);
      const h = hotels?.[0];
      if (!h) throw new Error('No se encontró el hotel');
      setHotel(h);

      const { data: tpls } = await sb
        .from('whatsapp_templates')
        .select('*')
        .eq('hotel_id', h.id);

      // Mezclar con defaults: si no existe, agregar la default
      const merged = TEMPLATES_DEFAULT.map((d) => {
        const found = (tpls ?? []).find((t: any) => t.template_key === d.template_key);
        return found ? { ...d, ...found } : { ...d, hotel_id: h.id, activo: true };
      });
      setTemplates(merged);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!hotel) return;
    setSaving(true);
    try {
      // 1) hotel: token + enabled
      const { error: hErr } = await sb
        .from('hotels')
        .update({
          whatsapp_token: hotel.whatsapp_token || null,
          whatsapp_enabled: !!hotel.whatsapp_enabled,
        })
        .eq('id', hotel.id);
      if (hErr) throw hErr;

      // 2) plantillas (upsert por hotel_id + template_key)
      for (const t of templates) {
        const payload = {
          hotel_id: hotel.id,
          template_key: t.template_key,
          nombre: t.nombre,
          mensaje: t.mensaje,
          activo: !!t.activo,
          updated_at: new Date().toISOString(),
        };
        const { error } = await sb
          .from('whatsapp_templates')
          .upsert(payload, { onConflict: 'hotel_id,template_key' });
        if (error) throw error;
      }
      toast({ title: 'Guardado', description: 'Configuración de WhatsApp actualizada.' });
      cargar();
    } catch (e: any) {
      toast({ title: 'Error al guardar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const enviarPrueba = async (template_key?: string) => {
    if (!hotel?.whatsapp_token || !hotel?.whatsapp_enabled) {
      toast({ title: 'Activa WhatsApp y guarda primero', variant: 'destructive' });
      return;
    }
    if (!testPhone) {
      toast({ title: 'Ingresa un número de prueba', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const body: any = { hotel_id: hotel.id, phone: testPhone };
      if (template_key) {
        body.template_key = template_key;
        body.vars = {
          nombre: 'Diego',
          numero_reserva: 'RES-2026-DEMO',
          fecha_checkin: '2026-05-15',
          fecha_checkout: '2026-05-18',
          habitacion: '101',
        };
      } else {
        body.message = '🚀 Mensaje de prueba desde HospedApp';
      }
      const { data, error } = await supabase.functions.invoke('whatsapp-send', { body });
      if (error) throw error;
      if (!data?.ok) throw new Error('La API respondió con error: ' + JSON.stringify(data?.response || data));
      toast({ title: 'Mensaje enviado ✅', description: 'Revisa tu WhatsApp.' });
    } catch (e: any) {
      toast({ title: 'Error al enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            Conexión WhatsAPI
          </CardTitle>
          <CardDescription>
            Pega aquí tu API Token de WhatsAPI. La URL del proxy ya está configurada para todos los hoteles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-base">Activar WhatsApp</Label>
              <p className="text-xs text-muted-foreground">Si está apagado, no se enviará ningún mensaje automático.</p>
            </div>
            <Switch
              checked={!!hotel?.whatsapp_enabled}
              onCheckedChange={(v) => setHotel({ ...hotel, whatsapp_enabled: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>API Token</Label>
            <Input
              type="password"
              placeholder="Pega tu token de WhatsAPI"
              value={hotel?.whatsapp_token || ''}
              onChange={(e) => setHotel({ ...hotel, whatsapp_token: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Lo obtienes en WhatsAPI → Mis Instancias.</p>
          </div>
          <div className="rounded-lg bg-muted/40 border p-3 text-xs flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <div>
              <strong>Variables disponibles en plantillas:</strong>{' '}
              {VARIABLES.map((v) => (
                <code key={v} className="bg-background border rounded px-1 mx-0.5">{`{{${v}}}`}</code>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plantillas */}
      {templates.map((t, i) => (
        <Card key={t.template_key}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t.nombre}
                </CardTitle>
                <CardDescription>{t.descripcion}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Activo</span>
                <Switch
                  checked={!!t.activo}
                  onCheckedChange={(v) => {
                    const next = [...templates];
                    next[i] = { ...t, activo: v };
                    setTemplates(next);
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={6}
              value={t.mensaje}
              onChange={(e) => {
                const next = [...templates];
                next[i] = { ...t, mensaje: e.target.value };
                setTemplates(next);
              }}
            />
            <div className="flex justify-end">
              <Button
                variant="outline" size="sm"
                onClick={() => enviarPrueba(t.template_key)}
                disabled={sending}
              >
                {sending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Probar plantilla
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enviar prueba simple</CardTitle>
          <CardDescription>Manda un mensaje libre para verificar la conexión.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input
            className="max-w-xs"
            placeholder="Número (ej. 5213171035768)"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <Button onClick={() => enviarPrueba()} disabled={sending} variant="outline">
            <Send className="h-4 w-4 mr-1.5" /> Enviar prueba
          </Button>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={saving} size="lg">
          {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}