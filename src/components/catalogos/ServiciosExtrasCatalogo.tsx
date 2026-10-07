import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Concepto = { id: string; nombre: string; descripcion: string | null; precio: number | null };
const empty = { nombre: '', descripcion: '', precio: '' };

export function ServiciosExtrasCatalogo() {
  const { toast } = useToast();
  const [items, setItems] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Concepto | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await api.getConceptosCargo()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Concepto) => { setEditing(c); setForm({ nombre: c.nombre, descripcion: c.descripcion || '', precio: String(c.precio ?? '') }); setOpen(true); };

  const save = async () => {
    if (!form.nombre.trim()) { toast({ title: 'Falta el nombre', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const data = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, precio: Number(form.precio) || 0 };
      if (editing) await api.updateConceptoCargo(editing.id, data); else await api.createConceptoCargo(data);
      toast({ title: editing ? 'Servicio actualizado' : 'Servicio creado', description: data.nombre });
      setOpen(false); load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (c: Concepto) => {
    if (!window.confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try { await api.deleteConceptoCargo(c.id); toast({ title: 'Servicio eliminado' }); load(); }
    catch (e: any) { toast({ title: 'No se pudo eliminar', description: 'Puede estar usado en reservas existentes.', variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Servicios y cargos extras</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Late check-out, mascota, estacionamiento, desayuno… Aparecen con su precio al crear una reserva.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo servicio</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Precio</TableHead><TableHead className="w-24" /></TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aún no hay servicios. Crea el primero.</TableCell></TableRow>
            ) : items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{c.descripcion || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(Number(c.precio || 0))}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c)} aria-label="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Late check-out" /></div>
            <div className="space-y-1.5"><Label>Precio predeterminado</Label><Input type="number" min={0} inputMode="decimal" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="0.00" /></div>
            <div className="space-y-1.5"><Label>Descripción (opcional)</Label><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
