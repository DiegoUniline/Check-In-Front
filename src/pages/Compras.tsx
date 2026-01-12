import { useState } from 'react';
import { 
  ShoppingBag, Plus, Search, Filter, Package, Truck, 
  Calendar, DollarSign, CheckCircle2, Clock, AlertCircle,
  MoreVertical, Eye, FileText, Building
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface OrdenCompra {
  id: string;
  numero: string;
  proveedor: Proveedor;
  fecha: Date;
  fechaEntrega?: Date;
  items: ItemCompra[];
  subtotal: number;
  iva: number;
  total: number;
  estado: 'Borrador' | 'Enviada' | 'Confirmada' | 'EnTransito' | 'Recibida' | 'Cancelada';
  notas?: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  rfc: string;
  contacto: string;
  telefono: string;
  email: string;
}

interface ItemCompra {
  id: string;
  producto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
}

const mockProveedores: Proveedor[] = [
  { id: 'prov1', nombre: 'Distribuidora ABC', rfc: 'DAB123456789', contacto: 'Juan Pérez', telefono: '+52 55 1234 5678', email: 'ventas@distri-abc.com' },
  { id: 'prov2', nombre: 'Suministros Hoteleros', rfc: 'SHO987654321', contacto: 'María García', telefono: '+52 55 8765 4321', email: 'contacto@sumhotel.com' },
  { id: 'prov3', nombre: 'Alimentos del Pacífico', rfc: 'ADP456789123', contacto: 'Roberto Sánchez', telefono: '+52 744 123 4567', email: 'pedidos@alipacifico.com' },
];

export default function Compras() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [orderItems, setOrderItems] = useState<{producto: string, cantidad: string, precio: string}[]>([
    { producto: '', cantidad: '', precio: '' }
  ]);

  // Mock orders
  const [ordenes] = useState<OrdenCompra[]>([
    {
      id: '1',
      numero: 'OC-2024-001',
      proveedor: mockProveedores[0],
      fecha: new Date(),
      fechaEntrega: new Date(Date.now() + 86400000 * 3),
      items: [
        { id: 'i1', producto: 'Jabón líquido 5L', cantidad: 10, unidad: 'Pza', precioUnitario: 180, total: 1800 },
        { id: 'i2', producto: 'Shampoo 5L', cantidad: 10, unidad: 'Pza', precioUnitario: 220, total: 2200 },
      ],
      subtotal: 4000,
      iva: 640,
      total: 4640,
      estado: 'Confirmada',
    },
    {
      id: '2',
      numero: 'OC-2024-002',
      proveedor: mockProveedores[2],
      fecha: new Date(Date.now() - 86400000),
      items: [
        { id: 'i3', producto: 'Café gourmet 1kg', cantidad: 20, unidad: 'Kg', precioUnitario: 450, total: 9000 },
        { id: 'i4', producto: 'Leche 1L', cantidad: 50, unidad: 'Pza', precioUnitario: 28, total: 1400 },
      ],
      subtotal: 10400,
      iva: 1664,
      total: 12064,
      estado: 'EnTransito',
    },
    {
      id: '3',
      numero: 'OC-2024-003',
      proveedor: mockProveedores[1],
      fecha: new Date(Date.now() - 86400000 * 3),
      fechaEntrega: new Date(Date.now() - 86400000),
      items: [
        { id: 'i5', producto: 'Toallas de baño', cantidad: 50, unidad: 'Pza', precioUnitario: 180, total: 9000 },
        { id: 'i6', producto: 'Sábanas king', cantidad: 30, unidad: 'Juego', precioUnitario: 850, total: 25500 },
      ],
      subtotal: 34500,
      iva: 5520,
      total: 40020,
      estado: 'Recibida',
    },
    {
      id: '4',
      numero: 'OC-2024-004',
      proveedor: mockProveedores[0],
      fecha: new Date(),
      items: [
        { id: 'i7', producto: 'Aromatizante', cantidad: 24, unidad: 'Pza', precioUnitario: 85, total: 2040 },
      ],
      subtotal: 2040,
      iva: 326.40,
      total: 2366.40,
      estado: 'Borrador',
    },
  ]);

  const filteredOrdenes = ordenes.filter(o => {
    const matchSearch = o.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       o.proveedor.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEstado = filterEstado === 'all' || o.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  // Stats
  const totalPendiente = ordenes.filter(o => ['Enviada', 'Confirmada', 'EnTransito'].includes(o.estado)).reduce((s, o) => s + o.total, 0);
  const ordenesActivas = ordenes.filter(o => !['Recibida', 'Cancelada'].includes(o.estado)).length;

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      'Borrador': 'bg-muted text-muted-foreground',
      'Enviada': 'bg-info',
      'Confirmada': 'bg-primary',
      'EnTransito': 'bg-warning text-warning-foreground',
      'Recibida': 'bg-success',
      'Cancelada': 'bg-destructive',
    };
    return colors[estado] || 'bg-muted';
  };

  const getEstadoIcon = (estado: string) => {
    switch(estado) {
      case 'Borrador': return <FileText className="h-4 w-4" />;
      case 'Enviada': return <Clock className="h-4 w-4" />;
      case 'Confirmada': return <CheckCircle2 className="h-4 w-4" />;
      case 'EnTransito': return <Truck className="h-4 w-4" />;
      case 'Recibida': return <Package className="h-4 w-4" />;
      case 'Cancelada': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { producto: '', cantidad: '', precio: '' }]);
  };

  const handleCreateOrder = () => {
    if (!selectedProveedor) {
      toast({
        title: 'Seleccione un proveedor',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Orden creada',
      description: 'La orden de compra ha sido creada exitosamente',
    });
    setIsNewOrderOpen(false);
    setSelectedProveedor('');
    setOrderItems([{ producto: '', cantidad: '', precio: '' }]);
  };

  return (
    <MainLayout 
      title="Órdenes de Compra" 
      subtitle="Gestión de compras a proveedores"
    >
      <Tabs defaultValue="ordenes">
        <TabsList className="mb-6">
          <TabsTrigger value="ordenes">Órdenes de Compra</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ordenes.length}</p>
                    <p className="text-sm text-muted-foreground">Total Órdenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ordenesActivas}</p>
                    <p className="text-sm text-muted-foreground">En Proceso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Truck className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ordenes.filter(o => o.estado === 'EnTransito').length}</p>
                    <p className="text-sm text-muted-foreground">En Tránsito</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <DollarSign className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${totalPendiente.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Por Pagar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por número o proveedor..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="Enviada">Enviada</SelectItem>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="EnTransito">En Tránsito</SelectItem>
                  <SelectItem value="Recibida">Recibida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsNewOrderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </div>

          {/* Orders Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdenes.map(orden => (
                  <TableRow key={orden.id}>
                    <TableCell className="font-medium">{orden.numero}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{orden.proveedor.nombre}</p>
                        <p className="text-xs text-muted-foreground">{orden.proveedor.contacto}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{format(orden.fecha, "d MMM yyyy", { locale: es })}</p>
                        {orden.fechaEntrega && (
                          <p className="text-xs text-muted-foreground">
                            Entrega: {format(orden.fechaEntrega, "d MMM", { locale: es })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {orden.items.length} productos
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("flex items-center gap-1 w-fit", getEstadoColor(orden.estado))}>
                        {getEstadoIcon(orden.estado)}
                        {orden.estado === 'EnTransito' ? 'En Tránsito' : orden.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ${orden.total.toLocaleString()}
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
                          {orden.estado === 'EnTransito' && (
                            <DropdownMenuItem>
                              <Package className="mr-2 h-4 w-4" /> Marcar recibida
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" /> Generar PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores">
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar proveedor..." className="pl-9" />
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockProveedores.map(prov => (
              <Card key={prov.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{prov.nombre}</h3>
                      <p className="text-sm text-muted-foreground">{prov.rfc}</p>
                      <Separator className="my-2" />
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Contacto:</span> {prov.contacto}</p>
                        <p><span className="text-muted-foreground">Tel:</span> {prov.telefono}</p>
                        <p><span className="text-muted-foreground">Email:</span> {prov.email}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Order Dialog */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Nueva Orden de Compra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Select value={selectedProveedor} onValueChange={setSelectedProveedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {mockProveedores.map(prov => (
                    <SelectItem key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              
              <div className="space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input 
                      placeholder="Producto" 
                      className="col-span-6"
                      value={item.producto}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        newItems[idx].producto = e.target.value;
                        setOrderItems(newItems);
                      }}
                    />
                    <Input 
                      placeholder="Cant." 
                      type="number"
                      className="col-span-2"
                      value={item.cantidad}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        newItems[idx].cantidad = e.target.value;
                        setOrderItems(newItems);
                      }}
                    />
                    <Input 
                      placeholder="Precio" 
                      type="number"
                      className="col-span-3"
                      value={item.precio}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        newItems[idx].precio = e.target.value;
                        setOrderItems(newItems);
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="col-span-1"
                      onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                      disabled={orderItems.length === 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea placeholder="Notas adicionales para el proveedor..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrder}>
              Crear Orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
