import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Copy, ExternalLink, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

/**
 * Banner que muestra la URL pública de reservas del hotel.
 * - Si hay slug y reservas online activadas: muestra URL con copiar/abrir
 * - Si no: muestra CTA para configurarla
 */
export function PublicLinkBanner() {
  const { toast } = useToast();
  const [slug, setSlug] = useState<string | null>(null);
  const [activo, setActivo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const h: any = await api.getHotel();
        setSlug(h?.slug ?? null);
        setActivo(!!h?.permite_reservas_online);
      } catch {
        // silencio
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;

  const url = slug ? `${window.location.origin}/h/${slug}` : '';

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Copiado', description: 'Link de reservas copiado al portapapeles.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  if (!slug || !activo) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">Activa tu página de reservas online</div>
            <div className="text-xs text-muted-foreground">
              {!slug
                ? 'Configura un identificador (slug) para tu hotel.'
                : 'Activa “Permitir reservas online” en Configuración.'}
            </div>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link to="/configuracion"><Settings className="h-3.5 w-3.5 mr-1.5" /> Configurar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-card to-card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Globe className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Tu página pública de reservas</div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-mono font-semibold text-primary hover:underline truncate block"
          >
            {url}
          </a>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
        <Button size="sm" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
          </a>
        </Button>
      </div>
    </div>
  );
}