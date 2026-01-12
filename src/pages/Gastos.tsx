import { useState } from 'react';
import { 
  Receipt, Plus, Search, Filter, DollarSign, Calendar,
  Tag, Building, Car, Utensils, Wrench, Package, Users,
  TrendingDown, FileText, MoreVertical, Eye, Trash2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Gasto {
  id: string;
  fecha: Date;
  categoria: string;
  subcategoria: string;
  descripcion: string;
  monto: number;
  metodoPago: string;
  proveedor?: string;
  comprobante?: string;
  notas?: string;
  createdBy: string;
}

const categorias = [
  { id: 'operacion', nombre: 'Operación', icon: Building, color: 'bg-blue-500' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', icon: Wrench, color: 'bg-orange-500' },
  { id: 'suministros', nombre: 'Suministros', icon: Package, color: 'bg-green-500' },
  { id: 'alimentos', nombre: 'Alimentos y Bebidas', icon: Utensils, color: 'bg-purple-500' },
  { id: 'transporte', nombre: 'Transporte', icon: Car, color: 'bg-yellow-500' },
  { id: 'personal', nombre: 'Personal', icon: Users, color: 'bg-pink-500' },
  { id: 'otros', nombre: 'Otros', icon: Tag, color: 'bg-gray-500' },
];

export default function Gastos() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [isNewGastoOpen, setIsNewGastoOpen] = useState(false);
  
  // Form state
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevoMetodo, setNuevoMetodo] = useState('Efectivo');
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [nuevasNotas, setNuevasNotas] = useState('');

  // Mock data
  const [gastos] = useState<Gasto[]>([
    { id: '1', fecha: new Date(), categoria: 'suministros', subcategoria: 'Limpieza', descripcion: 'Productos de limpieza', monto: 1250, metodoPago: 'Efectivo', proveedor: 'Distribuidora ABC', createdBy: 'Carlos García' },
    { id: '2', fecha: new Date(), categoria: 'mantenimiento', subcategoria: 'Reparaciones', descripcion: 'Reparación AC Hab 201', monto: 3500, metodoPago: 'Transferencia', proveedor: 'Clima Express', createdBy: 'Carlos García' },
    { id: '3', fecha: new Date(Date.now() - 86400000), categoria: 'alimentos', subcategoria: 'Insumos', descripcion: 'Compra de café y bebidas', monto: 890, metodoPago: 'Tarjeta', proveedor: 'Costco', createdBy: 'María López' },
    { id: '4', fecha: new Date(Date.now() - 86400000), categoria: 'operacion', subcategoria: 'Servicios', descripcion: 'Pago luz mensual', monto: 8500, metodoPago: 'Transferencia', createdBy: 'Admin' },
    { id: '5', fecha: new Date(Date.now() - 172800000), categoria: 'personal', subcategoria: 'Extras', descripcion: 'Horas extra personal limpieza', monto: 2400, metodoPago: 'Efectivo', createdBy: 'Carlos García' },
    { id: '6', fecha: new Date(Date.now() - 172800000), categoria: 'transporte', subcategoria: 'Combustible', descripcion: 'Gasolina van aeropuerto', monto: 1200, metodoPago: 'Tarjeta', createdBy: 'María López' },
  ]);

  const filteredGastos = gastos.filter(g => {
    const matchSearch = g.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       g.proveedor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategoria = filterCategoria === 'all' || g.categoria === filterCategoria;
    return matchSearch && matchCategoria;
  });

  // Stats
  const totalMes = gastos.reduce((sum, g) => sum + g.monto, 0);
  const totalHoy = gastos.filter(g => format(g.fecha, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).reduce((sum, g) => sum + g.monto, 0);
  const gastosPorCategoria = categorias.map(cat => ({
    ...cat,
    total: gastos.filter(g => g.categoria === cat.id).reduce((sum, g) => sum + g.monto, 0),
  })).sort((a, b) => b.total - a.total);

  const getCategoriaInfo = (catId: string) => {
    return categorias.find(c => c.id === catId) || categorias[categorias.length - 1];
  };

  const handleNuevoGasto = () => {
    if (!nuevaCategoria || !nuevoMonto || !nuevaDescripcion) {
      toast({
        title: 'Campos requeridos',
        description: 'Complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Gasto registrado',
      description: `${nuevaDescripcion} - $${parseFloat(nuevoMonto).toFixed(2)}`,
    });
    
    setIsNewGastoOpen(false);
    setNuevaCategoria('');
    setNuevoMonto('');
    setNuevaDescripcion('');
    setNuevoProveedor('');
    setNuevasNotas('');
  };

  return (
    <MainLayout 
      title="Control de Gastos" 
      subtitle="Registro y seguimiento de egresos"
    >
      {/* Stats */}
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
                <p className="text-2xl font-bold">{categorias.length}</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary */}
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

      {/* Toolbar */}
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
              {categorias.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsNewGastoOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Table */}
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
              return (
                <TableRow key={gasto.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{format(gasto.fecha, "d MMM", { locale: es })}</p>
                      <p className="text-xs text-muted-foreground">{format(gasto.fecha, "HH:mm")}</p>
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
                    <p className="text-xs text-muted-foreground">{gasto.subcategoria}</p>
                  </TableCell>
                  <TableCell>{gasto.proveedor || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{gasto.metodoPago}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    -${gasto.monto.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" /> Ver comprobante
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
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
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={nuevaCategoria} onValueChange={setNuevaCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
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
                  value={nuevoMonto}
                  onChange={(e) => setNuevoMonto(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Input
                placeholder="Descripción del gasto"
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={nuevoMetodo} onValueChange={setNuevoMetodo}>
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
                  value={nuevoProveedor}
                  onChange={(e) => setNuevoProveedor(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={nuevasNotas}
                onChange={(e) => setNuevasNotas(e.target.value)}
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
    </MainLayout>
  );
}
