import { useState, useEffect, useMemo } from 'react';
import { Package, Search, AlertTriangle, ArrowUpDown, RefreshCw, RotateCcw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    const matchSearch = p.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.codigo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategoria === 'all' || (p.categoria_nombre || p.categoria) === filterCategoria;
    const stock = Number(p.stock_actual || 0);
    const min = Number(p.stock_minimo || 0);
    const matchTab =
      tab === 'todo' ? true :
      tab === 'con' ? stock > 0 :
      tab === 'sin' ? stock <= 0 :
      stock > 0 && stock < min;
    return matchSearch && matchCategory && matchTab;
  });

  const lowStock = productos.filter(p => (p.stock_actual || 0) < (p.stock_minimo || 20));
  const sinStock = productos.filter(p => (p.stock_actual || 0) <= 0).length;
  const totalStockUnidades = productos.reduce((s, p) => s + (Number(p.stock_actual) || 0), 0);

  const accessors = useMemo(() => ({
    codigo: (p: any) => p.codigo || '',
    nombre: (p: any) => p.nombre || '',
    categoria: (p: any) => p.categoria_nombre || p.categoria || '',
    stock: (p: any) => Number(p.stock_actual || 0),
    minimo: (p: any) => Number(p.stock_minimo || 0),
  }), []);
  const dt = useDataTable<any>(filteredProducts, accessors, { storageKey: 'inventario-stock' });

  const handleResetAll = () => {
    setSearchQuery('');
    setFilterCategoria('all');
    dt.resetPersisted();
  };

  const exportarCsv = () => {
    exportToCsv('stock', dt.processed, [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Producto' },
      { key: 'categoria', label: 'Categoría', accessor: (p) => p.categoria_nombre || p.categoria },
      { key: 'stock_actual', label: 'Stock' },
      { key: 'stock_minimo', label: 'Stock mínimo' },
    ]);
  };

  const handleAjusteStock = async () => {
    if (!ajusteModal.producto || !ajusteData.cantidad) return;
    try {
      await api.movimientoInventario(ajusteModal.producto.id, {
        tipo: ajusteData.tipo,
        cantidad: parseInt(ajusteData.cantidad),
        motivo: ajusteData.motivo || 'Ajuste manual',
      });
      toast({ title: 'Stock actualizado' });
      setAjusteModal({ open: false, producto: null });
      setAjusteData({ tipo: 'entrada', cantidad: '', motivo: '' });
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Inventario" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Inventario" subtitle="Control de stock">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Productos</p>
          <p className="text-2xl font-bold">{productos.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Unidades en stock</p>
          <p className="text-2xl font-bold">{totalStockUnidades.toLocaleString()}</p>
        </CardContent></Card>
        <Card className={cn(lowStock.length > 0 && "border-warning")}><CardContent className="p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {lowStock.length > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}Stock bajo
          </p>
          <p className="text-2xl font-bold text-warning">{lowStock.length}</p>
        </CardContent></Card>
        <Card className={cn(sinStock > 0 && "border-destructive")}><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Sin stock</p>
          <p className="text-2xl font-bold text-destructive">{sinStock}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="todo">Todos ({productos.length})</TabsTrigger>
          <TabsTrigger value="con">Con stock ({productos.filter(p => Number(p.stock_actual||0) > 0).length})</TabsTrigger>
          <TabsTrigger value="sin">Sin stock ({sinStock})</TabsTrigger>
          <TabsTrigger value="bajo">Stock bajo ({lowStock.filter(p => Number(p.stock_actual||0) > 0).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o código..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoryNames.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={cargarDatos}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleResetAll}><RotateCcw className="h-4 w-4 mr-1" />Restablecer</Button>
          <Button variant="outline" size="sm" onClick={exportarCsv}>Exportar CSV</Button>
        </div>
        <Button asChild variant="secondary"><Link to="/productos"><Package className="mr-2 h-4 w-4" />Gestionar productos</Link></Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="mb-6 border-warning bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.slice(0, 8).map(p => (
                <Badge key={p.id} variant="outline" className="bg-background">{p.nombre}: {p.stock_actual}</Badge>
              ))}
              {lowStock.length > 8 && <Badge variant="secondary">+{lowStock.length - 8} más</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Código" columnKey="codigo" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
              <SortHeader label="Producto" columnKey="nombre" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
              <SortHeader label="Categoría" columnKey="categoria" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
              <SortHeader label="Stock" columnKey="stock" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="right" />
              <SortHeader label="Mínimo" columnKey="minimo" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="right" />
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dt.processed.map(producto => (
              <TableRow key={producto.id}>
                <TableCell className="font-mono text-sm">{producto.codigo || '-'}</TableCell>
                <TableCell className="font-medium">{producto.nombre}</TableCell>
                <TableCell><Badge variant="outline">{producto.categoria_nombre || producto.categoria || '-'}</Badge></TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-semibold",
                    (producto.stock_actual || 0) < (producto.stock_minimo || 20) && "text-warning",
                    (producto.stock_actual || 0) <= 0 && "text-destructive"
                  )}>{producto.stock_actual || 0}</span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{producto.stock_minimo || 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setAjusteModal({ open: true, producto }); setAjusteData({ tipo: 'entrada', cantidad: '', motivo: '' }); }}>
                    <ArrowUpDown className="h-4 w-4 mr-1" />Ajustar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {dt.processed.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay productos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {dt.processed.length} de {productos.length} productos
      </p>

      <Dialog open={ajusteModal.open} onOpenChange={(open) => setAjusteModal({ open, producto: open ? ajusteModal.producto : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
            <DialogDescription>
              Producto: {ajusteModal.producto?.nombre} (Stock actual: {ajusteModal.producto?.stock_actual || 0})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de movimiento</Label>
              <Select value={ajusteData.tipo} onValueChange={(v) => setAjusteData({ ...ajusteData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" value={ajusteData.cantidad} onChange={(e) => setAjusteData({ ...ajusteData, cantidad: e.target.value })} min="1" />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={ajusteData.motivo} onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })} placeholder="Razón del ajuste" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusteModal({ open: false, producto: null })}>Cancelar</Button>
            <Button onClick={handleAjusteStock}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
