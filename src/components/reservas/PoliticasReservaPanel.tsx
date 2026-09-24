import { useEffect, useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { DIAS_SEMANA, describirPolitica, type PoliticaReserva } from '@/lib/politicasReserva';
import { cn } from '@/lib/utils';

type Form = {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  min_noches: string;
  max_noches: string;
  dias_llegada_no_permitidos: number[];
  noche_sola_no_permitida: number[];
  aplica_web: boolean;
  aplica_recepcion: boolean;
  activo: boolean;
  notas: string;
};

const vacio: Form = {
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  min_noches: '',
  max_noches: '',
  dias_llegada_no_permitidos: [],
  noche_sola_no_permitida: [],
  aplica_web: true,
  aplica_recepcion: false,
  activo: true,
  notas: '',
};

// Lunes primero para que sea más natural.
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

function DiasPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ORDEN_DIAS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
            className={cn('h-8 w-12 rounded-md border text-xs font-medium transition-colors', on ? 'border-[#10233F] bg-[#10233F] text-white' : 'hover:bg-muted')}
          >
            {DIAS_SEMANA[d].slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

export function PoliticasReservaPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PoliticaReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PoliticaReserva | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(vacio);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await api.getPoliticasReserva());
    } catch (error: any) {
      toast({ title: 'No se pudieron cargar las políticas', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const abrir = (p?: PoliticaReserva) => {
    setEditing(p || null);
    setForm(p ? {
      nombre: p.nombre,
      fecha_inicio: p.fecha_inicio || '',
      fecha_fin: p.fecha_fin || '',
      min_noches: p.min_noches ? String(p.min_noches) : '',
      max_noches: p.max_noches ? String(p.max_noches) : '',
      dias_llegada_no_permitidos: p.dias_llegada_no_permitidos || [],
      noche_sola_no_permitida: p.noche_sola_no_permitida || [],
      aplica_web: p.aplica_web !== false,
      aplica_recepcion: Boolean(p.aplica_recepcion),
      activo: p.activo !== false,
      notas: p.notas || '',
    } : vacio);
    setOpen(true);
  };

  const guardar = async () => {
    const min = form.min_noches ? Number(form.min_noches) : null;
    const max = form.max_noches ? Number(form.max_noches) : null;
    if (!form.nombre.trim()) return toast({ title: 'Escribe un nombre', variant: 'destructive' });
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) return toast({ title: 'La fecha final es antes de la inicial', variant: 'destructive' });
    if ((min !== null && min < 1) || (max !== null && max < 1)) return toast({ title: 'Las noches deben ser 1 o más', variant: 'destructive' });
    if (min !== null && max !== null && max < min) return toast({ title: 'El máximo no puede ser menor al mínimo', variant: 'destructive' });
    if (!min && !max && !form.dias_llegada_no_permitidos.length && !form.noche_sola_no_permitida.length) {
      return toast({ title: 'Agrega al menos una regla', description: 'Estancia mínima/máxima o días restringidos.', variant: 'destructive' });
    }
    if (!form.aplica_web && !form.aplica_recepcion) return toast({ title: 'Elige dónde aplica', variant: 'destructive' });
    setSaving(true);
    try {
      await api.savePoliticaReserva(editing?.id || null, {
        nombre: form.nombre.trim(),
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        min_noches: min,
        max_noches: max,
        dias_llegada_no_permitidos: form.dias_llegada_no_permitidos,
        noche_sola_no_permitida: form.noche_sola_no_permitida,
        aplica_web: form.aplica_web,
        aplica_recepcion: form.aplica_recepcion,
        activo: form.activo,
        notas: form.notas.trim() || null,
      });
      toast({ title: editing ? 'Política actualizada' : 'Política creada' });
      setOpen(false);
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (p: PoliticaReserva) => {
    if (!window.confirm(`¿Eliminar la política "${p.nombre}"?`)) return;
    try {
      await api.deletePoliticaReserva(p.id);
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo eliminar', description: error.message, variant: 'destructive' });
    }
  };

  const toggle = async (p: PoliticaReserva) => {
    try {
      await api.savePoliticaReserva(p.id, { activo: p.activo === false });
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo actualizar', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-[#10233F]" />Políticas de reserva</p>
          <p className="text-xs text-muted-foreground">Reglas que se validan al reservar: estancia mínima, días de llegada y noches sueltas.</p>
        </div>
        <Button size="sm" onClick={() => abrir()}><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva política</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Sin políticas. Ejemplo: "Enero · mínimo 3 noches" o "No se reserva sólo sábado".
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {rows.map((p) => (
            <div key={p.id} className={cn('flex items-center gap-3 px-3 py-2.5', p.activo === false && 'opacity-50')}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {p.nombre}
                  {p.aplica_web !== false && <Badge variant="outline" className="h-5 text-[10px]">Web</Badge>}
                  {p.aplica_recepcion && <Badge variant="outline" className="h-5 text-[10px]">Recepción</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{describirPolitica(p)}</p>
              </div>
              <Switch checked={p.activo !== false} onCheckedChange={() => void toggle(p)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrir(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void eliminar(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!saving) setOpen(v); }}>
        <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar política' : 'Nueva política'}</DialogTitle>
            <DialogDescription>Aplica a reservas cuya llegada cae dentro de las fechas. Sin fechas, aplica todo el año.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Temporada enero, Fines de semana…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Desde</Label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Hasta</Label><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Mínimo de noches</Label><Input type="number" min={1} value={form.min_noches} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setForm({ ...form, min_noches: e.target.value })} placeholder="Sin mínimo" /></div>
              <div className="space-y-1.5"><Label>Máximo de noches</Label><Input type="number" min={1} value={form.max_noches} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setForm({ ...form, max_noches: e.target.value })} placeholder="Sin máximo" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>No se permite reservar sólo una noche en</Label>
              <DiasPicker value={form.noche_sola_no_permitida} onChange={(v) => setForm({ ...form, noche_sola_no_permitida: v })} />
              <p className="text-[11px] text-muted-foreground">Ej. marca Sáb y Dom: una sola noche de sábado o de domingo no se acepta; viernes-domingo sí.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Días en que no se permite llegar</Label>
              <DiasPicker value={form.dias_llegada_no_permitidos} onChange={(v) => setForm({ ...form, dias_llegada_no_permitidos: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">Página web<Switch checked={form.aplica_web} onCheckedChange={(v) => setForm({ ...form, aplica_web: v })} /></label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">Recepción<Switch checked={form.aplica_recepcion} onCheckedChange={(v) => setForm({ ...form, aplica_recepcion: v })} /></label>
            </div>
            <div className="space-y-1.5">
              <Label>Nota para el huésped</Label>
              <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={() => void guardar()}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
