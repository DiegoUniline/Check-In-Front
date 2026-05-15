import { useEffect, useMemo, useState } from 'react';
import { Save, RefreshCw, AlertTriangle, History, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AjustesStock() {
  const { toast } = useToast();
  const [productos, setProductos] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [prods, movs] = await Promise.all([api.getProductos(), api.getMovimientosInventario(100)]);
      setProductos(Array.isArray(prods) ? prods : []);
      setMovimientos(Array.isArray(movs) ? movs : []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const filtered = useMemo(
    () => productos.filter(p => !search || (p.nombre || '').toLowerCase().includes(search.toLowerCase()) || (p.codigo || '').toLowerCase().includes(search.toLowerCase())),
    [productos, search]
  );

  const cambios = useMemo(() => {
    const out: { producto: any; anterior: number; nuevo: number }[] = [];
    for (const p of productos) {
      const v = edits[p.id];
      if (v === undefined || v === '') continue;
      const nuevo = Number(v);
      const anterior = Number(p.stock_actual || 0);
      if (!isNaN(nuevo) && nuevo !== anterior) out.push({ producto: p, anterior, nuevo });
    }
    return out;
  }, [edits, productos]);

  const guardar = async () => {
    if (!cambios.length) {
      toast({ title: 'Sin cambios', description: 'No hay valores modificados' });
      return;
    }
    setSaving(true);
    try {
      for (const c of cambios) {
        await api.ajustarStockAbsoluto(c.producto.id, c.nuevo, motivo || 'Ajuste de stock');
      }
      toast({ title: 'Ajustes guardados', description: `${cambios.length} producto(s) actualizado(s)` });
      setEdits({});
      setMotivo('');
      await cargar();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const todoACero = async () => {
    setSaving(true);
    try {
      const conStock = productos.filter(p => Number(p.stock_actual || 0) !== 0);
      for (const p of conStock) {
        await api.ajustarStockAbsoluto(p.id, 0, motivo || 'Reset de inventario a 0');
      }
      toast({ title: 'Inventario reiniciado', description: `${conStock.length} producto(s) en cero` });
      setEdits({});
      await cargar();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <MainLayout title="Ajustes de Stock" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Ajustes de Stock" subtitle="Captura el stock real y registra cada movimiento">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base">Productos</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-9 w-[220px]" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Button size="icon" variant="outline" onClick={cargar}><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Stock sistema</TableHead>
                    <TableHead className="text-right w-[140px]">Stock real</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const anterior = Number(p.stock_actual || 0);
                    const v = edits[p.id];
                    const nuevo = v !== undefined && v !== '' ? Number(v) : null;
                    const diff = nuevo !== null && !isNaN(nuevo) ? nuevo - anterior : null;
                    return (
                      <TableRow key={p.id} className={diff !== null && diff !== 0 ? 'bg-primary/5' : ''}>
                        <TableCell className="font-mono text-xs">{p.codigo || '-'}</TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right">{anterior}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-8 text-right"
                            placeholder="—"
                            value={v ?? ''}
                            onChange={e => setEdits({ ...edits, [p.id]: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {diff === null ? <span className="text-muted-foreground">—</span> : (
                            <Badge variant={diff === 0 ? 'outline' : diff > 0 ? 'default' : 'destructive'}>
                              {diff > 0 ? '+' : ''}{diff}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin productos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Resumen del ajuste</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Productos a editar</span><span className="font-semibold">{cambios.length}</span></div>
              <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
                {cambios.map(c => (
                  <div key={c.producto.id} className="flex justify-between border-b pb-1">
                    <span className="truncate mr-2">{c.producto.nombre}</span>
                    <span className={cn('font-mono', c.nuevo > c.anterior ? 'text-success' : 'text-destructive')}>{c.anterior} → {c.nuevo}</span>
                  </div>
                ))}
                {!cambios.length && <p className="text-muted-foreground text-xs">Edita la columna "Stock real" para registrar ajustes.</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Motivo (opcional)</label>
                <Input placeholder="Ej: Inventario físico mensual" value={motivo} onChange={e => setMotivo(e.target.value)} />
              </div>
              <Button className="w-full" onClick={guardar} disabled={saving || !cambios.length}>
                <Save className="h-4 w-4 mr-2" />Guardar ajustes
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 mr-2" />Poner todo a cero
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Reiniciar todo el inventario a 0?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción pondrá el stock de TODOS los productos en 0 y registrará un movimiento por cada uno. No se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={todoACero}>Sí, todo a cero</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Movimientos recientes</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
              {movimientos.map(m => (
                <div key={m.id} className="text-xs border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{m.producto_nombre || m.producto_id}</span>
                    <Badge variant={m.tipo === 'Entrada' ? 'default' : 'destructive'} className="text-[10px]">{m.tipo} {m.cantidad}</Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {m.stock_anterior} → {m.stock_nuevo} · {m.motivo || '—'}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()} · {m.usuario_nombre || 'Sistema'}
                  </div>
                </div>
              ))}
              {!movimientos.length && <p className="text-muted-foreground text-xs">Sin movimientos registrados.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
