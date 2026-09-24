import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

type Tipo = 'Porcentaje' | 'Monto';
type Descuento = { id: string; nombre: string; tipo: Tipo; valor: number; descripcion?: string | null; activo: boolean };

const vacio = { nombre: '', tipo: 'Porcentaje' as Tipo, valor: '', descripcion: '', activo: true };

export const descuentoLabel = (d: { nombre: string; tipo: Tipo; valor: number }) =>
  `${d.nombre} · ${d.tipo === 'Porcentaje' ? `${Number(d.valor)}%` : formatCurrency(Number(d.valor))}`;

export function DescuentosCatalogo() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Descuento[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Descuento | null>(null);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await api.getDescuentos());
    } catch (error: any) {
      toast({ title: 'No se pudieron cargar los descuentos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setForm(vacio); setOpen(true); };
  const openEdit = (d: Descuento) => {
    setEditing(d);
    setForm({ nombre: d.nombre, tipo: d.tipo, valor: String(d.valor), descripcion: d.descripcion || '', activo: d.activo });
    setOpen(true);
  };

  const save = async () => {
    const valor = Number(form.valor);
    if (!form.nombre.trim()) return toast({ title: 'Escribe el nombre', variant: 'destructive' });
    if (!Number.isFinite(valor) || valor <= 0) return toast({ title: 'El valor debe ser mayor a 0', variant: 'destructive' });
    if (form.tipo === 'Porcentaje' && valor > 100) return toast({ title: 'El porcentaje no puede superar 100', variant: 'destructive' });
    setSaving(true);
    try {
      const payload = { nombre: form.nombre.trim(), tipo: form.tipo, valor, descripcion: form.descripcion.trim() || undefined, activo: form.activo };
      if (editing) await api.updateDescuento(editing.id, { ...payload, descripcion: payload.descripcion ?? null });
      else await api.createDescuento(payload);
      toast({ title: editing ? 'Descuento actualizado' : 'Descuento creado' });
      setOpen(false);
      await load();
    } catch (error: any) {
      const dup = /duplicate|unique/i.test(error.message || '');
      toast({ title: 'No se pudo guardar', description: dup ? 'Ya existe un descuento con ese nombre' : error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: Descuento) => {
    if (!window.confirm(`¿Eliminar "${d.nombre}"? Los clientes que lo tengan quedarán sin descuento.`)) return;
    try {
      await api.deleteDescuento(d.id);
      toast({ title: 'Descuento eliminado' });
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo eliminar', description: error.message, variant: 'destructive' });
    }
  };

  const toggle = async (d: Descuento) => {
    try {
      await api.updateDescuento(d.id, { activo: !d.activo });
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo actualizar', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Descuentos</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Descuentos que puedes asignar a clientes y aplicar en reservaciones.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo descuento</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay descuentos registrados</TableCell></TableRow>
            ) : rows.map((d) => (
              <TableRow key={d.id} className={d.activo ? '' : 'opacity-50'}>
                <TableCell className="font-medium">{d.nombre}</TableCell>
                <TableCell><Badge variant="outline">{d.tipo === 'Porcentaje' ? 'Porcentaje' : 'Monto fijo'}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{d.tipo === 'Porcentaje' ? `${Number(d.valor)}%` : formatCurrency(Number(d.valor))}</TableCell>
                <TableCell className="max-w-[240px] truncate text-muted-foreground">{d.descripcion || '—'}</TableCell>
                <TableCell><Switch checked={d.activo} onCheckedChange={() => void toggle(d)} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void remove(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { if (!saving) setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar descuento' : 'Nuevo descuento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Corporativo, Convenio, Cliente frecuente…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Porcentaje">Porcentaje (%)</SelectItem>
                    <SelectItem value="Monto">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input type="number" min={0} max={form.tipo === 'Porcentaje' ? 100 : undefined} value={form.valor} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder={form.tipo === 'Porcentaje' ? '10' : '500'} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Opcional" />
            </div>
            <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              Activo
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
