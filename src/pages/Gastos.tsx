import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Plus, Search, DollarSign,
  Tag, Building, Car, Utensils, Wrench, Package, Users,
  TrendingDown, FileText, MoreVertical, Eye, Trash2, RefreshCw, Edit,
  RotateCcw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataTable } from '@/hooks/useDataTable';
import { SortHeader } from '@/components/datatable/SortHeader';

import { BulkActionBar } from '@/components/datatable/BulkActionBar';
import { exportToCsv } from '@/lib/exportCsv';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';
import { formatDate, formatDateTime } from '@/lib/dateFormat';

const categoriasConfig = [
  { id: 'Operación', nombre: 'Operación', icon: Building, color: 'bg-blue-500' },
  { id: 'Mantenimiento', nombre: 'Mantenimiento', icon: Wrench, color: 'bg-orange-500' },
  { id: 'Suministros', nombre: 'Suministros', icon: Package, color: 'bg-green-500' },
  { id: 'Alimentos', nombre: 'Alimentos y Bebidas', icon: Utensils, color: 'bg-purple-500' },
  { id: 'Transporte', nombre: 'Transporte', icon: Car, color: 'bg-yellow-500' },
  { id: 'Personal', nombre: 'Personal', icon: Users, color: 'bg-pink-500' },
  { id: 'Otros', nombre: 'Otros', icon: Tag, color: 'bg-gray-500' },
];

export default function Gastos() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [isNewGastoOpen, setIsNewGastoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gastos, setGastos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; gasto: any | null }>({ open: false, gasto: null });
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; gasto: any | null }>({ open: false, gasto: null });
  const [comprobanteModal, setComprobanteModal] = useState<{ open: boolean; gasto: any | null; url?: string | null }>({
    open: false,
    gasto: null,
    url: null,
  });
  
  const [formData, setFormData] = useState({
    categoria: '',
    monto: '',
    descripcion: '',
    metodo_pago: 'Efectivo',
    proveedor: '',
    proveedor_id: '',
    // `factura` se usa como "comprobante": puede ser folio o URL (PDF/imagen) para visualizarlo.
    // Relacionado con `check-in-back/src/routes/gastos.js` y la columna `gastos.factura`.
    factura: '',
    notas: '',
  });

  useEffect(() => {
    cargarGastos();
  }, []);

  const cargarGastos = async () => {
    setLoading(true);
    try {
      const [gastosData, provData] = await Promise.all([
        api.getGastos(),
        api.getProveedores().catch(() => [])
      ]);
      setGastos(Array.isArray(gastosData) ? gastosData : []);
      setProveedores(Array.isArray(provData) ? provData : []);
    } catch (error) {
      console.error('Error cargando gastos:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los gastos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredGastos = gastos.filter(g => {
    const matchSearch = g.descripcion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       g.proveedor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategoria = filterCategoria === 'all' || g.categoria === filterCategoria;
    return matchSearch && matchCategoria;
  });

  // ===== DataTable: selección, sort y filtros por columna =====
  const accessors = useMemo(() => ({
    fecha: (g: any) => g.fecha || g.created_at || '',
    categoria: (g: any) => g.categoria || '',
    descripcion: (g: any) => g.descripcion || '',
    proveedor: (g: any) => g.proveedor || '',
    metodo: (g: any) => g.metodo_pago || g.metodoPago || '',
    monto: (g: any) => Number(g.monto) || 0,
  }), []);
  const dt = useDataTable<any>(filteredGastos, accessors, { storageKey: 'gastos' });
  const [eliminandoBulk, setEliminandoBulk] = useState(false);

  const handleResetAll = () => {
    setSearchQuery('');
    setFilterCategoria('all');
    dt.resetPersisted();
  };

  const eliminarSeleccionados = async () => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.deleteGasto(id)));
      toast({ title: 'Gastos eliminados', description: `Se eliminaron ${ids.length}.` });
      dt.clearSelection();
      await cargarGastos();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message || 'No se pudo eliminar', variant: 'destructive' });
    } finally {
      setEliminandoBulk(false);
    }
  };

  const exportarCsv = () => {
    exportToCsv('gastos', dt.selectedRows.length > 0 ? dt.selectedRows : dt.processed, [
      { key: 'fecha', label: 'Fecha', accessor: (g) => g.fecha || g.created_at },
      { key: 'categoria', label: 'Categoría', accessor: (g) => g.categoria },
      { key: 'descripcion', label: 'Descripción', accessor: (g) => g.descripcion },
      { key: 'proveedor', label: 'Proveedor', accessor: (g) => g.proveedor },
      { key: 'metodo_pago', label: 'Método', accessor: (g) => g.metodo_pago },
      { key: 'monto', label: 'Monto', accessor: (g) => g.monto },
      { key: 'factura', label: 'Comprobante', accessor: (g) => g.factura },
    ]);
  };

  const totalMes = gastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const totalHoy = gastos.filter(g => g.fecha?.startsWith(hoy) || (g.created_at && g.created_at.startsWith(hoy))).reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
  const gastosPorCategoria = categoriasConfig.map(cat => ({
    ...cat,
    total: gastos.filter(g => g.categoria === cat.id).reduce((sum, g) => sum + (Number(g.monto) || 0), 0),
  })).sort((a, b) => b.total - a.total);

  const getCategoriaInfo = (catId: string) => {
    return categoriasConfig.find(c => c.id === catId) || categoriasConfig[categoriasConfig.length - 1];
  };

  const handleNuevoGasto = async () => {
    // Validar solo campos obligatorios: categoria y monto
    if (!formData.categoria || !formData.monto) {
      toast({
        title: 'Campos requeridos',
        description: 'Complete categoría y monto',
        variant: 'destructive',
      });
      return;
    }

    // Auto-generar descripción si está vacío
    const descripcion = formData.descripcion.trim() || 
      `Gasto ${categoriasConfig.find(c => c.id === formData.categoria)?.nombre || formData.categoria}`;

    try {
      await api.createGasto({
        categoria: formData.categoria,
        monto: parseFloat(formData.monto),
        descripcion,
        metodo_pago: formData.metodo_pago,
        proveedor: formData.proveedor || null,
        // `factura` funciona como "comprobante" (folio o URL). Si viene vacío, guardamos null.
        factura: formData.factura?.trim() ? formData.factura.trim() : null,
        notas: formData.notas || null,
        fecha: new Date().toISOString().split('T')[0],
      });
      
      toast({
        title: 'Gasto registrado',
        description: `${descripcion} - ${formatCurrency(parseFloat(formData.monto))}`,
      });
      
      setIsNewGastoOpen(false);
      setFormData({ categoria: '', monto: '', descripcion: '', metodo_pago: 'Efectivo', proveedor: '', proveedor_id: '', factura: '', notas: '' });
      cargarGastos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteGasto = async () => {
    if (!deleteDialog.gasto) return;
    try {
      await api.deleteGasto(deleteDialog.gasto.id);
      toast({ title: 'Gasto eliminado' });
      setDeleteDialog({ open: false, gasto: null });
      cargarGastos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleVerDetalle = async (gasto: any) => {
    try {
      const detalles = await api.getGasto(gasto.id);
      setDetalleModal({ open: true, gasto: detalles });
    } catch {
      setDetalleModal({ open: true, gasto });
    }
  };

  const getComprobanteUrl = (factura?: string | null): string | null => {
    /*
      Convierte el campo `factura` a URL si aplica.
      - Si es URL absoluta (http/https), la usamos tal cual.
      - Si es un path (ej. /uploads/xxx.pdf), construimos URL basada en VITE_API_URL.
      Si no parece URL/path, lo tratamos como folio (sin URL).
      Relacionado con `gastos.factura`.
    */
    const raw = (factura || '').trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) return raw;

    if (raw.startsWith('/')) {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const base = apiUrl.replace(/\/api\/?$/i, '');
      return `${base}${raw}`;
    }

    return null;
  };

  const handleVerComprobante = async (gasto: any) => {
    /*
      Acción del menú "Ver comprobante".
      - Si hay `factura` como URL/path: abre un modal con preview y enlace.
      - Si hay `factura` como folio: muestra modal con el folio.
      - Si no hay: toast informativo.
    */
    try {
      const detalles = await api.getGasto(gasto.id).catch(() => gasto);
      const factura = (detalles?.factura || detalles?.comprobante || '').trim();
      if (!factura) {
        toast({ title: 'Sin comprobante', description: 'Este gasto no tiene comprobante/factura registrada.' });
        return;
      }

      const url = getComprobanteUrl(factura);
      setComprobanteModal({ open: true, gasto: detalles, url });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Control de Gastos" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Control de Gastos" 
      subtitle="Registro y seguimiento de egresos"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalMes)}</p>
                <p className="text-sm text-muted-foreground">Total del Mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalHoy)}</p>
                <p className="text-sm text-muted-foreground">Gastos Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Receipt className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gastos.length}</p>
                <p className="text-sm text-muted-foreground">Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categoriasConfig.length}</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {gastosPorCategoria.map(cat => {
          const Icon = cat.icon;
          return (
            <Card 
              key={cat.id} 
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setFilterCategoria(filterCategoria === cat.id ? 'all' : cat.id)}
            >
              <CardContent className="p-3 text-center">
                <div className={`mx-auto w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-xs text-muted-foreground truncate">{cat.nombre}</p>
                <p className="font-bold">{formatCurrency(cat.total)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por descripción o proveedor..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categoriasConfig.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={cargarGastos}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Restablecer
          </Button>
        </div>
        <Button onClick={() => setIsNewGastoOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      </div>

      <Card>
        <div className="p-3 border-b">
          <BulkActionBar
            count={dt.selectedCount}
            onClear={dt.clearSelection}
            onDelete={eliminarSeleccionados}
            onExport={exportarCsv}
            deleting={eliminandoBulk}
            entityName="gastos"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={dt.allVisibleSelected ? true : dt.someVisibleSelected ? 'indeterminate' : false}
                  onCheckedChange={(v) => dt.toggleSelectAllVisible(!!v)}
                />
              </TableHead>
              <SortHeader label="Fecha" columnKey="fecha" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.fecha} onFilterChange={(v) => dt.setColumnFilter('fecha', v)} onValuesChange={(vs) => dt.setColumnFilterValues('fecha', vs)} filterOptions={filteredGastos.map((g: any) => g.fecha)} />
              <SortHeader label="Categoría" columnKey="categoria" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.categoria} onFilterChange={(v) => dt.setColumnFilter('categoria', v)} onValuesChange={(vs) => dt.setColumnFilterValues('categoria', vs)} filterOptions={filteredGastos.map((g: any) => g.categoria)} />
              <SortHeader label="Descripción" columnKey="descripcion" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.descripcion} onFilterChange={(v) => dt.setColumnFilter('descripcion', v)} onValuesChange={(vs) => dt.setColumnFilterValues('descripcion', vs)} filterOptions={filteredGastos.map((g: any) => g.descripcion)} />
              <SortHeader label="Proveedor" columnKey="proveedor" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.proveedor} onFilterChange={(v) => dt.setColumnFilter('proveedor', v)} onValuesChange={(vs) => dt.setColumnFilterValues('proveedor', vs)} filterOptions={filteredGastos.map((g: any) => g.proveedor)} />
              <SortHeader label="Método" columnKey="metodo" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.metodo} onFilterChange={(v) => dt.setColumnFilter('metodo', v)} onValuesChange={(vs) => dt.setColumnFilterValues('metodo', vs)} filterOptions={filteredGastos.map((g: any) => g.metodo_pago)} />
              <SortHeader label="Monto" columnKey="monto" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="right" filterValue={dt.filters.monto} onFilterChange={(v) => dt.setColumnFilter('monto', v)} onValuesChange={(vs) => dt.setColumnFilterValues('monto', vs)} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dt.processed.map(gasto => {
              const cat = getCategoriaInfo(gasto.categoria);
              const Icon = cat.icon;
              const fecha = gasto.fecha || gasto.created_at;
              return (
                <TableRow key={gasto.id} className={dt.selected.has(gasto.id) ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={dt.selected.has(gasto.id)}
                      onCheckedChange={() => dt.toggleRow(gasto.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{fecha ? formatDate(fecha) : '-'}</p>
                      <p className="text-xs text-muted-foreground">{fecha ? format(new Date(fecha), "HH:mm") : ''}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${cat.color}`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm">{cat.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{gasto.descripcion}</p>
                    <p className="text-xs text-muted-foreground">{gasto.subcategoria || ''}</p>
                  </TableCell>
                  <TableCell>{gasto.proveedor || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{gasto.metodo_pago || gasto.metodoPago || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    -{formatCurrency(Number(gasto.monto))}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleVerDetalle(gasto)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleVerComprobante(gasto)}
                          disabled={!String(gasto.factura || '').trim()}
                        >
                          <FileText className="mr-2 h-4 w-4" /> Ver comprobante
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog({ open: true, gasto })}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {dt.processed.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay gastos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {filteredGastos.length} de {gastos.length} gastos
      </p>

      {/* New Expense Dialog */}
      <Dialog open={isNewGastoOpen} onOpenChange={setIsNewGastoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Registrar Nuevo Gasto
            </DialogTitle>
            <DialogDescription>
              Complete la información del gasto a registrar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasConfig.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Monto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Descripción del gasto (se auto-genera si está vacío)"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={formData.metodo_pago} onValueChange={(v) => setFormData({ ...formData, metodo_pago: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <ComboboxCreatable
                  options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                  value={formData.proveedor_id}
                  onValueChange={(v) => {
                    const prov = proveedores.find(p => p.id === v);
                    setFormData({ ...formData, proveedor_id: v, proveedor: prov?.nombre || '' });
                  }}
                  onCreate={async (nombre) => {
                    try {
                      const newProv = await api.createProveedor({ nombre });
                      setProveedores([...proveedores, newProv]);
                      toast({ title: 'Proveedor creado' });
                      return { value: newProv.id, label: newProv.nombre };
                    } catch (e: any) {
                      // Si la API falla, usar el nombre directamente como texto
                      const tempId = `temp-${Date.now()}`;
                      setFormData(prev => ({ ...prev, proveedor: nombre, proveedor_id: tempId }));
                      toast({ title: 'Proveedor guardado localmente', description: 'El endpoint de proveedores no está disponible' });
                      return { value: tempId, label: nombre };
                    }
                  }}
                  placeholder="Seleccionar proveedor..."
                  searchPlaceholder="Buscar o crear proveedor..."
                  createLabel="Crear proveedor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comprobante / Factura</Label>
              <Input
                placeholder="Folio o URL (PDF/imagen)"
                value={formData.factura}
                onChange={(e) => setFormData({ ...formData, factura: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Puede ser un folio (ej. F-123) o un enlace a un PDF/imagen (ej. `https://...`).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewGastoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleNuevoGasto}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Gasto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle Modal */}
      <Dialog open={detalleModal.open} onOpenChange={(open) => setDetalleModal({ open, gasto: open ? detalleModal.gasto : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalle del Gasto
            </DialogTitle>
            <DialogDescription>
              Información completa del registro
            </DialogDescription>
          </DialogHeader>
          {detalleModal.gasto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {detalleModal.gasto.fecha || detalleModal.gasto.created_at
                      ? formatDateTime(detalleModal.gasto.fecha || detalleModal.gasto.created_at)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <Badge className={getCategoriaInfo(detalleModal.gasto.categoria).color}>
                    {getCategoriaInfo(detalleModal.gasto.categoria).nombre}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="font-medium">{detalleModal.gasto.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-bold text-lg text-destructive">-{formatCurrency(Number(detalleModal.gasto.monto))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  <Badge variant="outline">{detalleModal.gasto.metodo_pago || 'N/A'}</Badge>
                </div>
              </div>
              {detalleModal.gasto.proveedor && (
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{detalleModal.gasto.proveedor}</p>
                </div>
              )}
              {detalleModal.gasto.factura && (
                <div>
                  <p className="text-sm text-muted-foreground">Comprobante / Factura</p>
                  <p className="font-medium break-words">{detalleModal.gasto.factura}</p>
                </div>
              )}
              {detalleModal.gasto.notas && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p>{detalleModal.gasto.notas}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comprobante Modal */}
      <Dialog
        open={comprobanteModal.open}
        onOpenChange={(open) =>
          setComprobanteModal({ open, gasto: open ? comprobanteModal.gasto : null, url: open ? comprobanteModal.url : null })
        }
      >
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Comprobante
            </DialogTitle>
            <DialogDescription>
              {comprobanteModal.gasto?.descripcion || 'Comprobante del gasto'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Factura / Folio</p>
              <p className="font-medium break-words">{comprobanteModal.gasto?.factura}</p>
            </div>

            {comprobanteModal.url ? (
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-center">
                  <a href={comprobanteModal.url} target="_blank" rel="noreferrer">
                    Abrir en nueva pestaña
                  </a>
                </Button>

                {/* Preview simple: iframe para PDF o embed genérico */}
                <div className="w-full h-[60vh] rounded-lg overflow-hidden border bg-background">
                  <iframe
                    title="Comprobante"
                    src={comprobanteModal.url}
                    className="w-full h-full"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este comprobante está guardado como folio (no como archivo/URL). Si necesitas adjuntar un archivo, pega aquí el enlace del PDF/imagen.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, gasto: open ? deleteDialog.gasto : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro del gasto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGasto}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}