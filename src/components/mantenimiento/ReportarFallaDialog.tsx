import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api, { todayLocal } from '@/lib/api';
import { formatDate } from '@/lib/dateFormat';

type Props = {
  habitacion: any | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

const nuevo = () => ({ categoria: 'General', titulo: '', prioridad: 'Normal', descripcion: '', bloquear: true, desde: todayLocal(), hasta: todayLocal() });

export function ReportarFallaDialog({ habitacion, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(nuevo);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (habitacion) setForm(nuevo()); }, [habitacion?.id]);

  const guardar = async () => {
    if (!habitacion) return;
    if (!form.titulo.trim() || !form.descripcion.trim()) {
      toast({ title: 'Faltan datos', description: 'Escribe qué falla y una descripción.', variant: 'destructive' });
      return;
    }
    if (form.bloquear && (!form.desde || !form.hasta || form.hasta < form.desde)) {
      toast({ title: 'Revisa las fechas', description: 'La fecha fin no puede ser anterior a la de inicio.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.reportarFallaHabitacion(habitacion, {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria,
        prioridad: form.prioridad,
        bloquear: form.bloquear,
        desde: form.desde,
        hasta: form.hasta,
      });
      toast({ title: 'Falla reportada', description: `Habitación ${habitacion.numero}${form.bloquear ? ` fuera de venta del ${formatDate(form.desde)} al ${formatDate(form.hasta)}` : ''}` });
      onOpenChange(false);
      onSaved?.();
    } catch (error: any) {
      toast({ title: 'No se pudo reportar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(habitacion)} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Reportar falla · Hab. {habitacion?.numero}</DialogTitle>
          <DialogDescription>Se crea un ticket en Mantenimiento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plomería">Plomería</SelectItem>
                  <SelectItem value="Electricidad">Electricidad</SelectItem>
                  <SelectItem value="Mobiliario">Mobiliario</SelectItem>
                  <SelectItem value="HVAC">Aire / calefacción</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={form.prioridad} onValueChange={(v) => setForm({ ...form, prioridad: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baja">Baja</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>¿Qué falla? *</Label>
            <Input autoFocus value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Fuga de agua en baño" />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción *</Label>
            <Textarea className="min-h-24" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Qué ocurre, dónde y cualquier detalle útil..." />
          </div>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#10233F]" checked={form.bloquear} onChange={(e) => setForm({ ...form, bloquear: e.target.checked })} />
            <span>
              <span className="block font-medium">Sacar de venta</span>
              <span className="block text-[11px] text-muted-foreground">Sólo en las fechas elegidas. Si cierras el reporte antes, se libera ese día.</span>
            </span>
          </label>
          {form.bloquear && <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Desde (primera noche)</Label>
              <Input type="date" value={form.desde} min={todayLocal()} onChange={(e) => setForm({ ...form, desde: e.target.value, hasta: form.hasta < e.target.value ? e.target.value : form.hasta })} />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta (última noche)</Label>
              <Input type="date" value={form.hasta} min={form.desde} onChange={(e) => setForm({ ...form, hasta: e.target.value })} />
            </div>
          </div>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={saving} onClick={() => void guardar()}>{saving ? 'Guardando…' : 'Reportar falla'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
