import { useEffect, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { CalendarRange, Loader2, Pencil, Square } from 'lucide-react';
import api, { todayLocal } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateFormat';
import { BLOCK_TIPOS, blockTipoLabel, legacyRoomBlocked, type RoomBlock } from '@/lib/roomBlocks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  habitaciones: any[];
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  defaultTipo?: RoomBlock['tipo'];
};

const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export function BloqueoHabitacionDialog({ habitaciones, onOpenChange, onSaved, defaultTipo = 'Bloqueo' }: Props) {
  const { toast } = useToast();
  const open = habitaciones.length > 0;
  const single = habitaciones.length === 1 ? habitaciones[0] : null;
  const today = todayLocal();
  const [tipo, setTipo] = useState<RoomBlock['tipo']>(defaultTipo);
  const [desde, setDesde] = useState(today);
  const [hasta, setHasta] = useState(today);
  const [motivo, setMotivo] = useState('');
  const [editando, setEditando] = useState<RoomBlock | null>(null);
  const [bloqueos, setBloqueos] = useState<RoomBlock[]>([]);
  const [guardando, setGuardando] = useState(false);

  const reset = () => {
    setTipo(defaultTipo); setDesde(today); setHasta(today); setMotivo(''); setEditando(null);
  };

  const cargar = async () => {
    if (!single) { setBloqueos([]); return; }
    try { setBloqueos(await api.getBloqueos({ habitacionId: single.id, desde: today })); } catch { setBloqueos([]); }
  };

  useEffect(() => {
    if (!open) return;
    reset();
    void cargar();
  }, [open, habitaciones.map((h) => h.id).join(',')]);

  const noches = desde && hasta && hasta >= desde ? differenceInCalendarDays(parseISO(hasta), parseISO(desde)) + 1 : 0;

  const guardar = async () => {
    if (!desde || !hasta || hasta < desde) { toast({ title: 'Revisa las fechas', variant: 'destructive' }); return; }
    if (motivo.trim().length < 3) { toast({ title: 'Escribe el motivo', variant: 'destructive' }); return; }
    setGuardando(true);
    try {
      if (editando) {
        await api.editarBloqueo(editando.id, { desde, hasta, tipo, motivo: motivo.trim() });
        toast({ title: 'Bloqueo actualizado' });
      } else {
        const errores: string[] = [];
        for (const hab of habitaciones) {
          try {
            // Bandera antigua sin fecha: se reemplaza por este rango.
            if (legacyRoomBlocked(hab)) await api.liberarHabitacion(hab.id, false);
            await api.crearBloqueo({ habitacionId: hab.id, desde, hasta, tipo, motivo: motivo.trim() });
          } catch (error: any) {
            errores.push(`Hab. ${hab.numero}: ${error.message}`);
          }
        }
        const ok = habitaciones.length - errores.length;
        toast({
          title: ok ? `${ok} habitación(es) bloqueada(s) del ${formatDate(desde)} al ${formatDate(hasta)}` : 'No se pudo bloquear',
          description: errores.join(' · ') || `Se puede reservar otra vez desde el ${formatDate(addDays(hasta, 1))}.`,
          variant: errores.length && !ok ? 'destructive' : undefined,
        });
        if (!ok) return;
      }
      onSaved?.();
      if (single) { reset(); await cargar(); } else onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  const terminar = async (b: RoomBlock) => {
    const empezado = b.fecha_desde <= today;
    if (!window.confirm(empezado
      ? `¿Terminar el bloqueo? La habitación queda disponible desde hoy (${formatDate(today)}).`
      : '¿Cancelar este bloqueo?')) return;
    setGuardando(true);
    try {
      await api.terminarBloqueo(b.id);
      toast({ title: empezado ? 'Bloqueo terminado' : 'Bloqueo cancelado' });
      onSaved?.();
      if (editando?.id === b.id) reset();
      await cargar();
    } catch (error: any) {
      toast({ title: 'No se pudo terminar', description: error.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  const editar = (b: RoomBlock) => {
    setEditando(b); setTipo(b.tipo); setDesde(b.fecha_desde.slice(0, 10)); setHasta(b.fecha_hasta.slice(0, 10)); setMotivo(b.motivo || '');
  };

  return <Dialog open={open} onOpenChange={(v) => { if (!guardando) onOpenChange(v); }}>
    <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4" />
          {single ? `Bloquear habitación ${single.numero}` : `Bloquear ${habitaciones.length} habitaciones`}
        </DialogTitle>
        <DialogDescription>Fuera de venta sólo en las fechas que elijas; antes y después se puede reservar.</DialogDescription>
      </DialogHeader>

      {single && bloqueos.length > 0 && <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Bloqueos activos y próximos</Label>
        {bloqueos.map((b) => <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs">
          <div className="min-w-0">
            <p className="font-semibold">{formatDate(b.fecha_desde)} → {formatDate(b.fecha_hasta)}
              <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[9px]">{blockTipoLabel(b.tipo)}</Badge>
              {b.fecha_desde <= today && <Badge className="ml-1 h-4 bg-amber-600 px-1 text-[9px]">En curso</Badge>}
            </p>
            <p className="truncate text-muted-foreground">{b.motivo}{b.created_by_nombre ? ` · ${b.created_by_nombre}` : ''}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={guardando} onClick={() => editar(b)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-red-700" disabled={guardando} onClick={() => void terminar(b)}>
              <Square className="mr-1 h-3 w-3" />{b.fecha_desde <= today ? 'Terminar' : 'Cancelar'}
            </Button>
          </div>
        </div>)}
      </div>}

      {habitaciones.some(legacyRoomBlocked) && !editando && <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
        {single ? 'Esta habitación está' : 'Algunas habitaciones están'} bloqueada(s) sin fecha de fin. Al guardar se reemplaza por este rango.
      </p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as RoomBlock['tipo'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BLOCK_TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Desde (primera noche)</Label>
          <Input type="date" value={desde} min={editando ? undefined : today} onChange={(e) => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); }} />
        </div>
        <div className="space-y-1.5">
          <Label>Hasta (última noche)</Label>
          <Input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Motivo</Label>
          <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Cambio de alfombra, pintura, uso de staff…" />
        </div>
      </div>
      {noches > 0 && <p className="rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
        {noches} noche{noches === 1 ? '' : 's'} fuera de venta. Se puede reservar otra vez desde el <strong>{formatDate(addDays(hasta, 1))}</strong>.
      </p>}

      <DialogFooter>
        {editando && <Button variant="ghost" onClick={reset} disabled={guardando}>Nuevo bloqueo</Button>}
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>Cerrar</Button>
        <Button onClick={() => void guardar()} disabled={guardando}>
          {guardando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{editando ? 'Guardar cambios' : 'Bloquear fechas'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
