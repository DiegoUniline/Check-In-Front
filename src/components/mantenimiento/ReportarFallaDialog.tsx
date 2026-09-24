import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

type Props = {
  habitacion: any | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

const vacio = { categoria: 'General', titulo: '', prioridad: 'Normal', descripcion: '', bloquear: true };

export function ReportarFallaDialog({ habitacion, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (habitacion) setForm(vacio); }, [habitacion?.id]);

  const guardar = async () => {
    if (!habitacion) return;
    if (!form.titulo.trim() || !form.descripcion.trim()) {
      toast({ title: 'Faltan datos', description: 'Escribe qué falla y una descripción.', variant: 'destructive' });
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
      });
      toast({ title: 'Falla reportada', description: `Habitación ${habitacion.numero}${form.bloquear ? ' fuera de venta hasta resolverla' : ''}` });
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
              <span className="block text-[11px] text-muted-foreground">No se podrá reservar hasta cerrar el reporte o marcarla como disponible.</span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={saving} onClick={() => void guardar()}>{saving ? 'Guardando…' : 'Reportar falla'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
