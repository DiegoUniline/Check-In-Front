import { useState, useEffect } from 'react';
import { 
  Search, Calendar, DollarSign, 
  ArrowDownCircle, ArrowUpCircle, CreditCard, Banknote,
  Receipt, Download, BedDouble, ShoppingCart,
  Users, RefreshCw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Transaccion {
  id: string;
  fecha: string;
  tipo: 'Ingreso' | 'Egreso';
  categoria: string;
  concepto: string;
  referencia?: string;
  monto: number;
  metodoPago: string;
  usuario: string;
  cliente?: string;
  habitacion?: string;
}

export default function Historial() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterMetodo, setFilterMetodo] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; transaccion: Transaccion | null }>({ open: false, transaccion: null });

  useEffect(() => {
    cargarTransacciones();
  }, [dateRange]);

  const cargarTransacciones = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let fechaDesde: Date, fechaHasta: Date;
      
      switch (dateRange) {
        case 'today':
          fechaDesde = startOfDay(now);
          fechaHasta = endOfDay(now);
          break;
        case 'week':
          fechaDesde = startOfWeek(now, { locale: es });
          fechaHasta = endOfWeek(now, { locale: es });
          break;
        case 'month':
          fechaDesde = startOfMonth(now);
          fechaHasta = endOfMonth(now);
          break;
        default:
          fechaDesde = startOfDay(now);
          fechaHasta = endOfDay(now);
      }

      const params: Record<string, string> = {
        fecha_desde: fechaDesde.toISOString().split('T')[0],
        fecha_hasta: fechaHasta.toISOString().split('T')[0],
      };

      // Try to load from transacciones endpoint, fallback to pagos + gastos
      let data: any[] = [];
      try {
        data = await api.getTransacciones(params);
      } catch {
        /*
          Fallback: no existe `/transacciones` en el backend actual.
          Por eso consolidamos desde endpoints existentes.
          Relacionado con:
          - `check-in-back/src/routes/pagos.js` -> `GET /api/pagos`
          - `check-in-back/src/routes/gastos.js` -> `GET /api/gastos`
          - `check-in-back/src/routes/compras.js` -> `GET /api/compras` (para que el módulo Compras también aparezca en Historial)
        */
        const [pagos, gastos, compras] = await Promise.all([
          api.getPagos(params).catch(() => []),
          api.getGastos(params).catch(() => []),
          api.getCompras(params).catch(() => [])
        ]);

        const pagosTransformed = (pagos || []).map((p: any) => ({
          id: p.id,
          fecha: p.fecha || p.created_at,
          tipo: 'Ingreso' as const,
          categoria: p.concepto?.includes('Check') ? 'Hospedaje' : (p.concepto?.includes('POS') ? 'POS' : 'Servicio'),
          concepto: p.concepto || 'Pago',
          referencia: p.reserva_id ? `RES-${p.reserva_id}` : undefined,
          monto: Number(p.monto) || 0,
          metodoPago: p.metodo_pago || 'Efectivo',
          usuario: p.usuario_nombre || 'Sistema',
          cliente: p.cliente_nombre,
          habitacion: p.habitacion_numero,
        }));

        const gastosTransformed = (gastos || []).map((g: any) => ({
          id: g.id,
          fecha: g.fecha || g.created_at,
          tipo: 'Egreso' as const,
          categoria: 'Gasto',
          concepto: g.descripcion || 'Gasto',
          monto: Number(g.monto) || 0,
          metodoPago: g.metodo_pago || 'Efectivo',
          usuario: g.usuario_nombre || 'Admin',
        }));

        const comprasTransformed = (compras || []).map((c: any) => ({
          id: c.id,
          fecha: c.fecha || c.created_at,
          tipo: 'Egreso' as const,
          categoria: 'Compra',
          concepto: c.proveedor_nombre ? `Compra - ${c.proveedor_nombre}` : 'Compra',
          referencia: c.folio_factura ? `FAC-${c.folio_factura}` : (c.numero ? `OC-${c.numero}` : undefined),
          // Importante: para compras, el "monto" debe reflejar el total real (incluyendo impuestos si aplican).
          monto: Number(c.total) || 0,
          // Si el backend no guarda método de pago en compras, usamos un default para no romper filtros.
          metodoPago: c.metodo_pago || 'Efectivo',
          usuario: c.usuario_nombre || 'Sistema',
        }));

        data = [...pagosTransformed, ...gastosTransformed, ...comprasTransformed].sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
      }

      setTransacciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las transacciones', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransacciones = transacciones.filter(t => {
    const matchSearch = t.concepto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.referencia?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.cliente?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTipo = filterTipo === 'all' || t.tipo === filterTipo;
    const matchCategoria = filterCategoria === 'all' || t.categoria === filterCategoria;
    const matchMetodo = filterMetodo === 'all' || t.metodoPago === filterMetodo;
    return matchSearch && matchTipo && matchCategoria && matchMetodo;
  });

  const totalIngresos = transacciones.filter(t => t.tipo === 'Ingreso').reduce((s, t) => s + t.monto, 0);
  const totalEgresos = transacciones.filter(t => t.tipo === 'Egreso').reduce((s, t) => s + t.monto, 0);
  const balance = totalIngresos - totalEgresos;

  const getCategoriaIcon = (cat: string) => {
    switch(cat) {
      case 'Hospedaje': return <BedDouble className="h-4 w-4" />;
      case 'POS': return <ShoppingCart className="h-4 w-4" />;
      case 'Servicio': return <Receipt className="h-4 w-4" />;
      case 'Gasto': return <ArrowUpCircle className="h-4 w-4" />;
      case 'Compra': return <ShoppingCart className="h-4 w-4" />;
      case 'Reembolso': return <ArrowUpCircle className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getCategoriaColor = (cat: string) => {
    switch(cat) {
      case 'Hospedaje': return 'bg-primary';
      case 'POS': return 'bg-info';
      case 'Servicio': return 'bg-success';
      case 'Gasto': return 'bg-warning text-warning-foreground';
      case 'Compra': return 'bg-purple-500';
      case 'Reembolso': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const handleVerDetalle = async (trans: Transaccion) => {
    try {
      const detalles = await api.getTransaccion(trans.id);
      setDetalleModal({ open: true, transaccion: { ...trans, ...detalles } });
    } catch {
      setDetalleModal({ open: true, transaccion: trans });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Historial de Transacciones" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Historial de Transacciones" 
      subtitle="Registro completo de movimientos financieros"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <ArrowDownCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">${totalIngresos.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Ingresos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">${totalEgresos.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Egresos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", balance >= 0 ? 'text-success' : 'text-destructive')}>
                  ${balance.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Balance</p>
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
                <p className="text-2xl font-bold">{transacciones.length}</p>
                <p className="text-sm text-muted-foreground">Transacciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por concepto, referencia o cliente..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Ingreso">Ingresos</SelectItem>
                <SelectItem value="Egreso">Egresos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Hospedaje">Hospedaje</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="Servicio">Servicios</SelectItem>
                <SelectItem value="Gasto">Gastos</SelectItem>
                <SelectItem value="Compra">Compras</SelectItem>
                <SelectItem value="Reembolso">Reembolsos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterMetodo} onValueChange={setFilterMetodo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Método pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Cargo Habitación">Cargo Habitación</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={cargarTransacciones}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransacciones.map(trans => (
              <TableRow 
                key={trans.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleVerDetalle(trans)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{trans.fecha ? format(new Date(trans.fecha), "d MMM yyyy", { locale: es }) : '-'}</p>
                    <p className="text-xs text-muted-foreground">{trans.fecha ? format(new Date(trans.fecha), "HH:mm") : ''}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={trans.tipo === 'Ingreso' ? 'default' : 'destructive'}>
                    {trans.tipo === 'Ingreso' ? (
                      <ArrowDownCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                    )}
                    {trans.tipo}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("flex items-center gap-1 w-fit", getCategoriaColor(trans.categoria))}>
                    {getCategoriaIcon(trans.categoria)}
                    {trans.categoria}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{trans.concepto}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {trans.referencia && <span>Ref: {trans.referencia}</span>}
                      {trans.cliente && <span>• {trans.cliente}</span>}
                      {trans.habitacion && <span>• Hab {trans.habitacion}</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    {trans.metodoPago === 'Efectivo' && <Banknote className="h-3 w-3" />}
                    {trans.metodoPago === 'Tarjeta' && <CreditCard className="h-3 w-3" />}
                    {trans.metodoPago}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{trans.usuario}</span>
                  </div>
                </TableCell>
                <TableCell className={cn(
                  "text-right font-bold",
                  trans.tipo === 'Ingreso' ? 'text-success' : 'text-destructive'
                )}>
                  {trans.tipo === 'Ingreso' ? '+' : '-'}${trans.monto.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {filteredTransacciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay transacciones en el período seleccionado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {filteredTransacciones.length} de {transacciones.length} transacciones
      </p>

      {/* Detalle Modal */}
      <Dialog open={detalleModal.open} onOpenChange={(open) => setDetalleModal({ open, transaccion: open ? detalleModal.transaccion : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalle de Transacción
            </DialogTitle>
            <DialogDescription>
              Información completa del movimiento
            </DialogDescription>
          </DialogHeader>
          {detalleModal.transaccion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {detalleModal.transaccion.fecha
                      ? format(new Date(detalleModal.transaccion.fecha), "d MMMM yyyy HH:mm", { locale: es })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant={detalleModal.transaccion.tipo === 'Ingreso' ? 'default' : 'destructive'}>
                    {detalleModal.transaccion.tipo}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Concepto</p>
                <p className="font-medium">{detalleModal.transaccion.concepto}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className={cn(
                    "font-bold text-lg",
                    detalleModal.transaccion.tipo === 'Ingreso' ? 'text-success' : 'text-destructive'
                  )}>
                    {detalleModal.transaccion.tipo === 'Ingreso' ? '+' : '-'}${detalleModal.transaccion.monto.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <Badge className={getCategoriaColor(detalleModal.transaccion.categoria)}>
                    {detalleModal.transaccion.categoria}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  <Badge variant="outline">{detalleModal.transaccion.metodoPago}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuario</p>
                  <p className="font-medium">{detalleModal.transaccion.usuario}</p>
                </div>
              </div>
              {detalleModal.transaccion.referencia && (
                <div>
                  <p className="text-sm text-muted-foreground">Referencia</p>
                  <p className="font-medium">{detalleModal.transaccion.referencia}</p>
                </div>
              )}
              {detalleModal.transaccion.cliente && (
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{detalleModal.transaccion.cliente}</p>
                </div>
              )}
              {detalleModal.transaccion.habitacion && (
                <div>
                  <p className="text-sm text-muted-foreground">Habitación</p>
                  <p className="font-medium">{detalleModal.transaccion.habitacion}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}