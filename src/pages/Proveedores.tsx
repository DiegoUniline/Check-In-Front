import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Truck, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

const empty = {
  nombre: '', contacto: '', telefono: '', email: '',
  rfc: '', direccion: '', notas: '', activo: true,
};

export default function Proveedores() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [delTarget, setDelTarget] = useState<any>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.getProveedores();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo cargar', variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => { setEditing(null); setForm(empty); setOpen(true); };
  const abrirEditar = (p: any) => { setEditing(p); setForm({ ...empty, ...p }); setOpen(true); };

  const guardar = async () => {
    if (!form.nombre?.trim()) {
      toast({ title: 'Falta nombre', variant: 'destructive' }); return;
    }
    try {
      const payload = {
        nombre: form.nombre.trim(),
        contacto: form.contacto || null,
        telefono: form.telefono || null,
        email: form.email || null,
        rfc: form.rfc || null,
        direccion: form.direccion || null,
        notas: form.notas || null,
        activo: !!form.activo,
      };
      if (editing?.id) await api.updateProveedor(editing.id, payload);
      else await api.createProveedor(payload);
      toast({ title: editing ? 'Proveedor actualizado' : 'Proveedor creado' });
      setOpen(false);
      cargar();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo guardar', variant: 'destructive' });
    }
  };

  const eliminar = async () => {
    if (!delTarget) return;
    try {
      await api.deleteProveedor(delTarget.id);
      toast({ title: 'Proveedor eliminado' });
      setDelTarget(null);
      cargar();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const filtered = items.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [p.nombre, p.contacto, p.telefono, p.email, p.rfc]
      .filter(Boolean).some((v: string) => v.toLowerCase().includes(s));
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Truck className="h-7 w-7 text-primary" /> Proveedores
            </h1>
            <p className="text-muted-foreground">Administra los proveedores del hotel</p>
          </div>
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo proveedor
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Listado ({filtered.length})</CardTitle>
              <div className="relative w-72 max-w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar por nombre, contacto, RFC…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Cargando…</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No hay proveedores aún</p>
                <Button variant="outline" className="mt-4" onClick={abrirNuevo}>
                  <Plus className="h-4 w-4 mr-2" /> Crear el primero
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>RFC</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell>{p.contacto || '—'}</TableCell>
                        <TableCell>{p.telefono || '—'}</TableCell>
                        <TableCell>{p.email || '—'}</TableCell>
                        <TableCell>{p.rfc || '—'}</TableCell>
                        <TableCell>
                          {p.activo === false
                            ? <Badge variant="secondary">Inactivo</Badge>
                            : <Badge>Activo</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDelTarget(p)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Contacto</Label>
              <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>RFC</Label>
              <Input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <Textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>{editing ? 'Actualizar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{delTarget?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminar}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
