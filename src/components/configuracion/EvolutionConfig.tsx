import { useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, QrCode, LogOut, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const sb = supabase as any;

/**
 * Conexión Evolution API (self-hosted). Muestra QR para vincular el número
 * de WhatsApp del hotel y refresca el estado en tiempo real.
 */
export function EvolutionConfig() {
  const { toast } = useToast();
  const [inst, setInst] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const cargar = async () => {
    const { data } = await sb.from('wa_instancias').select('*').limit(1).maybeSingle();
    setInst(data);
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!polling) return;
    const it = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('evolution-status', { body: {} });
        if (error) throw error;
        await cargar();
        if ((data as any)?.estado === 'connected') setPolling(false);
      } catch { /* silencio */ }
    }, 4000);
    return () => clearInterval(it);
  }, [polling]);

  const conectar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-create-instance', { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await cargar();
      setPolling(true);
      toast({ title: 'Escanea el QR con tu WhatsApp' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const refrescar = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke('evolution-status', { body: {} });
      await cargar();
    } finally { setLoading(false); }
  };

  const conectado = inst?.estado === 'connected';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          Evolution API — WhatsApp del hotel
        </CardTitle>
        <CardDescription>
          Conecta tu número de WhatsApp escaneando un QR. Al conectarse, todos los mensajes entrarán a la bandeja de <b>Chats</b>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Estado:</span>
          {conectado ? (
            <Badge className="bg-emerald-500 hover:bg-emerald-600">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado {inst?.phone_number ? `(${inst.phone_number})` : ''}
            </Badge>
          ) : (
            <Badge variant="secondary">{inst?.estado ?? 'sin instancia'}</Badge>
          )}
          <Button size="sm" variant="ghost" onClick={refrescar} disabled={loading}>
            <RefreshCw className={"h-3.5 w-3.5 " + (loading ? 'animate-spin' : '')} />
          </Button>
        </div>

        {!conectado && inst?.qr && (
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/30">
            <img
              src={
                inst.qr.startsWith('data:')
                  ? inst.qr
                  : `data:image/png;base64,${inst.qr}`
              }
              alt="QR WhatsApp"
              className="w-64 h-64"
            />
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular dispositivo, y escanea este QR.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!conectado && (
            <Button onClick={conectar} disabled={loading}>
              <QrCode className="h-4 w-4 mr-1.5" />
              {inst ? 'Regenerar QR' : 'Conectar WhatsApp'}
            </Button>
          )}
          {conectado && (
            <Button variant="outline" onClick={conectar} disabled={loading}>
              <LogOut className="h-4 w-4 mr-1.5" /> Re-vincular otro número
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}