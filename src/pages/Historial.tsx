import { useState } from 'react';
import { 
  History, Search, Filter, Calendar, DollarSign, 
  ArrowDownCircle, ArrowUpCircle, CreditCard, Banknote,
  Receipt, FileText, Download, Eye, BedDouble, ShoppingCart,
  Users, Clock
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Transaccion {
  id: string;
  fecha: Date;
  tipo: 'Ingreso' | 'Egreso';
  categoria: 'Hospedaje' | 'POS' | 'Servicio' | 'Gasto' | 'Compra' | 'Reembolso';
  concepto: string;
  referencia?: string;
  monto: number;
  metodoPago: string;
  usuario: string;
  cliente?: string;
  habitacion?: string;
}

export default function Historial() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterMetodo, setFilterMetodo] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  // Mock transactions
  const [transacciones] = useState<Transaccion[]>([
    { id: '1', fecha: new Date(), tipo: 'Ingreso', categoria: 'Hospedaje', concepto: 'Check-in Reserva RES-2024-0125', referencia: 'RES-2024-0125', monto: 4500, metodoPago: 'Tarjeta', usuario: 'Carlos García', cliente: 'María López', habitacion: '302' },
    { id: '2', fecha: new Date(), tipo: 'Ingreso', categoria: 'POS', concepto: 'Venta Minibar', monto: 350, metodoPago: 'Cargo Habitación', usuario: 'Carlos García', habitacion: '201' },
    { id: '3', fecha: new Date(), tipo: 'Egreso', categoria: 'Gasto', concepto: 'Compra suministros limpieza', monto: 850, metodoPago: 'Efectivo', usuario: 'Admin' },
    { id: '4', fecha: new Date(Date.now() - 3600000), tipo: 'Ingreso', categoria: 'Hospedaje', concepto: 'Pago anticipado reserva', referencia: 'RES-2024-0130', monto: 2500, metodoPago: 'Transferencia', usuario: 'María López', cliente: 'Juan Pérez' },
    { id: '5', fecha: new Date(Date.now() - 3600000 * 2), tipo: 'Ingreso', categoria: 'Servicio', concepto: 'Room Service - Desayuno', monto: 280, metodoPago: 'Efectivo', usuario: 'Carlos García', habitacion: '405' },
    { id: '6', fecha: new Date(Date.now() - 3600000 * 3), tipo: 'Egreso', categoria: 'Compra', concepto: 'Orden de compra OC-2024-004', referencia: 'OC-2024-004', monto: 2366, metodoPago: 'Transferencia', usuario: 'Admin' },
    { id: '7', fecha: new Date(Date.now() - 86400000), tipo: 'Ingreso', categoria: 'Hospedaje', concepto: 'Check-out liquidación', referencia: 'RES-2024-0118', monto: 8750, metodoPago: 'Tarjeta', usuario: 'María López', cliente: 'Roberto Sánchez', habitacion: '501' },
    { id: '8', fecha: new Date(Date.now() - 86400000), tipo: 'Ingreso', categoria: 'POS', concepto: 'Venta Restaurante', monto: 1450, metodoPago: 'Efectivo', usuario: 'Carlos García' },
    { id: '9', fecha: new Date(Date.now() - 86400000), tipo: 'Egreso', categoria: 'Reembolso', concepto: 'Reembolso parcial por incidencia', referencia: 'RES-2024-0115', monto: 500, metodoPago: 'Tarjeta', usuario: 'Admin', cliente: 'Ana Martínez' },
    { id: '10', fecha: new Date(Date.now() - 86400000 * 2), tipo: 'Ingreso', categoria: 'Servicio', concepto: 'Lavandería Express', monto: 450, metodoPago: 'Cargo Habitación', usuario: 'Carlos García', habitacion: '302' },
  ]);

  const filteredTransacciones = transacciones.filter(t => {
    const matchSearch = t.concepto.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.referencia?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.cliente?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTipo = filterTipo === 'all' || t.tipo === filterTipo;
    const matchCategoria = filterCategoria === 'all' || t.categoria === filterCategoria;
    const matchMetodo = filterMetodo === 'all' || t.metodoPago === filterMetodo;
    return matchSearch && matchTipo && matchCategoria && matchMetodo;
  });

  // Stats
  const totalIngresos = transacciones.filter(t => t.tipo === 'Ingreso').reduce((s, t) => s + t.monto, 0);
  const totalEgresos = transacciones.filter(t => t.tipo === 'Egreso').reduce((s, t) => s + t.monto, 0);
  const balance = totalIngresos - totalEgresos;

  const getCategoriaIcon = (cat: string) => {
    switch(cat) {
      case 'Hospedaje': return <BedDouble className="h-4 w-4" />;
      case 'POS': return <ShoppingCart className="h-4 w-4" />;
      case 'Servicio': return <Receipt className="h-4 w-4" />;
      case 'Gasto': return <ArrowUpCircle className="h-4 w-4" />;
      case 'Compra': return <FileText className="h-4 w-4" />;
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

  return (
    <MainLayout 
      title="Historial de Transacciones" 
      subtitle="Registro completo de movimientos financieros"
    >
      {/* Stats */}
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

      {/* Filters */}
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
                <SelectItem value="custom">Personalizado</SelectItem>
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

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
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
              <TableRow key={trans.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div>
                    <p className="font-medium">{format(trans.fecha, "d MMM yyyy", { locale: es })}</p>
                    <p className="text-xs text-muted-foreground">{format(trans.fecha, "HH:mm")}</p>
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
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {filteredTransacciones.length} de {transacciones.length} transacciones
      </p>
    </MainLayout>
  );
}
