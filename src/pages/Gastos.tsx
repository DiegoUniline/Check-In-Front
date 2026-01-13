import { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, DollarSign,
  Tag, Building, Car, Utensils, Wrench, Package, Users,
  TrendingDown, FileText, MoreVertical, Eye, Trash2, RefreshCw, Edit
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; gasto: any | null }>({ open: false, gasto: null });
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; gasto: any | null }>({ open: false, gasto: null });
  
  const [formData, setFormData] = useState({
    categoria: '',
    monto: '',
    descripcion: '',
    metodo_pago: 'Efectivo',
    proveedor: '',
    notas: '',
  });

  useEffect(() => {
    cargarGastos();
  }, []);

  const cargarGastos = async () => {
    setLoading(true);
    try {
      const data = await api.getGastos();
      setGastos(Array.isArray(data) ? data : []);
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
    if (!formData.categoria || !formData.monto || !formData.descripcion) {
      toast({
        title: 'Campos requeridos',
        description: 'Complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.createGasto({
        categoria: formData.categoria,
        monto: parseFloat(formData.monto),
        descripcion: formData.descripcion,
        metodo_pago: formData.metodo_pago,
        proveedor: formData.proveedor || null,
        notas: formData.notas || null,
        fecha: new Date().toISOString().split('T')[0],
      });
      
      toast({
        title: 'Gasto registrado',
        description: `${formData.descripcion} - $${parseFloat(formData.monto).toFixed(2)}`,
      });
      
      setIsNewGastoOpen(false);
      setFormData({ categoria: '', monto: '', descripcion: '', metodo_pago: 'Efectivo', proveedor: '', notas: '' });
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
                <p className="text-2xl font-bold">${totalMes.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">${totalHoy.toLocaleString()}</p>
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
                <p className="font-bold">${cat.total.toLocaleString()}</p>
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
        </div>
        <Button onClick={() => setIsNewGastoOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGastos.map(gasto => {
              const cat = getCategoriaInfo(gasto.categoria);
              const Icon = cat.icon;
              const fecha = gasto.fecha || gasto.created_at;
              return (
                <TableRow key={gasto.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{fecha ? format(new Date(fecha), "d MMM", { locale: es }) : '-'}</p>
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
                    -${Number(gasto.monto).toLocaleString()}
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
                        <DropdownMenuItem>
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
            {filteredGastos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
              <Label>Descripción *</Label>
              <Input
                placeholder="Descripción del gasto"
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
                <Input
                  placeholder="Nombre del proveedor"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                />
              </div>
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
                      ? format(new Date(detalleModal.gasto.fecha || detalleModal.gasto.created_at), "d MMMM yyyy HH:mm", { locale: es })
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
                  <p className="font-bold text-lg text-destructive">-${Number(detalleModal.gasto.monto).toLocaleString()}</p>
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