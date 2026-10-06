import { useEffect, useState } from 'react';
import { Download, Link2, Loader2, Printer, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/dateFormat';
import { agenteEnLinea, ticketPrueba } from '@/lib/impresion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const DESCARGA = '/descargas/VULO-Impresion.exe';

const estadoTrabajo: Record<string, string> = {
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800',
  Imprimiendo: 'border-blue-200 bg-blue-50 text-blue-800',
  Impreso: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Error: 'border-red-200 bg-red-50 text-red-700',
  Cancelado: 'border-slate-200 bg-slate-50 text-slate-600',
};

export function ImpresionConfig() {
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [nombre, setNombre] = useState('Recepción');
  const [codigo, setCodigo] = useState<{ codigo: string; expira_at: string; agentes: number } | null>(null);
  const [generando, setGenerando] = useState(false);
  const [autoCorte, setAutoCorte] = useState(false);
  const [ahora, setAhora] = useState(Date.now());

  const cargar = async () => {
    const [a, t] = await Promise.all([api.getAgentesImpresion().catch(() => []), api.getTrabajosImpresion().catch(() => [])]);
    setAgentes(a);
    setTrabajos(t);
    return a;
  };

  useEffect(() => {
    void cargar();
    api.getConfigHotel<{ auto_corte?: boolean }>('impresion').then((v) => setAutoCorte(Boolean(v?.auto_corte))).catch(() => {});
    const id = setInterval(() => { setAhora(Date.now()); void cargar(); }, 4000);
    return () => clearInterval(id);
  }, []);

  // Al vincularse el agente, se cierra el código.
  useEffect(() => {
    if (codigo && agentes.length > codigo.agentes) {
      toast({ title: 'Computadora vinculada', description: 'Elige la impresora en el agente y pulsa "Imprimir prueba".' });
      setCodigo(null);
    }
  }, [agentes.length]);

  const generar = async () => {
    setGenerando(true);
    try {
      const r = await api.crearCodigoImpresion(nombre.trim() || 'Recepción');
      setCodigo({ ...r, agentes: agentes.length });
    } catch (error: any) {
      toast({ title: 'No se pudo generar el código', description: error.message, variant: 'destructive' });
    } finally {
      setGenerando(false);
    }
  };

  const prueba = async (agente: any) => {
    try {
      await api.imprimir('prueba', 'Prueba de impresión', ticketPrueba(), agente.id);
      toast({ title: 'Prueba enviada', description: `Se imprimirá en ${agente.nombre} en unos segundos.` });
      void cargar();
    } catch (error: any) {
      toast({ title: 'No se pudo enviar', description: error.message, variant: 'destructive' });
    }
  };

  const quitar = async (agente: any) => {
    if (!window.confirm(`¿Quitar "${agente.nombre}"? Dejará de imprimir hasta que la vuelvas a vincular.`)) return;
    try {
      await api.eliminarAgenteImpresion(agente.id);
      void cargar();
    } catch (error: any) {
      toast({ title: 'No se pudo quitar', description: error.message, variant: 'destructive' });
    }
  };

  const cambiarAuto = async (v: boolean) => {
    setAutoCorte(v);
    try {
      await api.setConfigHotel('impresion', { auto_corte: v });
    } catch (error: any) {
      setAutoCorte(!v);
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    }
  };

  const restante = codigo ? Math.max(0, Math.floor((new Date(codigo.expira_at).getTime() - ahora) / 1000)) : 0;
  const nombreAgente = (id: string) => agentes.find((a) => a.id === id)?.nombre || '';

  return <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" />Agente de impresión</CardTitle>
        <CardDescription>Imprime cortes de caja directo en la impresora de tickets, aunque los mandes desde el celular o desde otra computadora.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Descarga e instala el agente en la computadora que tiene la impresora (Windows).</li>
          <li>Pulsa <b>Vincular computadora</b> y escribe el código en el agente.</li>
          <li>En el agente elige la impresora y haz una prueba.</li>
        </ol>
        <Button asChild className="bg-[#10233F] hover:bg-[#10233F]/90">
          <a href={DESCARGA} download><Download className="mr-2 h-4 w-4" />Descargar agente para Windows</a>
        </Button>
        <p className="text-xs text-muted-foreground">Si Windows muestra «Windows protegió su PC», pulsa «Más información» y luego «Ejecutar de todas formas».</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Computadoras vinculadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agentes.length === 0 && <p className="text-sm text-muted-foreground">Ninguna computadora vinculada todavía.</p>}
        {agentes.map((a) => {
          const enLinea = agenteEnLinea(a);
          return <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', enLinea && a.impresora ? 'bg-emerald-500' : 'bg-red-500')} />
              <div className="min-w-0">
                <p className="font-medium">{a.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.impresora || 'Sin impresora elegida'} · {Number(a.ancho) === 32 ? '58 mm' : '80 mm'}
                  {' · '}{enLinea ? 'En línea' : a.ultimo_contacto ? `Desconectada desde ${formatDateTime(a.ultimo_contacto)}` : 'Nunca se conectó'}
                  {a.version ? ` · v${a.version}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void prueba(a)}><Printer className="mr-1.5 h-3.5 w-3.5" />Prueba</Button>
              <Button size="sm" variant="ghost" className="text-red-700" onClick={() => void quitar(a)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>;
        })}

        {codigo && restante > 0 ? (
          <div className="rounded-lg border border-[#10233F]/20 bg-[#10233F]/[0.03] p-4 text-center">
            <p className="text-sm text-muted-foreground">Escribe este código en el agente</p>
            <p className="my-2 font-mono text-3xl font-bold tracking-[0.3em] text-[#10233F]">{codigo.codigo}</p>
            <p className="text-xs text-muted-foreground">Vence en {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCodigo(null)}>Cancelar</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label>Nombre de la computadora</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-56" placeholder="Recepción" />
            </div>
            <Button onClick={() => void generar()} disabled={generando}>
              {generando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}Vincular computadora
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="font-medium">Imprimir el corte automáticamente al cerrar turno</p>
          <p className="text-sm text-muted-foreground">Al cerrar un turno, el ticket sale solo en la impresora de tickets.</p>
        </div>
        <Switch checked={autoCorte} onCheckedChange={(v) => void cambiarAuto(v)} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Últimas impresiones</CardTitle></CardHeader>
      <CardContent>
        {trabajos.length === 0
          ? <p className="text-sm text-muted-foreground">Sin impresiones todavía.</p>
          : <div className="divide-y">
            {trabajos.map((t) => <div key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(t.created_at)}{t.created_by_nombre ? ` · ${t.created_by_nombre}` : ''}{t.agente_id ? ` · ${nombreAgente(t.agente_id)}` : ''}
                  {t.error ? ` · ${t.error}` : ''}
                </p>
              </div>
              <Badge variant="outline" className={cn('shrink-0', estadoTrabajo[t.estado])}>{t.estado}</Badge>
            </div>)}
          </div>}
      </CardContent>
    </Card>
  </div>;
}
