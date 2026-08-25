import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Truck, Search, Phone, Mail, FileText, MoreVertical } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const empty = { nombre: '', contacto: '', telefono: '', email: '', rfc: '', direccion: '', notas: '', activo: true };

type Filter = 'todos' | 'activos' | 'inactivos';

export default function Proveedores() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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

  const abrirNuevo = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const abrirEditar = (p: any) => { setEditing(p); setForm({ ...empty, ...p }); setOpen(true); };

  const guardar = async () => {
    if (!form.nombre?.trim() || saving) { if (!form.nombre?.trim()) toast({ title: 'Falta nombre', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(), contacto: form.contacto || null, telefono: form.telefono || null,
        email: form.email || null, rfc: form.rfc || null, direccion: form.direccion || null,
        notas: form.notas || null, activo: !!form.activo,
      };
      if (editing?.id) await api.updateProveedor(editing.id, payload); else await api.createProveedor(payload);
      toast({ title: editing ? 'Proveedor actualizado' : 'Proveedor creado' });
      setOpen(false); await cargar();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo guardar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const eliminar = async () => {
    if (!delTarget) return;
    try { await api.deleteProveedor(delTarget.id); toast({ title: 'Proveedor eliminado' }); setDelTarget(null); cargar(); }
    catch (e: any) { toast({ title: 'Error', description: e?.message || 'No se pudo eliminar', variant: 'destructive' }); }
  };

  const filtered = items.filter((p) => {
    const status = filter === 'todos' || (filter === 'activos' ? p.activo !== false : p.activo === false);
    if (!status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [p.nombre, p.contacto, p.telefono, p.email, p.rfc].filter(Boolean).some((v: string) => v.toLowerCase().includes(s));
  });

  const activeCount = items.filter(p => p.activo !== false).length;
  const inactiveCount = items.length - activeCount;

  return (
    <MainLayout title="Proveedores" subtitle="Contactos, datos fiscales y estado de proveedores">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'todos', label: 'Total', value: items.length },
            { key: 'activos', label: 'Activos', value: activeCount },
            { key: 'inactivos', label: 'Inactivos', value: inactiveCount },
          ].map(item => (
            <button key={item.key} onClick={() => setFilter(item.key as Filter)} className={cn('rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/30', filter === item.key && 'border-primary bg-primary/5')}>
              <p className="text-xs text-muted-foreground">{item.label}</p><p className="text-xl font-semibold tabular-nums">{item.value}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar nombre, contacto, teléfono o RFC…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nuevo proveedor</Button>
        </div>

        {loading ? (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center"><Truck className="h-9 w-9 mx-auto mb-2 text-muted-foreground/50" /><p className="font-medium">No hay proveedores que coincidan</p><p className="text-sm text-muted-foreground mt-1">Cambia los filtros o registra uno nuevo.</p></CardContent></Card>
        ) : (
          <>
            <div className="grid gap-2 md:hidden">
              {filtered.map(p => (
                <Card key={p.id}><CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-medium truncate">{p.nombre}</p><Badge variant={p.activo === false ? 'secondary' : 'outline'}>{p.activo === false ? 'Inactivo' : 'Activo'}</Badge></div><p className="text-xs text-muted-foreground mt-1">{p.contacto || 'Sin contacto principal'}</p></div>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => abrirEditar(p)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => setDelTarget(p)}><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                  </div>
                  <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
                    {p.telefono && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{p.telefono}</span>}
                    {p.email && <span className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5" />{p.email}</span>}
                    {p.rfc && <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />RFC {p.rfc}</span>}
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <Card className="hidden md:block overflow-hidden">
              <Table><TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>Contacto</TableHead><TableHead>Teléfono</TableHead><TableHead>Email</TableHead><TableHead>RFC</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>{filtered.map((p) => <TableRow key={p.id}>
                  <TableCell><div><p className="font-medium">{p.nombre}</p>{p.direccion && <p className="text-xs text-muted-foreground max-w-[240px] truncate">{p.direccion}</p>}</div></TableCell>
                  <TableCell>{p.contacto || '—'}</TableCell><TableCell>{p.telefono || '—'}</TableCell><TableCell>{p.email || '—'}</TableCell><TableCell>{p.rfc || '—'}</TableCell>
                  <TableCell><Badge variant={p.activo === false ? 'secondary' : 'outline'}>{p.activo === false ? 'Inactivo' : 'Activo'}</Badge></TableCell>
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => abrirEditar(p)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => setDelTarget(p)}><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                </TableRow>)}</TableBody></Table>
            </Card>
          </>
        )}
        <p className="text-xs text-muted-foreground text-center">Mostrando {filtered.length} de {items.length} proveedores</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle><DialogDescription>Datos comerciales, fiscales y de contacto.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5"><Label>Nombre *</Label><Input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Razón social o nombre comercial" /></div>
            <div className="space-y-1.5"><Label>Contacto</Label><Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>RFC</Label><Input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Dirección</Label><Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Notas</Label><Textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Condiciones, horarios, observaciones…" /></div>
            <label className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3 cursor-pointer"><div><p className="text-sm font-medium">Proveedor activo</p><p className="text-xs text-muted-foreground">Disponible para nuevas compras y gastos.</p></div><Switch checked={!!form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear proveedor'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle><AlertDialogDescription>Se eliminará “{delTarget?.nombre}”. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={eliminar}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
