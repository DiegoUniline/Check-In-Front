import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Minus, Plus, Trash2, CreditCard, 
  Banknote, Building2, Search, RefreshCw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface CartItem {
  producto: any;
  cantidad: number;
}

export default function POS() {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [productos, setProductos] = useState<any[]>([]);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodsData, habsData, catsData] = await Promise.all([
        api.getProductos(),
        api.getHabitaciones({ estado_habitacion: 'Ocupada' }),
        api.getCategorias()
      ]);
      setProductos(Array.isArray(prodsData) ? prodsData : []);
      setHabitaciones(Array.isArray(habsData) ? habsData.filter(h => h.estado_habitacion === 'Ocupada') : []);
      setCategorias(Array.isArray(catsData) ? catsData : []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const categoryNames = ['all', ...new Set(productos.map(p => p.categoria_nombre || p.categoria).filter(Boolean))];
  
  const filteredProducts = productos.filter(p => {
    const matchSearch = p.nombre?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === 'all' || (p.categoria_nombre || p.categoria) === activeCategory;
    return matchSearch && matchCategory;
  });

  const addToCart = (producto: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id === producto.id);
      if (existing) {
        return prev.map(item => 
          item.producto.id === producto.id 
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const updateQuantity = (productoId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.producto.id === productoId) {
        const newQty = item.cantidad + delta;
        return newQty > 0 ? { ...item, cantidad: newQty } : item;
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const removeFromCart = (productoId: string) => {
    setCart(prev => prev.filter(item => item.producto.id !== productoId));
  };

  // Safely calculate totals - ensure numbers are valid
  const subtotal = cart.reduce((sum, item) => {
    const precio = parseFloat(String(item.producto.precio_venta)) || 0;
    const cantidad = parseInt(String(item.cantidad)) || 0;
    return sum + (precio * cantidad);
  }, 0);
  const iva = Math.round(subtotal * 0.16 * 100) / 100;
  const total = Math.round((subtotal + iva) * 100) / 100;

  // Format currency safely
  const formatCurrency = (value: number) => {
    const num = parseFloat(String(value)) || 0;
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  };

  // Sanitize number to prevent NaN
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = parseFloat(String(value));
    return isNaN(num) ? defaultValue : num;
  };

  const handlePayment = async (method: string) => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Carrito vacío', description: 'Agrega productos para continuar.' });
      return;
    }

    try {
      // Build items for sale - formato compatible con compras.js
      const ventaItems = cart.map(item => {
        const precio = safeNumber(item.producto.precio_venta, 0);
        const cantidad = safeNumber(item.cantidad, 1);
        const itemTotal = Math.round(precio * cantidad * 100) / 100;
        return {
          producto_id: item.producto.id || '',
          nombre: item.producto.nombre || 'Producto',
          cantidad: cantidad,
          precio_unitario: precio,
          subtotal: itemTotal,
          total: itemTotal, // algunos backends usan total en vez de subtotal
        };
      });

      // Calculate totals with sanitized values
      const ventaSubtotal = safeNumber(subtotal, 0);
      const ventaIva = safeNumber(iva, 0);
      const ventaTotal = safeNumber(total, 0);

      // Get habitacion info if selected
      const habitacionSeleccionada = habitaciones.find(h => h.id === selectedRoom);
      const reservaId = habitacionSeleccionada?.reserva_id || habitacionSeleccionada?.reserva_activa_id || null;

      // Preparar payload de venta
      const ventaPayload = {
        detalle: ventaItems,
        subtotal: ventaSubtotal,
        iva: ventaIva,
        total: ventaTotal,
        metodo_pago: method,
        habitacion_id: selectedRoom && selectedRoom !== 'direct' ? selectedRoom : null,
        reserva_id: reservaId,
        fecha: new Date().toISOString(),
      };

      console.log('📤 Enviando venta:', JSON.stringify(ventaPayload, null, 2));

      // Register sale first
      let ventaId: string | null = null;
      try {
        const ventaResponse = await api.createVenta(ventaPayload);
        console.log('📥 Respuesta venta:', ventaResponse);
        ventaId = ventaResponse?.id || ventaResponse?.venta_id || null;
        
        if (!ventaId) {
          console.warn('⚠️ Venta creada pero sin ID en respuesta');
        }
      } catch (ventaError: any) {
        console.error('❌ Error registrando venta:', ventaError);
        toast({ 
          title: 'Error en venta', 
          description: ventaError.message || 'No se pudo registrar la venta', 
          variant: 'destructive' 
        });
        return; // No continuar si falla la venta
      }

      // If charging to room - create cargos
      if (selectedRoom && selectedRoom !== 'direct' && reservaId) {
        console.log('💳 Creando cargos a habitación...');
        try {
          for (const item of cart) {
            const precio = safeNumber(item.producto.precio_venta, 0);
            const cantidad = safeNumber(item.cantidad, 1);
            const itemTotal = Math.round(precio * cantidad * 100) / 100;
            
            const cargoPayload = {
              habitacion_id: selectedRoom,
              reserva_id: reservaId,
              producto_id: item.producto.id || '',
              concepto: item.producto.nombre || 'Producto POS',
              descripcion: item.producto.nombre || 'Producto',
              cantidad: cantidad,
              precio_unitario: precio,
              total: itemTotal,
              venta_id: ventaId,
              fecha: new Date().toISOString(),
            };
            
            console.log('📤 Enviando cargo:', cargoPayload);
            const cargoResponse = await api.cargoHabitacion(cargoPayload);
            console.log('📥 Respuesta cargo:', cargoResponse);
          }
        } catch (cargoError: any) {
          console.error('❌ Error en cargo a habitación:', cargoError);
          toast({ 
            title: 'Cargo a habitación falló', 
            description: cargoError.message || 'Verifique el endpoint /api/cargos-habitacion', 
            variant: 'destructive' 
          });
        }
      }

      const habNumero = habitacionSeleccionada?.numero;
      toast({
        title: '✅ Venta completada',
        description: `Total: ${formatCurrency(ventaTotal)} - ${method}${habNumero ? ` - Hab. ${habNumero}` : ''}`,
      });
      setCart([]);
      setSelectedRoom('');
    } catch (error: any) {
      console.error('❌ Error general:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Punto de Venta" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Punto de Venta" subtitle="Sistema de ventas y cargos a habitación">
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col">
          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar producto..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={cargarDatos}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Categories */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categoryNames.filter(c => c !== 'all').map(cat => (
                <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(producto => (
                <Card 
                  key={producto.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
                  onClick={() => addToCart(producto)}
                >
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-2xl">
                        {(producto.categoria_nombre || producto.categoria) === 'Bebidas' ? '🥤' : 
                         (producto.categoria_nombre || producto.categoria) === 'Snacks' ? '🍿' :
                         (producto.categoria_nombre || producto.categoria) === 'Alimentos' ? '🍔' :
                         (producto.categoria_nombre || producto.categoria) === 'Servicios' ? '🛎️' :
                         (producto.categoria_nombre || producto.categoria) === 'Minibar' ? '🍷' : '📦'}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">{producto.nombre}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">{formatCurrency(producto.precio_venta)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {parseInt(String(producto.stock_actual)) || 0}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No hay productos disponibles
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Cart */}
        <Card className="w-[380px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrito
              {cart.length > 0 && (
                <Badge className="ml-auto">{cart.reduce((sum, i) => sum + i.cantidad, 0)}</Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-4 pt-0">
            {/* Room selector */}
            <div className="mb-4">
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Seleccionar habitación (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Venta directa</SelectItem>
                  {habitaciones.map(hab => (
                    <SelectItem key={hab.id} value={hab.id}>
                      Habitación {hab.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cart items */}
            <ScrollArea className="flex-1 -mx-4 px-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                  <p>Carrito vacío</p>
                  <p className="text-sm">Selecciona productos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.producto.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.producto.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.producto.precio_venta)} × {item.cantidad}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.producto.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.cantidad}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.producto.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.producto.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Totals */}
            <div className="pt-4 mt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (16%)</span>
                <span>{formatCurrency(iva)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button 
                className="h-12"
                onClick={() => handlePayment('Tarjeta')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Tarjeta
              </Button>
              <Button 
                variant="outline"
                className="h-12"
                onClick={() => handlePayment('Efectivo')}
              >
                <Banknote className="mr-2 h-4 w-4" />
                Efectivo
              </Button>
            </div>
            {selectedRoom && selectedRoom !== 'direct' && (
              <Button 
                variant="secondary"
                className="w-full mt-2 h-12"
                onClick={() => handlePayment('Cargo a habitación')}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Cargar a Habitación
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
