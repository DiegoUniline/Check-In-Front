import { useState } from 'react';
import { 
  ShoppingCart, Minus, Plus, Trash2, CreditCard, 
  Banknote, Building2, Search
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
import { mockProductos, mockHabitaciones, Producto } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export default function POS() {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [...new Set(mockProductos.map(p => p.categoria))];
  
  const filteredProducts = mockProductos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === 'all' || p.categoria === activeCategory;
    return matchSearch && matchCategory;
  });

  const habitacionesOcupadas = mockHabitaciones.filter(h => h.estadoHabitacion === 'Ocupada');

  const addToCart = (producto: Producto) => {
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

  const subtotal = cart.reduce((sum, item) => sum + (item.producto.precioVenta * item.cantidad), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const handlePayment = (method: string) => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Carrito vacío', description: 'Agrega productos para continuar.' });
      return;
    }

    toast({
      title: '✅ Venta completada',
      description: `Total: $${total.toLocaleString()} - ${method}${selectedRoom ? ` - Hab. ${mockHabitaciones.find(h => h.id === selectedRoom)?.numero}` : ''}`,
    });
    setCart([]);
    setSelectedRoom('');
  };

  return (
    <MainLayout title="Punto de Venta" subtitle="Sistema de ventas y cargos a habitación">
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar producto..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categories.map(cat => (
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
                        {producto.categoria === 'Bebidas' ? '🥤' : 
                         producto.categoria === 'Snacks' ? '🍿' :
                         producto.categoria === 'Alimentos' ? '🍔' :
                         producto.categoria === 'Servicios' ? '🛎️' :
                         producto.categoria === 'Minibar' ? '🍷' : '📦'}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">{producto.nombre}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">${producto.precioVenta}</span>
                      <Badge variant="secondary" className="text-xs">
                        {producto.stockActual}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  {habitacionesOcupadas.map(hab => (
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
                          ${item.producto.precioVenta} × {item.cantidad}
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
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (16%)</span>
                <span>${iva.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${total.toLocaleString()}</span>
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