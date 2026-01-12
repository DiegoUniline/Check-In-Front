import { useState } from 'react';
import { 
  Clock, DollarSign, CreditCard, Banknote, ArrowDownCircle, 
  ArrowUpCircle, Calculator, CheckCircle2, XCircle, Lock, Unlock,
  User, Calendar, Receipt, TrendingUp, AlertTriangle
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Turno {
  id: string;
  usuario: string;
  fechaInicio: Date;
  fechaFin?: Date;
  fondoInicial: number;
  fondoFinal?: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
  gastosEfectivo: number;
  estado: 'Abierto' | 'Cerrado';
}

interface MovimientoCaja {
  id: string;
  tipo: 'Ingreso' | 'Egreso';
  concepto: string;
  monto: number;
  metodoPago: string;
  fecha: Date;
  referencia?: string;
}

export default function Turnos() {
  const { toast } = useToast();
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [isAbrirDialogOpen, setIsAbrirDialogOpen] = useState(false);
  const [isCerrarDialogOpen, setIsCerrarDialogOpen] = useState(false);
  const [fondoInicial, setFondoInicial] = useState('');
  const [fondoContado, setFondoContado] = useState('');
  
  // Mock movements
  const [movimientos] = useState<MovimientoCaja[]>([
    { id: '1', tipo: 'Ingreso', concepto: 'Pago Reserva RES-2024-0001', monto: 1500, metodoPago: 'Efectivo', fecha: new Date() },
    { id: '2', tipo: 'Ingreso', concepto: 'Venta POS - Minibar', monto: 350, metodoPago: 'Tarjeta', fecha: new Date() },
    { id: '3', tipo: 'Egreso', concepto: 'Compra suministros', monto: 200, metodoPago: 'Efectivo', fecha: new Date() },
    { id: '4', tipo: 'Ingreso', concepto: 'Pago Check-out Hab 302', monto: 4500, metodoPago: 'Transferencia', fecha: new Date() },
    { id: '5', tipo: 'Ingreso', concepto: 'Room Service', monto: 280, metodoPago: 'Cargo Habitación', fecha: new Date() },
  ]);

  // Mock historical shifts
  const [historialTurnos] = useState<Turno[]>([
    {
      id: 't1',
      usuario: 'Carlos García',
      fechaInicio: new Date(Date.now() - 86400000),
      fechaFin: new Date(Date.now() - 57600000),
      fondoInicial: 2000,
      fondoFinal: 8750,
      ventasEfectivo: 5200,
      ventasTarjeta: 3400,
      ventasTransferencia: 1800,
      gastosEfectivo: 650,
      estado: 'Cerrado',
    },
    {
      id: 't2',
      usuario: 'María López',
      fechaInicio: new Date(Date.now() - 172800000),
      fechaFin: new Date(Date.now() - 144000000),
      fondoInicial: 2000,
      fondoFinal: 6250,
      ventasEfectivo: 3800,
      ventasTarjeta: 2100,
      ventasTransferencia: 950,
      gastosEfectivo: 400,
      estado: 'Cerrado',
    },
  ]);

  const handleAbrirTurno = () => {
    const fondo = parseFloat(fondoInicial);
    if (isNaN(fondo) || fondo < 0) {
      toast({
        title: 'Error',
        description: 'Ingrese un fondo inicial válido',
        variant: 'destructive',
      });
      return;
    }

    setTurnoActual({
      id: `turno-${Date.now()}`,
      usuario: 'Carlos García',
      fechaInicio: new Date(),
      fondoInicial: fondo,
      ventasEfectivo: 0,
      ventasTarjeta: 0,
      ventasTransferencia: 0,
      gastosEfectivo: 0,
      estado: 'Abierto',
    });

    toast({
      title: 'Turno abierto',
      description: `Fondo inicial: $${fondo.toFixed(2)}`,
    });
    setIsAbrirDialogOpen(false);
    setFondoInicial('');
  };

  const handleCerrarTurno = () => {
    const contado = parseFloat(fondoContado);
    if (isNaN(contado) || contado < 0) {
      toast({
        title: 'Error',
        description: 'Ingrese el monto contado',
        variant: 'destructive',
      });
      return;
    }

    const esperado = (turnoActual?.fondoInicial || 0) + 
                     movimientos.filter(m => m.tipo === 'Ingreso' && m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0) -
                     movimientos.filter(m => m.tipo === 'Egreso' && m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0);
    
    const diferencia = contado - esperado;

    toast({
      title: 'Turno cerrado',
      description: diferencia === 0 
        ? 'Arqueo correcto' 
        : `Diferencia: ${diferencia > 0 ? '+' : ''}$${diferencia.toFixed(2)}`,
      variant: diferencia === 0 ? 'default' : 'destructive',
    });
    
    setTurnoActual(null);
    setIsCerrarDialogOpen(false);
    setFondoContado('');
  };

  // Calculate totals for current shift
  const ingresos = movimientos.filter(m => m.tipo === 'Ingreso');
  const egresos = movimientos.filter(m => m.tipo === 'Egreso');
  const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0);
  const totalEgresos = egresos.reduce((sum, m) => sum + m.monto, 0);
  const efectivoEnCaja = (turnoActual?.fondoInicial || 0) + 
    ingresos.filter(m => m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0) -
    egresos.filter(m => m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0);

  return (
    <MainLayout 
      title="Gestión de Turnos" 
      subtitle="Control de caja y arqueos"
    >
      {/* Status Banner */}
      {turnoActual ? (
        <Card className="mb-6 border-success bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/20">
                  <Unlock className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-lg flex items-center gap-2">
                    Turno Abierto
                    <Badge className="bg-success">Activo</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Inicio: {format(turnoActual.fechaInicio, "d MMM yyyy HH:mm", { locale: es })} • {turnoActual.usuario}
                  </p>
                </div>
              </div>
              <Button variant="destructive" onClick={() => setIsCerrarDialogOpen(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Cerrar Turno
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-warning bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-warning/20">
                  <Lock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-lg">No hay turno abierto</p>
                  <p className="text-sm text-muted-foreground">
                    Debe abrir un turno para registrar movimientos
                  </p>
                </div>
              </div>
              <Button onClick={() => setIsAbrirDialogOpen(true)}>
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Turno
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {turnoActual && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Banknote className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${efectivoEnCaja.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Efectivo en Caja</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <ArrowDownCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-success">${totalIngresos.toFixed(2)}</p>
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
                    <p className="text-2xl font-bold text-destructive">${totalEgresos.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Egresos</p>
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
                    <p className="text-2xl font-bold">{movimientos.length}</p>
                    <p className="text-sm text-muted-foreground">Movimientos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Movements Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Movimientos del Turno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell>{format(mov.fecha, "HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo === 'Ingreso' ? 'default' : 'destructive'}>
                          {mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.concepto}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{mov.metodoPago}</Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        mov.tipo === 'Ingreso' ? 'text-success' : 'text-destructive'
                      )}>
                        {mov.tipo === 'Ingreso' ? '+' : '-'}${mov.monto.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Historical Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Turnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Fondo Inicial</TableHead>
                <TableHead>Ventas</TableHead>
                <TableHead>Fondo Final</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historialTurnos.map(turno => (
                <TableRow key={turno.id}>
                  <TableCell>
                    {format(turno.fechaInicio, "d MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{turno.usuario}</TableCell>
                  <TableCell>${turno.fondoInicial.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>Efvo: ${turno.ventasEfectivo.toFixed(2)}</p>
                      <p className="text-muted-foreground">Tarj: ${turno.ventasTarjeta.toFixed(2)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">${turno.fondoFinal?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{turno.estado}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Open Shift Dialog */}
      <Dialog open={isAbrirDialogOpen} onOpenChange={setIsAbrirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Abrir Nuevo Turno
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <User className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Carlos García</p>
                <p className="text-sm text-muted-foreground">Recepcionista</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fondo">Fondo Inicial de Caja *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fondo"
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={fondoInicial}
                  onChange={(e) => setFondoInicial(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cuente el efectivo en caja y registre el monto
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAbrirDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAbrirTurno}>
              <Unlock className="h-4 w-4 mr-2" />
              Abrir Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={isCerrarDialogOpen} onOpenChange={setIsCerrarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Arqueo y Cierre de Turno
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="bg-muted">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fondo Inicial</p>
                    <p className="font-medium">${turnoActual?.fondoInicial.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ingresos Efectivo</p>
                    <p className="font-medium text-success">+${ingresos.filter(m => m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Egresos Efectivo</p>
                    <p className="font-medium text-destructive">-${egresos.filter(m => m.metodoPago === 'Efectivo').reduce((s, m) => s + m.monto, 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Esperado en Caja</p>
                    <p className="font-bold text-lg">${efectivoEnCaja.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="contado">Efectivo Contado *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contado"
                  type="number"
                  placeholder="0.00"
                  className="pl-9 text-lg"
                  value={fondoContado}
                  onChange={(e) => setFondoContado(e.target.value)}
                />
              </div>
            </div>

            {fondoContado && (
              <Card className={cn(
                "border-2",
                parseFloat(fondoContado) === efectivoEnCaja ? "border-success bg-success/5" : "border-warning bg-warning/5"
              )}>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium">Diferencia:</span>
                  <span className={cn(
                    "text-xl font-bold",
                    parseFloat(fondoContado) === efectivoEnCaja ? "text-success" : "text-warning"
                  )}>
                    {parseFloat(fondoContado) === efectivoEnCaja ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" /> Correcto
                      </span>
                    ) : (
                      `${parseFloat(fondoContado) > efectivoEnCaja ? '+' : ''}$${(parseFloat(fondoContado) - efectivoEnCaja).toFixed(2)}`
                    )}
                  </span>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCerrarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCerrarTurno}>
              <Lock className="h-4 w-4 mr-2" />
              Cerrar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
