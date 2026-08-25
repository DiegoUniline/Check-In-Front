import { useState, useEffect, useMemo } from 'react';
import { Package, Search, AlertTriangle, ArrowUpDown, RefreshCw, RotateCcw, Boxes, PackageX, ChevronRight, Download, PlusCircle, MinusCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataTable } from '@/hooks/useDataTable';
import { SortHeader } from '@/components/datatable/SortHeader';
import { exportToCsv } from '@/lib/exportCsv';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Inventario() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [tab, setTab] = useState<'todo' | 'con' | 'sin' | 'bajo'>('todo');
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [ajusteModal, setAjusteModal] = useState<{ open: boolean; producto: any | null }>({ open: false, producto: null });
  const [ajusteData, setAjusteData] = useState({ tipo: 'entrada', cantidad: '', motivo: '' });
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodsData, catsData] = await Promise.all([api.getProductos(), api.getCategorias()]);
      setProductos(Array.isArray(prodsData) ? prodsData : []);
      setCategorias(Array.isArray(catsData) ? catsData : []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const categoryNames = [...new Set(productos.map(p => p.categoria_nombre || p.categoria))].filter(Boolean);

  const filteredProducts = productos.filter(p => {
    const search = searchQuery.toLowerCase();
    const matchSearch = p.nombre?.toLowerCase().includes(search) || p.codigo?.toLowerCase().includes(search);
    const matchCategory = filterCategoria === 'all' || (p.categoria_nombre || p.categoria) === filterCategoria;
    const stock = Number(p.stock_actual || 0);
    const min = Number(p.stock_minimo || 0);
    const matchTab = tab === 'todo' ? true : tab === 'con' ? stock > 0 : tab === 'sin' ? stock <= 0 : stock > 0 && stock < min;
    return matchSearch && matchCategory && matchTab;
  });

  const lowStock = productos.filter(p => Number(p.stock_actual || 0) > 0 && Number(p.stock_actual || 0) < Number(p.stock_minimo || 0));
  const sinStock = productos.filter(p => Number(p.stock_actual || 0) <= 0).length;
  const conStock = productos.filter(p => Number(p.stock_actual || 0) > 0).length;
  const totalStockUnidades = productos.reduce((s, p) => s + (Number(p.stock_actual) || 0), 0);

  const accessors = useMemo(() => ({
    codigo: (p: any) => p.codigo || '', nombre: (p: any) => p.nombre || '', categoria: (p: any) => p.categoria_nombre || p.categoria || '',
    stock: (p: any) => Number(p.stock_actual || 0), minimo: (p: any) => Number(p.stock_minimo || 0),
  }), []);
  const dt = useDataTable<any>(filteredProducts, accessors, { storageKey: 'inventario-stock' });

  const handleResetAll = () => { setSearchQuery(''); setFilterCategoria('all'); setTab('todo'); dt.resetPersisted(); };

  const exportarCsv = () => {
    exportToCsv('stock', dt.processed, [
      { key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Producto' },
      { key: 'categoria', label: 'Categoría', accessor: (p) => p.categoria_nombre || p.categoria },
      { key: 'stock_actual', label: 'Stock' }, { key: 'stock_minimo', label: 'Stock mínimo' },
    ]);
  };

  const openAdjustment = (producto: any) => {
    setAjusteModal({ open: true, producto });
    setAjusteData({ tipo: 'entrada', cantidad: '', motivo: '' });
  };

  const handleAjusteStock = async () => {
    if (!ajusteModal.producto || !ajusteData.cantidad || savingAdjustment) return;
    const cantidad = parseInt(ajusteData.cantidad);
    if (!cantidad || cantidad < 1) return;
    setSavingAdjustment(true);
    try {
      await api.movimientoInventario(ajusteModal.producto.id, {
        tipo: ajusteData.tipo, cantidad, motivo: ajusteData.motivo || 'Ajuste manual',
      });
      toast({ title: ajusteData.tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada', description: `${ajusteModal.producto.nombre}: ${cantidad} unidad(es)` });
      setAjusteModal({ open: false, producto: null });
      await cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally { setSavingAdjustment(false); }
  };

  if (loading) {
    return <MainLayout title="Inventario" subtitle="Control de existencias"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div></MainLayout>;
  }

  const nextStock = ajusteModal.producto ? Math.max(0, Number(ajusteModal.producto.stock_actual || 0) + (ajusteData.tipo === 'entrada' ? 1 : -1) * (parseInt(ajusteData.cantidad) || 0)) : 0;

  return (
    <MainLayout title="Inventario" subtitle="Existencias, faltantes y ajustes rápidos">
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { key: 'todo', label: 'Productos', value: productos.length, hint: `${totalStockUnidades.toLocaleString()} unidades`, icon: Boxes },
            { key: 'con', label: 'Con stock', value: conStock, hint: 'Disponibles para venta', icon: Package },
            { key: 'bajo', label: 'Stock bajo', value: lowStock.length, hint: lowStock.length ? 'Requieren reposición' : 'Sin alertas', icon: AlertTriangle },
            { key: 'sin', label: 'Sin stock', value: sinStock, hint: sinStock ? 'Atención inmediata' : 'Todo disponible', icon: PackageX },
          ].map(item => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key as any)} className={cn('rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/30', active && 'border-primary bg-primary/5')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{item.label}</p><p className="text-xl font-semibold tabular-nums">{item.value}</p></div>
                  <Icon className={cn('h-4 w-4 text-muted-foreground', item.key === 'bajo' && item.value > 0 && 'text-warning', item.key === 'sin' && item.value > 0 && 'text-destructive')} />
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar producto o código…" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{categoryNames.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={cargarDatos} aria-label="Actualizar inventario"><RefreshCw className="h-4 w-4" /></Button>
            {(searchQuery || filterCategoria !== 'all' || tab !== 'todo') && <Button variant="ghost" size="sm" onClick={handleResetAll}><RotateCcw className="h-4 w-4" /> Limpiar</Button>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportarCsv}><Download className="h-4 w-4" /> Exportar</Button>
            <Button asChild><Link to="/productos"><Package className="h-4 w-4" /> Productos</Link></Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="lg:hidden">
          <TabsList className="w-full overflow-x-auto justify-start"><TabsTrigger value="todo">Todos</TabsTrigger><TabsTrigger value="con">Con stock</TabsTrigger><TabsTrigger value="bajo">Bajo</TabsTrigger><TabsTrigger value="sin">Sin stock</TabsTrigger></TabsList>
        </Tabs>

        <div className="grid gap-2 md:hidden">
          {dt.processed.map(producto => {
            const stock = Number(producto.stock_actual || 0); const min = Number(producto.stock_minimo || 0); const critical = stock <= 0; const low = !critical && stock < min;
            return (
              <Card key={producto.id} className={cn(critical && 'border-destructive/40', low && 'border-warning/40')}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium truncate">{producto.nombre}</p><p className="text-xs text-muted-foreground">{producto.codigo || 'Sin código'} · {producto.categoria_nombre || producto.categoria || 'Sin categoría'}</p></div>
                    <Badge variant={critical ? 'destructive' : low ? 'outline' : 'secondary'}>{stock} uds.</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2"><span className="text-xs text-muted-foreground">Mínimo {min}</span><Button size="sm" variant="outline" onClick={() => openAdjustment(producto)}><ArrowUpDown className="h-4 w-4" /> Ajustar</Button></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <SortHeader label="Código" columnKey="codigo" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
              <SortHeader label="Producto" columnKey="nombre" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
              <SortHeader label="Categoría" columnKey="categoria" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
              <SortHeader label="Stock" columnKey="stock" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="right" />
              <SortHeader label="Mínimo" columnKey="minimo" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="right" />
              <TableHead className="text-right">Acción</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dt.processed.map(producto => {
                const stock = Number(producto.stock_actual || 0); const min = Number(producto.stock_minimo || 0);
                return <TableRow key={producto.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{producto.codigo || '—'}</TableCell>
                  <TableCell><div><p className="font-medium">{producto.nombre}</p>{stock <= 0 ? <p className="text-xs text-destructive">Sin disponibilidad</p> : stock < min ? <p className="text-xs text-warning">Reponer pronto</p> : null}</div></TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{producto.categoria_nombre || producto.categoria || '—'}</span></TableCell>
                  <TableCell className="text-right"><span className={cn('font-semibold tabular-nums', stock <= 0 && 'text-destructive', stock > 0 && stock < min && 'text-warning')}>{stock}</span></TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{min}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => openAdjustment(producto)}>Ajustar <ChevronRight className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>;
              })}
              {dt.processed.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No hay productos que coincidan con los filtros.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
        <p className="text-xs text-muted-foreground text-center">Mostrando {dt.processed.length} de {productos.length} productos</p>
      </div>

      <Dialog open={ajusteModal.open} onOpenChange={(open) => setAjusteModal({ open, producto: open ? ajusteModal.producto : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajustar existencias</DialogTitle><DialogDescription>{ajusteModal.producto?.nombre}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 p-3 text-center">
              <div><p className="text-[11px] text-muted-foreground">Actual</p><p className="text-lg font-semibold">{ajusteModal.producto?.stock_actual || 0}</p></div>
              <div className="flex items-center justify-center"><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
              <div><p className="text-[11px] text-muted-foreground">Quedará</p><p className="text-lg font-semibold text-primary">{nextStock}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAjusteData({ ...ajusteData, tipo: 'entrada' })} className={cn('rounded-lg border p-3 text-left', ajusteData.tipo === 'entrada' && 'border-primary bg-primary/5')}><PlusCircle className="h-4 w-4 mb-1" /><p className="text-sm font-medium">Entrada</p><p className="text-xs text-muted-foreground">Aumentar stock</p></button>
              <button type="button" onClick={() => setAjusteData({ ...ajusteData, tipo: 'salida' })} className={cn('rounded-lg border p-3 text-left', ajusteData.tipo === 'salida' && 'border-primary bg-primary/5')}><MinusCircle className="h-4 w-4 mb-1" /><p className="text-sm font-medium">Salida</p><p className="text-xs text-muted-foreground">Disminuir stock</p></button>
            </div>
            <div className="space-y-1.5"><Label>Cantidad</Label><Input autoFocus type="number" value={ajusteData.cantidad} onChange={(e) => setAjusteData({ ...ajusteData, cantidad: e.target.value })} min="1" placeholder="0" /></div>
            <div className="space-y-1.5"><Label>Motivo</Label><Input value={ajusteData.motivo} onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })} placeholder="Ej. recepción de compra, merma…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAjusteModal({ open: false, producto: null })}>Cancelar</Button><Button onClick={handleAjusteStock} disabled={savingAdjustment || !ajusteData.cantidad}>{savingAdjustment ? 'Aplicando…' : 'Aplicar ajuste'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
