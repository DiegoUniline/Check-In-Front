import { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Search, Package, Truck, 
  Calendar, DollarSign, CheckCircle2, Clock, AlertCircle,
  MoreVertical, Eye, FileText, Building, RefreshCw, X
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { ComboboxCreatable, ComboboxOption } from '@/components/ui/combobox-creatable';

interface OrderItem {
  producto_id: string;
  producto_nombre: string;
  cantidad: string;
  precio: string;
}

export default function Compras() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { producto_id: '', producto_nombre: '', cantidad: '', precio: '' }
  ]);
  const [notas, setNotas] = useState('');
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; orden: any | null }>({ open: false, orden: null });
  const [isNewProveedorOpen, setIsNewProveedorOpen] = useState(false);
  const [newProveedor, setNewProveedor] = useState({ nombre: '', rfc: '', contacto: '', telefono: '', email: '' });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [ordenesData, proveedoresData, productosData] = await Promise.all([
        api.getCompras().catch(() => []),
        api.getProveedores().catch(() => []),
        api.getProductos().catch(() => [])
      ]);
      setOrdenes(Array.isArray(ordenesData) ? ordenesData : []);
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
      setProductos(Array.isArray(productosData) ? productosData : []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrdenes = ordenes.filter(o => {
    const numero = o.numero || o.codigo || '';
    const provNombre = o.proveedor?.nombre || o.proveedor_nombre || '';
    const matchSearch = numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       provNombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEstado = filterEstado === 'all' || o.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const totalPendiente = ordenes.filter(o => ['Enviada', 'Confirmada', 'EnTransito'].includes(o.estado)).reduce((s, o) => s + (Number(o.total) || 0), 0);
  const ordenesActivas = ordenes.filter(o => !['Recibida', 'Cancelada'].includes(o.estado)).length;

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      /*
        Importante: `Badge` por defecto trae `text-primary-foreground` (blanco).
        Si un estado no define explícitamente `text-*`, puede quedar ilegible en modo día.
        Relacionado con `Check-In-Front/src/components/ui/badge.tsx`.
      */
      'Borrador': 'bg-muted text-muted-foreground',
      'Pendiente': 'bg-warning text-warning-foreground',
      'Enviada': 'bg-info text-info-foreground',
      'Confirmada': 'bg-primary text-primary-foreground',
      'EnTransito': 'bg-warning text-warning-foreground',
      'Recibida': 'bg-success text-success-foreground',
      'Cancelada': 'bg-destructive text-destructive-foreground',
    };
    return colors[estado] || 'bg-muted text-muted-foreground';
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
    setOrderItems([...orderItems, { producto_id: '', producto_nombre: '', cantidad: '', precio: '' }]);
  };

 const handleCreateOrder = async () => {
  if (!selectedProveedor) {
    toast({ title: 'Seleccione un proveedor', variant: 'destructive' });
    return;
  }

  const validItems = orderItems.filter(i => i.producto_nombre && i.cantidad && i.precio);
  if (validItems.length === 0) {
    toast({ title: 'Agregue al menos un producto', variant: 'destructive' });
    return;
  }

  try {
    const detalle = validItems.map(i => ({
      producto_id: i.producto_id || null,
      cantidad: parseFloat(i.cantidad),
      precio_unitario: parseFloat(i.precio)
    }));
    const subtotal = detalle.reduce((s, i) => s + (i.cantidad * i.precio_unitario), 0);
    const impuestos = subtotal * 0.16;

    await api.createCompra({
      proveedor_id: selectedProveedor,
      detalle,
      subtotal,
      impuestos,
      total: subtotal + impuestos,
      notas: notas || null
    });

    toast({ title: 'Orden creada', description: 'La orden de compra ha sido creada exitosamente' });
    setIsNewOrderOpen(false);
    setSelectedProveedor('');
    setOrderItems([{ producto_id: '', producto_nombre: '', cantidad: '', precio: '' }]);
    setNotas('');
    cargarDatos();
  } catch (error: any) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
};
  const handleUpdateEstado = async (ordenId: string, nuevoEstado: string) => {
    try {
      await api.updateEstadoCompra(ordenId, nuevoEstado);
      toast({ title: 'Estado actualizado' });
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleVerDetalle = async (orden: any) => {
    try {
      const detalles = await api.getCompra(orden.id);
      setDetalleModal({ open: true, orden: detalles });
    } catch {
      setDetalleModal({ open: true, orden });
    }
  };

  const handleCrearProveedor = async () => {
    /*
      Crear proveedor desde Compras (modal).
      Relacionado con backend `check-in-back/src/routes/proveedores.js` (POST `/api/proveedores`).
      Nota: el backend normaliza opcionales a null, pero aquí enviamos strings vacíos como null para mantener DB limpia.
    */
    const nombre = (newProveedor.nombre || '').trim();
    if (!nombre) {
      toast({ title: 'Nombre requerido', description: 'Ingrese el nombre del proveedor', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        nombre,
        rfc: newProveedor.rfc?.trim() || null,
        contacto: newProveedor.contacto?.trim() || null,
        telefono: newProveedor.telefono?.trim() || null,
        email: newProveedor.email?.trim() || null,
      };

      const creado = await api.createProveedor(payload);
      setProveedores(prev => [...prev, creado].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))));
      toast({ title: 'Proveedor creado', description: nombre });
      setIsNewProveedorOpen(false);
      setNewProveedor({ nombre: '', rfc: '', contacto: '', telefono: '', email: '' });
      // No forzamos recarga total para mantener UX rápida; igual queda consistente con el estado local.
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Órdenes de Compra" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Órdenes de Compra" 
      subtitle="Gestión de compras a proveedores"
    >
      <Tabs defaultValue="ordenes">
        {/*
          Tabs responsivas: evitamos overflow horizontal global (en este caso son solo 2 pestañas).
          Relacionado con `Check-In-Front/src/index.css` que fuerza `overflow-x: hidden` y puede "cortar" elementos que desbordan.
          Relacionado con `Check-In-Front/src/pages/Compras.tsx` (vista principal de Compras).
        */}
        <div className="w-full pb-2 mb-4">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-max">
            <TabsTrigger value="ordenes">Órdenes de Compra</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ordenes">
          {/*
            En tablets (ej. iPad ~820px) 4 columnas recortan el contenido.
            Usamos 2 columnas hasta `lg` para evitar cortes.
          */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{ordenes.length}</p>
                    <p className="text-sm text-muted-foreground truncate">Total Órdenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{ordenesActivas}</p>
                    <p className="text-sm text-muted-foreground truncate">En Proceso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Truck className="h-5 w-5 text-info" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{ordenes.filter(o => o.estado === 'EnTransito').length}</p>
                    <p className="text-sm text-muted-foreground truncate">En Tránsito</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <DollarSign className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold truncate">${totalPendiente.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground truncate">Por Pagar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            {/*
              Toolbar responsiva:
              - Móvil + Tablet (<lg): stack para que nada se corte
              - Desktop (lg+): una fila
            */}
            <div className="flex flex-1 flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1 lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por número o proveedor..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* En móvil: Estado + Refrescar en la misma fila para ahorrar espacio */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="flex-1 lg:w-[160px]">
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
                <Button variant="outline" size="icon" onClick={cargarDatos} className="shrink-0">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={() => setIsNewOrderOpen(true)} className="w-full sm:w-auto justify-center">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </div>

          <Card>
            {/*
              En móvil, una tabla con scroll se siente incómoda: mostramos cards.
              En tablets (iPad) también preferimos cards: la tabla suele recortarse por ancho.
              Tabla solo en `lg+` (mejor densidad y caben todas las columnas).
            */}
            <div className="block lg:hidden">
              <div className="divide-y">
                {filteredOrdenes.map((orden) => {
                  const numero = orden.numero || orden.codigo || `OC-${orden.id}`;
                  const provNombre = orden.proveedor?.nombre || orden.proveedor_nombre || '-';
                  const fecha = orden.fecha || orden.created_at;
                  const itemsCount = orden.items?.length || orden.items_count || 0;
                  return (
                    <div key={orden.id} className="p-4">
                      {/*
                        Header responsivo: `flex-wrap` para que el badge no se "corte" a la derecha.
                        Relacionado con `Check-In-Front/src/index.css` (overflow-x hidden a nivel global).
                      */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{numero}</p>
                          <p className="text-sm text-muted-foreground truncate">{provNombre}</p>
                        </div>
                        <Badge className={cn("flex items-center gap-1 shrink-0 max-w-full", getEstadoColor(orden.estado))}>
                          {getEstadoIcon(orden.estado)}
                          {orden.estado === 'EnTransito' ? 'En Tránsito' : orden.estado}
                        </Badge>
                      </div>
                      {/*
                        En móvil: evitamos que el botón compita en una grilla 2-cols (se recortaba).
                        Mostramos info en grilla y el CTA en fila completa.
                      */}
                      <div className="mt-3 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Fecha</p>
                            <p className="font-medium">{fecha ? format(new Date(fecha), "d MMM yyyy", { locale: es }) : '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-bold">${Number(orden.total || 0).toLocaleString()}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Items</p>
                            <p className="font-medium">{itemsCount} productos</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleVerDetalle(orden)} className="w-full justify-center">
                          <Eye className="mr-2 h-4 w-4" /> Ver detalle
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredOrdenes.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay órdenes de compra
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block relative w-full overflow-x-auto touch-pan-x overscroll-x-contain">
              <Table className="min-w-[900px]">
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
                  {filteredOrdenes.map(orden => {
                    const numero = orden.numero || orden.codigo || `OC-${orden.id}`;
                    const provNombre = orden.proveedor?.nombre || orden.proveedor_nombre || '-';
                    const provContacto = orden.proveedor?.contacto || orden.proveedor_contacto || '';
                    const fecha = orden.fecha || orden.created_at;
                    const itemsCount = orden.items?.length || orden.items_count || 0;
                    return (
                      <TableRow key={orden.id}>
                        <TableCell className="font-medium">{numero}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{provNombre}</p>
                            {provContacto && <p className="text-xs text-muted-foreground">{provContacto}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{fecha ? format(new Date(fecha), "d MMM yyyy", { locale: es }) : '-'}</p>
                            {orden.fecha_entrega && (
                              <p className="text-xs text-muted-foreground">
                                Entrega: {format(new Date(orden.fecha_entrega), "d MMM", { locale: es })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {itemsCount} productos
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("flex items-center gap-1 w-fit", getEstadoColor(orden.estado))}>
                            {getEstadoIcon(orden.estado)}
                            {orden.estado === 'EnTransito' ? 'En Tránsito' : orden.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${Number(orden.total || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleVerDetalle(orden)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver detalle
                              </DropdownMenuItem>
                              {orden.estado === 'Borrador' && (
                                <DropdownMenuItem onClick={() => handleUpdateEstado(orden.id, 'Enviada')}>
                                  <Clock className="mr-2 h-4 w-4" /> Enviar orden
                                </DropdownMenuItem>
                              )}
                              {orden.estado === 'Enviada' && (
                                <DropdownMenuItem onClick={() => handleUpdateEstado(orden.id, 'Confirmada')}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar
                                </DropdownMenuItem>
                              )}
                              {orden.estado === 'Confirmada' && (
                                <DropdownMenuItem onClick={() => handleUpdateEstado(orden.id, 'EnTransito')}>
                                  <Truck className="mr-2 h-4 w-4" /> Marcar en tránsito
                                </DropdownMenuItem>
                              )}
                              {orden.estado === 'EnTransito' && (
                                <DropdownMenuItem onClick={() => handleUpdateEstado(orden.id, 'Recibida')}>
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
                    );
                  })}
                  {filteredOrdenes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay órdenes de compra
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores">
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar proveedor..." className="pl-9" />
            </div>
            <Button onClick={() => setIsNewProveedorOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proveedores.map(prov => (
              <Card key={prov.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{prov.nombre}</h3>
                      <p className="text-sm text-muted-foreground">{prov.rfc || ''}</p>
                      <Separator className="my-2" />
                      <div className="space-y-1 text-sm">
                        {prov.contacto && <p><span className="text-muted-foreground">Contacto:</span> {prov.contacto}</p>}
                        {prov.telefono && <p><span className="text-muted-foreground">Tel:</span> {prov.telefono}</p>}
                        {prov.email && <p><span className="text-muted-foreground">Email:</span> {prov.email}</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {proveedores.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No hay proveedores registrados
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Order Dialog */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        {/* Modal responsive (móvil): ancho casi completo + scroll vertical */}
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Nueva Orden de Compra
            </DialogTitle>
            <DialogDescription>
              Complete la información de la orden de compra
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <ComboboxCreatable
                options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                value={selectedProveedor}
                onValueChange={setSelectedProveedor}
                onCreate={async (nombre) => {
                  try {
                    const newProv = await api.createProveedor({ nombre });
                    setProveedores([...proveedores, newProv]);
                    toast({ title: 'Proveedor creado' });
                    return { value: newProv.id, label: newProv.nombre };
                  } catch (e: any) {
                    toast({ title: 'Error', description: e.message, variant: 'destructive' });
                  }
                }}
                placeholder="Seleccionar proveedor..."
                searchPlaceholder="Buscar o crear proveedor..."
                createLabel="Crear proveedor"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              
              <div className="space-y-2">
                {orderItems.map((item, idx) => {
                  const productoOptions: ComboboxOption[] = productos.map(p => ({
                    value: p.id,
                    label: p.nombre
                  }));

                  return (
                    /*
                      Layout responsivo para cada renglón:
                      - Móvil: apilado (Producto / Cantidad+Precio / eliminar)
                      - >= sm: grilla 12 columnas (como antes, pero con anchos seguros)
                      Relacionado con `Check-In-Front/src/pages/Compras.tsx` (Modal "Nueva Orden de Compra").
                    */
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-6 min-w-0">
                        <p className="sm:hidden text-xs text-muted-foreground mb-1">Producto</p>
                        <ComboboxCreatable
                          options={productoOptions}
                          value={item.producto_id}
                          onValueChange={(val) => {
                            const newItems = [...orderItems];
                            const prod = productos.find(p => p.id === val);
                            newItems[idx].producto_id = val;
                            newItems[idx].producto_nombre = prod?.nombre || val;
                            if (prod?.precio_compra) {
                              newItems[idx].precio = String(prod.precio_compra);
                            }
                            setOrderItems(newItems);
                          }}
                          onCreate={async (nombre) => {
                            try {
                              const newProd = await api.createProducto({ nombre, stock_actual: 0 });
                              setProductos([...productos, newProd]);
                              toast({ title: 'Producto creado' });
                              return { value: newProd.id, label: newProd.nombre };
                            } catch (e: any) {
                              toast({ title: 'Error', description: e.message, variant: 'destructive' });
                            }
                          }}
                          placeholder="Seleccionar producto..."
                          searchPlaceholder="Buscar o crear producto..."
                          createLabel="Crear producto"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:contents">
                        <div className="sm:col-span-2">
                          <p className="sm:hidden text-xs text-muted-foreground mb-1">Cantidad</p>
                          <Input 
                            placeholder="Cant." 
                            type="number"
                            inputMode="decimal"
                            className="w-full sm:col-span-2"
                            value={item.cantidad}
                            onChange={(e) => {
                              const newItems = [...orderItems];
                              newItems[idx].cantidad = e.target.value;
                              setOrderItems(newItems);
                            }}
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <p className="sm:hidden text-xs text-muted-foreground mb-1">Precio</p>
                          <Input 
                            placeholder="Precio" 
                            type="number"
                            inputMode="decimal"
                            className="w-full sm:col-span-3"
                            value={item.precio}
                            onChange={(e) => {
                              const newItems = [...orderItems];
                              newItems[idx].precio = e.target.value;
                              setOrderItems(newItems);
                            }}
                          />
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="sm:col-span-1 justify-self-end"
                        onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                        disabled={orderItems.length === 1}
                        aria-label="Eliminar producto"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea 
                placeholder="Notas adicionales para el proveedor..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            {/* Footer responsivo: botones full-width en móvil */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full">
              <Button variant="outline" onClick={() => setIsNewOrderOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleCreateOrder} className="w-full sm:w-auto">
                Crear Orden
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle Modal */}
      <Dialog open={detalleModal.open} onOpenChange={(open) => setDetalleModal({ open, orden: open ? detalleModal.orden : null })}>
        {/* Modal responsive (móvil): ancho casi completo + scroll vertical */}
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle de Orden {detalleModal.orden?.numero || detalleModal.orden?.codigo || ''}
            </DialogTitle>
            <DialogDescription>
              Información completa de la orden de compra
            </DialogDescription>
          </DialogHeader>
          {detalleModal.orden && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{detalleModal.orden.proveedor?.nombre || detalleModal.orden.proveedor_nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={getEstadoColor(detalleModal.orden.estado)}>{detalleModal.orden.estado}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {detalleModal.orden.fecha || detalleModal.orden.created_at
                      ? format(new Date(detalleModal.orden.fecha || detalleModal.orden.created_at), "d MMMM yyyy", { locale: es })
                      : '-'}
                  </p>
                </div>
                <div>
                  {/*
                    Desglose financiero para evitar confusión "dos totales" (ej. subtotal de items vs total con impuestos).
                    Relacionado con `check-in-back/src/routes/compras.js` (campos: subtotal, impuestos, total) y consumido por `GET /api/compras/:id`.
                  */}
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">${Number(detalleModal.orden.subtotal || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-2">Impuestos</p>
                  <p className="font-medium">${Number(detalleModal.orden.impuestos || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-2">Total</p>
                  <p className="font-bold text-lg">${Number(detalleModal.orden.total || 0).toLocaleString()}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Productos</p>
               {detalleModal.orden.detalle && detalleModal.orden.detalle.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>P. Unitario</TableHead>
                        {/* El subtotal del renglón NO incluye impuestos (los impuestos se muestran en el encabezado del modal). */}
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
            {detalleModal.orden.detalle.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                      <TableCell>{item.producto_nombre || item.producto || item.nombre}</TableCell>
                          <TableCell>{item.cantidad}</TableCell>
                          <TableCell>${Number(item.precio_unitario || item.precioUnitario || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${Number(item.subtotal || (item.cantidad * item.precio_unitario) || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No hay productos registrados</p>
                )}
              </div>
              {detalleModal.orden.notas && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p>{detalleModal.orden.notas}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nuevo Proveedor Dialog */}
      <Dialog open={isNewProveedorOpen} onOpenChange={setIsNewProveedorOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Nuevo Proveedor
            </DialogTitle>
            <DialogDescription>
              Registre un proveedor para usarlo en Órdenes de Compra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={newProveedor.nombre}
                onChange={(e) => setNewProveedor(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej. Alimentos del Pacífico"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>RFC</Label>
                <Input
                  value={newProveedor.rfc}
                  onChange={(e) => setNewProveedor(prev => ({ ...prev, rfc: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label>Contacto</Label>
                <Input
                  value={newProveedor.contacto}
                  onChange={(e) => setNewProveedor(prev => ({ ...prev, contacto: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={newProveedor.telefono}
                  onChange={(e) => setNewProveedor(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={newProveedor.email}
                  onChange={(e) => setNewProveedor(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProveedorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearProveedor}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
