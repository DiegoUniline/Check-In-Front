import { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Edit, AlertTriangle,
  ArrowUpDown, MoreVertical, RefreshCw, Trash2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { ComboboxCreatable, ComboboxOption } from '@/components/ui/combobox-creatable';

export default function Inventario() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [ajusteModal, setAjusteModal] = useState<{ open: boolean; producto: any | null }>({ open: false, producto: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; producto: any | null }>({ open: false, producto: null });
  const [ajusteData, setAjusteData] = useState({ tipo: 'entrada', cantidad: '', motivo: '' });
  
  // Generar código automático
  const generarCodigo = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PROD-${timestamp.slice(-4)}${random}`;
  };

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    categoria_id: '',
    precio_venta: '',
    stock_actual: '',
    stock_minimo: '10',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodsData, catsData] = await Promise.all([
        api.getProductos(),
        api.getCategorias()
      ]);
      setProductos(Array.isArray(prodsData) ? prodsData : []);
      setCategorias(Array.isArray(catsData) ? catsData : []);
    } catch (error) {
      console.error('Error cargando datos:', error);
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
    return matchSearch && matchCategory;
  });

  const lowStock = productos.filter(p => (p.stock_actual || 0) < (p.stock_minimo || 20));
  const totalValue = productos.reduce((sum, p) => sum + ((p.precio_venta || 0) * (p.stock_actual || 0)), 0);

  const openNewModal = () => {
    setEditingProduct(null);
    setFormData({
      codigo: generarCodigo(), // Auto-generar código
      nombre: '',
      categoria_id: categorias[0]?.id || '',
      precio_venta: '',
      stock_actual: '0',
      stock_minimo: '10',
    });
    setModalOpen(true);
  };

  const openEditModal = (producto: any) => {
    setEditingProduct(producto);
    setFormData({
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      categoria_id: producto.categoria_id || '',
      precio_venta: producto.precio_venta?.toString() || '',
      stock_actual: producto.stock_actual?.toString() || '0',
      stock_minimo: producto.stock_minimo?.toString() || '10',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.precio_venta) {
      toast({ title: 'Error', description: 'Complete los campos requeridos', variant: 'destructive' });
      return;
    }

    try {
      const data = {
        codigo: formData.codigo,
        nombre: formData.nombre,
        categoria_id: formData.categoria_id || null,
        precio_venta: parseFloat(formData.precio_venta),
        stock_actual: parseInt(formData.stock_actual) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 10,
      };

      if (editingProduct) {
        await api.updateProducto(editingProduct.id, data);
        toast({ title: 'Producto actualizado' });
      } else {
        await api.createProducto(data);
        toast({ title: 'Producto creado' });
      }

      setModalOpen(false);
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
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

  const handleDelete = async () => {
    if (!deleteDialog.producto) return;
    try {
      await api.deleteProducto(deleteDialog.producto.id);
      toast({ title: 'Producto eliminado' });
      setDeleteDialog({ open: false, producto: null });
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
    <MainLayout 
      title="Inventario" 
      subtitle="Control de stock y productos"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Productos</p>
            <p className="text-2xl font-bold">{productos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Categorías</p>
            <p className="text-2xl font-bold">{categorias.length}</p>
          </CardContent>
        </Card>
        <Card className={cn(lowStock.length > 0 && "border-warning")}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {lowStock.length > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}
              Stock Bajo
            </p>
            <p className="text-2xl font-bold text-warning">{lowStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-primary">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o código..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoryNames.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={cargarDatos}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="mb-6 border-warning bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.slice(0, 5).map(p => (
                <Badge key={p.id} variant="outline" className="bg-background">
                  {p.nombre}: {p.stock_actual}
                </Badge>
              ))}
              {lowStock.length > 5 && (
                <Badge variant="secondary">+{lowStock.length - 5} más</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map(producto => (
              <TableRow key={producto.id}>
                <TableCell className="font-mono text-sm">{producto.codigo || '-'}</TableCell>
                <TableCell className="font-medium">{producto.nombre}</TableCell>
                <TableCell>
                  <Badge variant="outline">{producto.categoria_nombre || producto.categoria || '-'}</Badge>
                </TableCell>
                <TableCell className="text-right">${Number(producto.precio_venta || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-medium",
                    (producto.stock_actual || 0) < (producto.stock_minimo || 20) && "text-warning",
                    (producto.stock_actual || 0) < 10 && "text-destructive"
                  )}>
                    {producto.stock_actual || 0}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  ${((producto.precio_venta || 0) * (producto.stock_actual || 0)).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setAjusteModal({ open: true, producto });
                        setAjusteData({ tipo: 'entrada', cantidad: '', motivo: '' });
                      }}>
                        <ArrowUpDown className="mr-2 h-4 w-4" /> Ajustar stock
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditModal(producto)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog({ open: true, producto })}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay productos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {filteredProducts.length} de {productos.length} productos
      </p>

      {/* Modal Producto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifique la información del producto' : 'Ingrese la información del nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ej: PROD001"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <ComboboxCreatable
                  options={categorias.map(cat => ({ value: cat.id, label: cat.nombre }))}
                  value={formData.categoria_id}
                  onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}
                  onCreate={async (nombre) => {
                    try {
                      const newCat = await api.createCategoria({ nombre });
                      setCategorias([...categorias, newCat]);
                      toast({ title: 'Categoría creada' });
                      return { value: newCat.id, label: newCat.nombre };
                    } catch (e: any) {
                      toast({ title: 'Error', description: e.message, variant: 'destructive' });
                    }
                  }}
                  placeholder="Seleccionar categoría..."
                  searchPlaceholder="Buscar o crear categoría..."
                  createLabel="Crear categoría"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del producto"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Precio *</Label>
                <Input
                  type="number"
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Actual</Label>
                <Input
                  type="number"
                  value={formData.stock_actual}
                  onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingProduct ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ajuste Stock */}
      <Dialog open={ajusteModal.open} onOpenChange={(open) => setAjusteModal({ open, producto: open ? ajusteModal.producto : null })}>
        <DialogContent>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={ajusteData.cantidad}
                onChange={(e) => setAjusteData({ ...ajusteData, cantidad: e.target.value })}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={ajusteData.motivo}
                onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })}
                placeholder="Razón del ajuste"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusteModal({ open: false, producto: null })}>Cancelar</Button>
            <Button onClick={handleAjusteStock}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, producto: open ? deleteDialog.producto : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente "{deleteDialog.producto?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
