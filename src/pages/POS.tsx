import { useState, useEffect } from 'react';
import {
  ShoppingCart, Minus, Plus, Trash2,
  Building2, Search, RefreshCw, Loader2, PackageOpen
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { MetodoPagoSelect } from '@/components/MetodoPagoSelect';

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
  const [processingMethod, setProcessingMethod] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');

  const [productos, setProductos] = useState<any[]>([]);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodsData, habsData, reservasData] = await Promise.all([
        api.getProductos(),
        api.getHabitaciones({ estado_habitacion: 'Ocupada' }),
        api.getReservas(),
      ]);

      const reservasActivas = (Array.isArray(reservasData) ? reservasData : [])
        .filter(r => ['CheckIn', 'Hospedado'].includes(r.estado) && !r.checkout_realizado);

      const habitacionesConReserva = (Array.isArray(habsData) ? habsData : [])
        .filter(h => h.estado_habitacion === 'Ocupada')
        .map(hab => {
          const reservaActiva = reservasActivas.find(r => r.habitacion_id === hab.id);
          return {
            ...hab,
            reserva_id: reservaActiva?.id || null,
            cliente_nombre: reservaActiva?.cliente_nombre || null,
          };
        });

      setProductos((Array.isArray(prodsData) ? prodsData : []).filter((producto) => producto.activo !== false));
      setHabitaciones(habitacionesConReserva.filter((habitacion) => Boolean(habitacion.reserva_id)));
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const categoryNames = ['all', ...new Set(productos.map(p => p.categoria_nombre || p.categoria).filter(Boolean))];

  const filteredProducts = productos.filter(p => {
    const query = searchQuery.trim().toLowerCase();
    const searchable = `${p.nombre || ''} ${p.codigo || ''} ${p.categoria_nombre || p.categoria || ''}`.toLowerCase();
    const matchSearch = !query || searchable.includes(query);
    const matchCategory = activeCategory === 'all' || (p.categoria_nombre || p.categoria) === activeCategory;
    return matchSearch && matchCategory;
  });

  const addToCart = (producto: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id === producto.id);
      if (existing) {
        if (existing.cantidad >= safeNumber(producto.stock_actual)) return prev;
        return prev.map(item =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      if (safeNumber(producto.stock_actual) <= 0) return prev;
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

  const subtotal = cart.reduce((sum, item) => {
    const precio = parseFloat(String(item.producto.precio_venta)) || 0;
    const cantidad = parseInt(String(item.cantidad)) || 0;
    return sum + (precio * cantidad);
  }, 0);
  const impuestos = 0;
  const total = Math.round(subtotal * 100) / 100;
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = parseFloat(String(value));
    return isNaN(num) ? defaultValue : num;
  };

  const handlePayment = async (method: string) => {
    if (processingMethod) return;
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Carrito vacío', description: 'Agrega productos para continuar.' });
      return;
    }
    if (method === 'Cargo a habitación' && (!selectedRoom || selectedRoom === 'direct')) {
      toast({ variant: 'destructive', title: 'Selecciona una habitación', description: 'Elige una habitación ocupada para cargar el consumo.' });
      return;
    }

    setProcessingMethod(method);
    try {
      const ventaItems = cart.map(item => {
        const precio = safeNumber(item.producto.precio_venta, 0);
        const cantidad = safeNumber(item.cantidad, 1);
        const itemTotal = Math.round(precio * cantidad * 100) / 100;
        return {
          producto_id: item.producto.id || '',
          nombre: item.producto.nombre || 'Producto',
          cantidad,
          precio_unitario: precio,
          subtotal: itemTotal,
        };
      });

      const ventaSubtotal = safeNumber(subtotal, 0);
      const ventaImpuestos = safeNumber(impuestos, 0);
      const ventaTotal = safeNumber(total, 0);
      const habitacionSeleccionada = habitaciones.find(h => h.id === selectedRoom);
      const isRoomCharge = method === 'Cargo a habitación';
      const reservaId = isRoomCharge ? habitacionSeleccionada?.reserva_id || null : null;

      await api.createVenta({
        folio: `POS-${Date.now()}`,
        detalles: ventaItems,
        subtotal: ventaSubtotal,
        impuestos: ventaImpuestos,
        total: ventaTotal,
        metodo_pago: method,
        reserva_id: reservaId,
        habitacion_id: isRoomCharge ? selectedRoom : null,
        motivo: isRoomCharge ? 'Consumo registrado desde Punto de Venta' : null,
      });

      const habNumero = habitacionSeleccionada?.numero;
      toast({
        title: 'Venta completada',
        description: `${formatCurrency(ventaTotal)} · ${method}${habNumero ? ` · Hab. ${habNumero}` : ''}`,
      });
      setCart([]);
      setSelectedRoom('');
      await cargarDatos();
    } catch (error: any) {
      console.error('Error general:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingMethod(null);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Punto de Venta" subtitle="Ventas y cargos a habitación">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border bg-muted/30" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Punto de Venta" subtitle="Ventas rápidas y cargos a habitación">
      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar por producto, código o categoría..."
                className="h-10 pl-9 pr-3"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-10 shrink-0" onClick={cargarDatos}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-3">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex h-9 min-w-max justify-start rounded-lg bg-muted/70 p-1">
                <TabsTrigger className="h-7 px-3 text-xs" value="all">Todos</TabsTrigger>
                {categoryNames.filter(c => c !== 'all').map(cat => (
                  <TabsTrigger className="h-7 px-3 text-xs" key={String(cat)} value={String(cat)}>{String(cat)}</TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredProducts.length} productos</span>
            <span>Toca un producto para agregarlo</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 text-center">
              <PackageOpen className="mb-3 h-9 w-9 text-muted-foreground/50" />
              <p className="font-medium">No encontramos productos</p>
              <p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map(producto => {
                const stock = parseInt(String(producto.stock_actual)) || 0;
                const inCart = cart.find(item => item.producto.id === producto.id)?.cantidad || 0;
                return (
                  <button
                    type="button"
                    key={producto.id}
                    onClick={() => addToCart(producto)}
                    disabled={stock <= 0 || inCart >= stock}
                    className="group relative min-h-[104px] rounded-xl border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {inCart > 0 && (
                      <Badge className="absolute right-2 top-2 h-5 min-w-5 justify-center px-1.5 text-[10px]">{inCart}</Badge>
                    )}
                    <p className="pr-7 text-sm font-semibold leading-snug line-clamp-2">{producto.nombre}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{producto.categoria_nombre || producto.categoria || 'General'}</p>
                    <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                      <span className="text-sm font-bold text-primary">{formatCurrency(producto.precio_venta)}</span>
                      <span className={`text-[10px] ${stock <= 3 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                        Stock {stock}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <Card className="flex min-h-[420px] flex-col overflow-hidden xl:sticky xl:top-0 xl:max-h-[calc(100dvh-8.5rem)]">
          <CardHeader className="border-b p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Venta actual
              <Badge variant="secondary" className="ml-auto">{totalItems} artículos</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="border-b p-3">
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="h-10">
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Venta directa o habitación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Venta directa</SelectItem>
                  {habitaciones.map(hab => (
                    <SelectItem key={hab.id} value={hab.id}>
                      Hab. {hab.numero}{hab.cliente_nombre ? ` · ${hab.cliente_nombre}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="min-h-[160px] flex-1 px-3">
              {cart.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center text-center text-muted-foreground">
                  <ShoppingCart className="mb-2 h-8 w-8 opacity-25" />
                  <p className="text-sm font-medium text-foreground">Todavía no hay productos</p>
                  <p className="mt-1 max-w-48 text-xs">Selecciona productos del catálogo para iniciar la venta.</p>
                </div>
              ) : (
                <div className="divide-y py-1">
                  {cart.map(item => (
                    <div key={item.producto.id} className="flex items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.producto.precio_venta)} c/u</p>
                      </div>
                      <div className="flex shrink-0 items-center rounded-lg border bg-background">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => updateQuantity(item.producto.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.cantidad}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" disabled={item.cantidad >= safeNumber(item.producto.stock_actual)} onClick={() => updateQuantity(item.producto.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.producto.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="mt-auto border-t bg-muted/10 p-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {impuestos > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Impuestos</span>
                    <span>{formatCurrency(impuestos)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex items-end justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold tracking-tight text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <MetodoPagoSelect value={paymentMethod} onChange={setPaymentMethod} placeholder="Forma de pago configurada" />
                <Button className="h-11 w-full" disabled={cart.length === 0 || Boolean(processingMethod) || !paymentMethod} onClick={() => handlePayment(paymentMethod)}>
                  {processingMethod && processingMethod !== 'Cargo a habitación' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                  Cobrar {formatCurrency(total)}
                </Button>
              </div>

              {selectedRoom && selectedRoom !== 'direct' && (
                <Button
                  variant="secondary"
                  className="mt-2 h-11 w-full"
                  disabled={cart.length === 0 || Boolean(processingMethod)}
                  onClick={() => handlePayment('Cargo a habitación')}
                >
                  {processingMethod === 'Cargo a habitación' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
                  Cargar a habitación
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
