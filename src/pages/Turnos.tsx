import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  FileText,
  Eye,
  HandCoins,
  LogIn,
  LogOut,
  Lock,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Unlock,
  User,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BitacoraPanel } from '@/components/turnos/BitacoraPanel';
import { ExportButton } from '@/components/ExportButton';
import { useAuth } from '@/contexts/useAuth';
import { useShift } from '@/contexts/useShift';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { formatCurrency, useCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';

type ShiftSummary = {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  otros: number;
  egresosEfectivo: number;
  movimientos: Array<{ id: string; tipo: 'Ingreso' | 'Egreso'; concepto: string; metodo: string; monto: number; fecha: string }>;
  linkedToShift?: boolean;
};

const emptySummary: ShiftSummary = { efectivo: 0, tarjeta: 0, transferencia: 0, otros: 0, egresosEfectivo: 0, movimientos: [] };

const reportArray = (value: unknown): any[] => Array.isArray(value) ? value : [];
const normalizeMoneyInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [integer = '', ...decimals] = cleaned.split('.');
  return decimals.length ? `${integer}.${decimals.join('').slice(0, 2)}` : integer;
};

function ShiftReport({ report }: { report: any }) {
  const reception = report?.recepcion || {};
  const hotel = report?.estado_hotel || {};
  const payments = report?.pagos || {};
  const expenses = report?.gastos || {};
  const sales = report?.ventas || {};
  const cash = report?.caja || {};
  const period = report?.periodo || {};
  const sections = [
    { label: 'Reservas creadas', value: reception.reservas_creadas || 0, icon: Receipt },
    { label: 'Check-ins', value: reception.checkins || 0, icon: LogIn },
    { label: 'Check-outs', value: reception.checkouts || 0, icon: LogOut },
    { label: 'Operaciones', value: reception.operaciones || 0, icon: RefreshCw },
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#10233F]/5 px-4 py-3 text-sm">
      <span className="font-semibold text-[#10233F]">Reporte automático del turno</span>
      <span className="text-muted-foreground">{period.inicio ? formatDateTime(period.inicio) : '—'} → {period.fin ? formatDateTime(period.fin) : 'Ahora'}</span>
    </div>

    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recepción</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sections.map((item) => <div key={item.label} className="rounded-xl border bg-white p-3"><item.icon className="mb-2 h-4 w-4 text-[#10233F]" /><p className="text-xl font-bold text-[#10233F]">{item.value}</p><p className="text-xs text-muted-foreground">{item.label}</p></div>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border bg-slate-50 p-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Ocupadas',hotel.ocupadas],['Disponibles',hotel.disponibles],['Sucias',hotel.sucias],
          ['Mantenimiento',hotel.mantenimiento],['Llegadas pendientes',hotel.llegadas_pendientes],['Salidas pendientes',hotel.salidas_pendientes],
        ].map(([label,value]) => <div key={String(label)}><p className="font-bold text-[#10233F]">{value ?? 0}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen financiero</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 p-3"><CreditCard className="mb-2 h-4 w-4 text-emerald-700" /><p className="font-bold text-emerald-800">{formatCurrency(payments.total || 0)}</p><p className="text-xs text-emerald-700">Pagos recibidos · {payments.cantidad || 0}</p></div>
        <div className="rounded-xl bg-red-50 p-3"><ArrowUpCircle className="mb-2 h-4 w-4 text-red-700" /><p className="font-bold text-red-800">{formatCurrency(expenses.total || 0)}</p><p className="text-xs text-red-700">Gastos realizados · {expenses.cantidad || 0}</p></div>
        <div className="rounded-xl bg-blue-50 p-3"><ShoppingBag className="mb-2 h-4 w-4 text-blue-700" /><p className="font-bold text-blue-800">{formatCurrency(sales.total || 0)}</p><p className="text-xs text-blue-700">Ventas y consumos · {sales.cantidad || 0}</p></div>
        <div className="rounded-xl bg-[#10233F] p-3 text-white"><Banknote className="mb-2 h-4 w-4 text-white/70" /><p className="font-bold">{formatCurrency(cash.efectivo_contado ?? cash.efectivo_esperado ?? 0)}</p><p className="text-xs text-white/65">Efectivo al cierre</p></div>
      </div>
    </section>

    {[
      { title: 'Pagos recibidos', rows: reportArray(payments.detalle), columns: ['fecha','reserva','huesped','metodo','monto'] },
      { title: 'Gastos realizados', rows: reportArray(expenses.detalle), columns: ['fecha','categoria','concepto','metodo','monto'] },
      { title: 'Ventas por producto', rows: reportArray(sales.productos), columns: ['producto','cantidad','total'] },
    ].map((section) => <section key={section.title}>
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-[#10233F]">{section.title}</h3><Badge variant="secondary">{section.rows.length}</Badge></div>
      <div className="overflow-x-auto rounded-xl border">
        <Table><TableHeader><TableRow>{section.columns.map((column) => <TableHead key={column} className="capitalize">{column}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{section.rows.length ? section.rows.map((row:any,index:number) => <TableRow key={row.id || `${section.title}-${index}`}>{section.columns.map((column) => <TableCell key={column} className={column==='monto'||column==='total' ? 'font-semibold' : ''}>{column==='fecha' && row[column] ? formatDateTime(row[column]) : column==='monto'||column==='total' ? formatCurrency(row[column] || 0) : row[column] ?? '—'}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={section.columns.length} className="py-6 text-center text-sm text-muted-foreground">Sin movimientos en este turno.</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
    </section>)}
  </div>;
}

export default function Turnos() {
  const { user } = useAuth();
  const { refreshShift, continueWithoutShift } = useShift();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const currency = useCurrency();
  const [turno, setTurno] = useState<any | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [summary, setSummary] = useState<ShiftSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [fondoInicial, setFondoInicial] = useState('');
  const [fondoContado, setFondoContado] = useState('');
  const [entregaA, setEntregaA] = useState('');
  const [pendientesEntrega, setPendientesEntrega] = useState('');
  const [motivoDiferencia, setMotivoDiferencia] = useState('');
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [closeReport, setCloseReport] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const shiftPromptShown = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [current, history, staff] = await Promise.all([api.getOpenShift(user.id), api.getShiftHistory(), api.getUsuarios().catch(() => [])]);
      setTurno(current);
      setHistorial(history);
      setUsuarios((Array.isArray(staff) ? staff : []).filter((member:any) => member.activo !== false && member.id !== user.id));
      setSummary(current ? await api.getShiftFinancialSummary(current.id, current.abierto_at) : emptySummary);
    } catch (error: any) {
      toast({ title: 'No se pudieron cargar los turnos', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const wasRequired = (location.state as { shiftRequired?: boolean } | null)?.shiftRequired;
    if (!loading && !turno && wasRequired && !shiftPromptShown.current) {
      shiftPromptShown.current = true;
      setOpenDialog(true);
    }
  }, [loading, location.state, turno]);

  const efectivoEsperado = useMemo(
    () => Number(turno?.fondo_inicial || 0) + summary.efectivo - summary.egresosEfectivo,
    [turno?.fondo_inicial, summary.efectivo, summary.egresosEfectivo],
  );
  const contado = Number(fondoContado || 0);
  const diferencia = contado - efectivoEsperado;
  const hasCashCount = fondoContado.trim() !== '' && Number.isFinite(contado) && contado >= 0;
  const openingAmount = Number(fondoInicial || 0);
  const validOpeningAmount = Number.isFinite(openingAmount) && openingAmount >= 0;
  const operatorName = `${user?.nombre || ''} ${user?.apellidoPaterno || ''}`.trim() || user?.email || 'Usuario';
  const totalIngresos = summary.efectivo + summary.tarjeta + summary.transferencia + summary.otros;
  const cajaConciliada = hasCashCount && Math.abs(diferencia) < 0.01;
  const motivoDiferenciaCompleto = Math.abs(diferencia) < 0.01 || Boolean(motivoDiferencia.trim());
  const cierreListo = hasCashCount && cashConfirmed && motivoDiferenciaCompleto && !reportLoading && Boolean(closeReport);
  const deliveryUser = usuarios.find((member) => member.id === entregaA);

  const updateOpeningAmount = (value: string) => {
    setFondoInicial(normalizeMoneyInput(value));
  };

  const abrirTurno = async () => {
    const fondo = Number(fondoInicial);
    if (!Number.isFinite(fondo) || fondo < 0 || !user?.id) {
      toast({ title: 'Ingresa un fondo inicial válido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.openShift({ usuario_id: user.id, usuario_nombre: `${user.nombre || ''} ${user.apellidoPaterno || ''}`.trim() || user.email, fondo_inicial: fondo });
      toast({ title: 'Turno abierto', description: `Fondo inicial: ${formatCurrency(fondo)}` });
      setFondoInicial('');
      setOpenDialog(false);
      await Promise.all([load(), refreshShift()]);
      const returnTo = (location.state as { shiftRequired?: boolean; returnTo?: string } | null)?.returnTo;
      if (returnTo) navigate(returnTo, { replace: true });
    } catch (error: any) {
      toast({ title: 'No se pudo abrir el turno', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const continuarSoloConsulta = () => {
    continueWithoutShift();
    setOpenDialog(false);
    toast({
      title: 'Modo sólo consulta activado',
      description: 'Podrás revisar todo VULO. Para registrar cambios deberás abrir un turno.',
    });
    const returnTo = (location.state as { shiftRequired?: boolean; returnTo?: string } | null)?.returnTo;
    navigate(returnTo || '/dashboard', { replace: true });
  };

  const abrirCierre = async () => {
    if (!turno) return;
    setCloseReport(null);
    setCloseDialog(true);
    setReportLoading(true);
    try {
      setCloseReport(await api.getShiftCloseReport(turno.id, turno.abierto_at));
    } catch (error:any) {
      toast({ title: 'No se pudo preparar el reporte', description: error?.message, variant: 'destructive' });
      setCloseReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const cerrarTurno = async () => {
    if (!turno || !hasCashCount) {
      toast({ title: 'Cuenta y registra el efectivo en caja', variant: 'destructive' });
      return;
    }
    if (!cashConfirmed) {
      toast({ title: 'Confirma que contaste físicamente la caja', variant: 'destructive' });
      return;
    }
    if (Math.abs(diferencia) > 0.009 && !motivoDiferencia.trim()) {
      toast({ title: 'Explica la diferencia de caja', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const closedShift = await api.closeShift(turno.id, {
        efectivo_esperado: efectivoEsperado,
        efectivo_contado: contado,
        diferencia,
        ingresos_efectivo: summary.efectivo,
        ingresos_tarjeta: summary.tarjeta,
        ingresos_transferencia: summary.transferencia,
        otros_ingresos: summary.otros,
        egresos_efectivo: summary.egresosEfectivo,
        entrega_a: deliveryUser ? `${deliveryUser.nombre || ''} ${deliveryUser.apellido_paterno || ''}`.trim() : null,
        resumen_entrega: 'Reporte automático de turno',
        pendientes_entrega: pendientesEntrega.trim() || '__VULO_SIN_PENDIENTES__',
        motivo_diferencia: motivoDiferencia.trim() || null,
        checklist_cierre: { caja: true, pendientes: true, llegadas: true, incidentes: true, entrega_usuario_id: entregaA || null },
      });
      if (pendientesEntrega.trim()) await api.createBitacoraOperativa({
          turno_id: turno.id,
          categoria: 'Entrega de turno',
          prioridad: Math.abs(diferencia) > 0.009 ? 'Alta' : 'Normal',
          titulo: `Pendientes entregados${deliveryUser ? ` a ${deliveryUser.nombre}` : ''}`,
          detalle: `${pendientesEntrega.trim()}\n\nCaja: ${formatCurrency(contado)} · Diferencia: ${formatCurrency(diferencia)}`,
          estado: 'Abierto',
          autor_id: user?.id,
          autor_nombre: user?.nombre || user?.email || 'Usuario',
        }).catch(() => null);
      toast({ title: 'Turno cerrado y entregado', description: Math.abs(diferencia) < 0.01 ? 'Caja conciliada correctamente.' : `Diferencia registrada: ${formatCurrency(diferencia)}` });
      setCloseDialog(false);
      const finalReport = closedShift?.reporte_cierre && Object.keys(closedShift.reporte_cierre).length
        ? closedShift.reporte_cierre
        : closeReport ? { ...closeReport, caja: {
          fondo_inicial: Number(turno.fondo_inicial || 0), efectivo_ingresado: summary.efectivo,
          tarjeta: summary.tarjeta, transferencia: summary.transferencia, otros_ingresos: summary.otros,
          egresos_efectivo: summary.egresosEfectivo, efectivo_esperado: efectivoEsperado,
          efectivo_contado: contado, diferencia,
        } } : null;
      setSelectedReport(finalReport);
      setReportDialog(Boolean(finalReport));
      setFondoContado('');
      setEntregaA('');
      setPendientesEntrega('');
      setMotivoDiferencia('');
      setCashConfirmed(false);
      setCloseReport(null);
      await Promise.all([load(), refreshShift()]);
    } catch (error: any) {
      toast({ title: 'No se pudo cerrar el turno', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <MainLayout title="Turnos" subtitle="Caja, pendientes y entrega"><div className="h-80 animate-pulse rounded-2xl bg-muted" /></MainLayout>;
  }

  if (reportDialog && selectedReport) {
    return (
      <MainLayout title="Reporte de turno" subtitle="Registro permanente de la operación" fullWidth>
        <div className="mx-auto max-w-[1480px] space-y-4 p-3 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setReportDialog(false)} aria-label="Volver a turnos"><ChevronLeft className="h-5 w-5" /></Button>
              <div><p className="font-semibold text-[#10233F]">Reporte de cierre</p><p className="text-xs text-muted-foreground">Todo lo registrado durante el turno, en una sola vista.</p></div>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Turno cerrado y auditado</Badge>
          </div>
          <Card className="border-[#10233F]/10 shadow-sm"><CardContent className="p-4 sm:p-6"><ShiftReport report={selectedReport} /></CardContent></Card>
        </div>
      </MainLayout>
    );
  }

  if (closeDialog && turno) {
    const reception = closeReport?.recepcion || {};
    const payments = closeReport?.pagos || {};
    const expenses = closeReport?.gastos || {};
    const sales = closeReport?.ventas || {};
    const hotel = closeReport?.estado_hotel || {};
    return (
      <MainLayout title="Cerrar turno" subtitle="Conciliación y entrega" fullWidth>
        <div className="mx-auto max-w-[1540px] space-y-4 p-3 pb-10 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 rounded-2xl bg-[#10233F] p-4 text-white shadow-lg sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setCloseDialog(false)} aria-label="Volver al turno"><ChevronLeft className="h-5 w-5" /></Button>
              <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold sm:text-2xl">Cierre y entrega de turno</h1><Badge className="border-0 bg-emerald-400/15 text-emerald-200">Turno activo</Badge></div><p className="mt-1 text-sm text-white/65">{operatorName} · Abierto {formatDateTime(turno.abierto_at)}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.07] p-1 text-center text-[10px] sm:min-w-[390px] sm:text-xs">
              <div className="rounded-lg bg-white px-3 py-2 font-semibold text-[#10233F]">1. Revisar</div>
              <div className={cn('rounded-lg px-3 py-2 font-semibold', hasCashCount ? 'bg-white text-[#10233F]' : 'text-white/65')}>2. Contar</div>
              <div className={cn('rounded-lg px-3 py-2 font-semibold', cierreListo ? 'bg-emerald-400 text-emerald-950' : 'text-white/65')}>3. Entregar</div>
            </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="space-y-4">
              <Card className="overflow-hidden border-[#10233F]/10 shadow-sm">
                <CardHeader className="border-b bg-slate-50/80 px-4 py-3 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="flex items-center gap-2 text-base text-[#10233F]"><WalletCards className="h-4 w-4" />Lo registrado por VULO</CardTitle><p className="mt-0.5 text-xs text-muted-foreground">Importes calculados desde la apertura de este turno.</p></div><Badge className="bg-emerald-600">Actualizado</Badge></div></CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 border-b sm:grid-cols-4">
                    {[
                      ['Fondo inicial', Number(turno.fondo_inicial || 0), 'text-[#10233F]'],
                      ['Efectivo recibido', summary.efectivo, 'text-emerald-700'],
                      ['Egresos en efectivo', summary.egresosEfectivo, 'text-red-700'],
                      ['Efectivo esperado', efectivoEsperado, 'text-[#10233F]'],
                    ].map(([label,value,tone], index) => <div key={String(label)} className={cn('p-4 sm:p-5', index < 3 && 'border-r', index < 2 && 'max-sm:border-b')}><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn('mt-1 text-xl font-bold tabular-nums sm:text-2xl', tone)}>{formatCurrency(Number(value))}</p></div>)}
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                    {[
                      ['Tarjeta', summary.tarjeta, CreditCard],
                      ['Transferencia', summary.transferencia, ArrowRightLeft],
                      ['Otros ingresos', summary.otros, HandCoins],
                      ['Total recibido', totalIngresos, Banknote],
                    ].map(([label,value,Icon]: any) => <div key={label} className="bg-white p-3.5"><Icon className="mb-2 h-4 w-4 text-slate-500" /><p className="font-semibold tabular-nums text-[#10233F]">{formatCurrency(value)}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#10233F]/10 shadow-sm">
                <CardHeader className="border-b px-4 py-3 sm:px-5"><div><CardTitle className="flex items-center gap-2 text-base text-[#10233F]"><Receipt className="h-4 w-4" />Reporte operativo del turno</CardTitle><p className="mt-0.5 text-xs text-muted-foreground">Este resumen quedará guardado automáticamente.</p></div></CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  {reportLoading ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div> : !closeReport ? <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center"><RefreshCw className="h-6 w-6 text-muted-foreground" /><p className="mt-2 text-sm font-semibold text-[#10233F]">No se pudo preparar el reporte</p><p className="mt-1 text-xs text-muted-foreground">Vuelve a intentarlo antes de cerrar el turno.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void abrirCierre()}>Reintentar</Button></div> : <>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {[
                        ['Reservas', reception.reservas_creadas, Receipt], ['Check-ins', reception.checkins, LogIn], ['Check-outs', reception.checkouts, LogOut],
                        ['Pagos', payments.cantidad, CreditCard], ['Gastos', expenses.cantidad, ArrowUpCircle], ['Productos', reportArray(sales.productos).length, ShoppingBag],
                      ].map(([label,value,Icon]: any) => <div key={label} className="rounded-xl border bg-slate-50/60 p-3"><Icon className="mb-2 h-4 w-4 text-[#10233F]" /><p className="text-xl font-bold text-[#10233F]">{value ?? 0}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] text-emerald-700">Pagos recibidos</p><p className="mt-1 font-bold text-emerald-800">{formatCurrency(payments.total || 0)}</p></div>
                      <div className="rounded-xl bg-red-50 p-3"><p className="text-[11px] text-red-700">Gastos realizados</p><p className="mt-1 font-bold text-red-800">{formatCurrency(expenses.total || 0)}</p></div>
                      <div className="rounded-xl bg-blue-50 p-3"><p className="text-[11px] text-blue-700">Ventas y consumos</p><p className="mt-1 font-bold text-blue-800">{formatCurrency(sales.total || 0)}</p></div>
                      <div className="rounded-xl bg-amber-50 p-3"><p className="text-[11px] text-amber-700">Pendientes operativos</p><p className="mt-1 font-bold text-amber-800">{Number(hotel.llegadas_pendientes || 0) + Number(hotel.salidas_pendientes || 0)}</p></div>
                    </div>
                  </>}
                </CardContent>
              </Card>

              {closeReport && <details className="group overflow-hidden rounded-2xl border border-[#10233F]/10 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-semibold text-[#10233F] sm:px-5"><span className="flex items-center gap-2"><FileText className="h-4 w-4" />Ver todo el detalle que quedará guardado</span><span className="text-xs font-normal text-muted-foreground group-open:hidden">Pagos, gastos y productos</span><span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Ocultar detalle</span></summary><div className="border-t px-4 py-5 sm:px-5"><ShiftReport report={closeReport} /></div></details>}
            </div>

            <Card className="border-[#10233F]/15 shadow-xl xl:sticky xl:top-4">
              <CardHeader className="border-b px-4 py-4 sm:px-5"><CardTitle className="flex items-center gap-2 text-lg text-[#10233F]"><Calculator className="h-5 w-5" />Cuenta y entrega</CardTitle><p className="text-xs text-muted-foreground">Sólo captura lo que tienes físicamente. VULO hace el contraste.</p></CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div>
                  <div className="mb-2 flex items-end justify-between gap-2"><Label htmlFor="contado" className="font-semibold text-[#10233F]">Efectivo contado en caja</Label><span className="text-xs text-muted-foreground">{currency.codigo}</span></div>
                  <div className="relative"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-xl font-semibold text-[#10233F]">{currency.simbolo}</span><Input id="contado" type="text" inputMode="decimal" autoComplete="off" autoFocus className="h-16 rounded-2xl border-[#10233F]/20 pl-10 pr-4 text-3xl font-bold tabular-nums text-[#10233F]" value={fondoContado} onChange={(event) => setFondoContado(normalizeMoneyInput(event.target.value))} onBlur={() => hasCashCount && setFondoContado(contado.toFixed(2))} placeholder="0.00" /></div>
                </div>

                <div className={cn('rounded-2xl border p-4 transition-colors', !hasCashCount ? 'border-dashed bg-slate-50' : cajaConciliada ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50')}>
                  <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-700">Diferencia</span><strong className={cn('text-xl tabular-nums', !hasCashCount ? 'text-slate-400' : cajaConciliada ? 'text-emerald-700' : 'text-red-700')}>{hasCashCount ? formatCurrency(diferencia) : '—'}</strong></div>
                  <p className={cn('mt-1 text-xs', cajaConciliada ? 'text-emerald-700' : 'text-muted-foreground')}>{!hasCashCount ? `VULO espera ${formatCurrency(efectivoEsperado)}` : cajaConciliada ? 'La caja cuadra correctamente.' : diferencia > 0 ? 'Hay efectivo sobrante.' : 'Hay efectivo faltante.'}</p>
                </div>

                {hasCashCount && !cajaConciliada && <div><Label htmlFor="motivo" className="text-sm font-semibold text-red-800">Explica la diferencia</Label><Textarea id="motivo" className="mt-2 min-h-20 border-red-200" value={motivoDiferencia} onChange={(event) => setMotivoDiferencia(event.target.value)} placeholder="Motivo obligatorio para auditoría…" /></div>}

                <div className="border-t pt-4"><Label className="flex items-center gap-2 font-semibold text-[#10233F]"><UsersRound className="h-4 w-4" />Entregar a <span className="font-normal text-muted-foreground">(opcional)</span></Label><Select value={entregaA || '__none__'} onValueChange={(value) => setEntregaA(value === '__none__' ? '' : value)}><SelectTrigger className="mt-2 h-11"><SelectValue placeholder="Selecciona un usuario" /></SelectTrigger><SelectContent><SelectItem value="__none__">Cierre final · Sin entrega</SelectItem>{usuarios.map((member) => <SelectItem key={member.id} value={member.id}>{`${member.nombre || ''} ${member.apellido_paterno || ''}`.trim() || member.email} · {member.rol}</SelectItem>)}</SelectContent></Select>{deliveryUser && <p className="mt-2 text-xs text-muted-foreground">El reporte y los pendientes quedarán entregados a {deliveryUser.nombre || deliveryUser.email}.</p>}</div>

                <div><div className="flex items-center justify-between gap-2"><Label htmlFor="pendientes" className="font-semibold text-[#10233F]">Pendientes del siguiente turno</Label><span className="text-xs text-muted-foreground">Opcional</span></div><Textarea id="pendientes" className="mt-2 min-h-24" value={pendientesEntrega} onChange={(event) => setPendientesEntrega(event.target.value)} placeholder="Llegadas, cobros, habitaciones o incidentes por continuar…" /></div>

                <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors', cashConfirmed ? 'border-emerald-200 bg-emerald-50' : 'border-[#10233F]/10 bg-[#10233F]/[0.03]')}><Checkbox className="mt-0.5" checked={cashConfirmed} onCheckedChange={(value) => setCashConfirmed(value === true)} /><span><strong className="block text-[#10233F]">Confirmo el conteo físico</strong><span className="text-xs text-muted-foreground">Revisé el efectivo y los movimientos de este turno.</span></span></label>

                <Button variant={!cajaConciliada && hasCashCount ? 'destructive' : 'default'} className="h-12 w-full text-sm font-semibold" onClick={cerrarTurno} disabled={saving || !cierreListo}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />{saving ? 'Cerrando turno…' : reportLoading ? 'Preparando reporte…' : !closeReport ? 'Reporte pendiente' : !hasCashCount ? 'Cuenta el efectivo para continuar' : !motivoDiferenciaCompleto ? 'Explica la diferencia' : !cashConfirmed ? 'Confirma el conteo' : cajaConciliada ? 'Cerrar turno conciliado' : `Cerrar con diferencia de ${formatCurrency(diferencia)}`}
                </Button>
                <p className="text-center text-[11px] leading-4 text-muted-foreground">Al cerrar se guardarán el reporte, la conciliación, el responsable y la entrega.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Turnos" subtitle="Nadie entrega el hotel de memoria">
      <div className="mx-auto max-w-[1480px] space-y-4 pb-10">
        {!turno && (location.state as { shiftRequired?: boolean } | null)?.shiftRequired && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <Lock className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Abre tu turno para comenzar</p><p className="mt-1 text-sm text-amber-900/75">Reservas, caja, ventas y operaciones quedan protegidas hasta registrar el efectivo inicial de tu turno.</p></div>
        </div>}
        <Card className="overflow-hidden border-[#10233F]/10 shadow-sm">
          <CardContent className={cn('p-0', turno ? 'bg-[#10233F] text-white' : 'bg-white')}>
            <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', turno ? 'bg-white/10 text-emerald-300' : 'bg-amber-100 text-amber-700')}>
                  {turno ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{turno ? `Turno de ${turno.usuario_nombre || operatorName}` : 'No hay turno abierto'}</h2>{turno && <Badge className="border-0 bg-emerald-400/15 text-emerald-200">Activo</Badge>}{turno?._local_only && <Badge variant="outline" className="border-white/20 text-white">Este dispositivo</Badge>}</div>
                  <p className={cn('text-sm', turno ? 'text-white/60' : 'text-muted-foreground')}>{turno ? `Abierto ${formatDateTime(turno.abierto_at)} · Fondo ${formatCurrency(turno.fondo_inicial || 0)}` : 'Abre caja para iniciar el control de tu operación.'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className={cn(turno && 'border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white')} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
                {turno ? <Button className="bg-white text-[#10233F] hover:bg-slate-100" onClick={() => void abrirCierre()}><Calculator className="mr-2 h-4 w-4" />Revisar y cerrar turno</Button> : <Button onClick={() => setOpenDialog(true)}><Unlock className="mr-2 h-4 w-4" />Abrir turno</Button>}
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        {turno && (
          <>
            <Card className="overflow-hidden border-[#10233F]/10 shadow-sm">
              <CardContent className="grid grid-cols-2 p-0 lg:grid-cols-4">
              {[
                { label: 'Efectivo esperado', value: efectivoEsperado, icon: Banknote, tone: 'text-[#10233F] bg-slate-100' },
                { label: 'Ingresos del turno', value: totalIngresos, icon: ArrowDownCircle, tone: 'text-emerald-700 bg-emerald-100' },
                { label: 'Egresos en efectivo', value: summary.egresosEfectivo, icon: ArrowUpCircle, tone: 'text-red-700 bg-red-100' },
                { label: 'Movimientos registrados', value: summary.movimientos.length, icon: Receipt, tone: 'text-blue-700 bg-blue-100', count: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 border-b border-r p-4 last:border-r-0 lg:border-b-0"><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', item.tone)}><item.icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-lg font-bold tabular-nums text-[#10233F] sm:text-xl">{item.count ? item.value : formatCurrency(item.value)}</p><p className="truncate text-xs text-muted-foreground">{item.label}</p></div></div>
              ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-[#10233F]/10 shadow-sm">
              <CardHeader className="flex-row items-center justify-between border-b bg-slate-50/70 px-4 py-3 sm:px-5"><div><CardTitle className="flex items-center gap-2 text-base text-[#10233F]"><Receipt className="h-4 w-4" />Actividad de caja</CardTitle><p className="mt-0.5 text-xs text-muted-foreground">Pagos, ventas y egresos desde la apertura.</p></div><Badge variant="secondary">{summary.movimientos.length} movimientos</Badge></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                {summary.linkedToShift === false && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">La migración de turnos aún no está aplicada; estos totales usan el horario de apertura como respaldo. Al aplicarla, cada movimiento quedará ligado a esta caja.</div>}
                <Table><TableHeader className="bg-white"><TableRow><TableHead className="pl-5">Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Concepto</TableHead><TableHead>Método</TableHead><TableHead className="pr-5 text-right">Monto</TableHead></TableRow></TableHeader>
                  <TableBody>{summary.movimientos.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Todavía no hay movimientos en este turno.</TableCell></TableRow> : summary.movimientos.map((m) => <TableRow key={`${m.tipo}-${m.id}`}><TableCell>{m.fecha ? formatDateTime(m.fecha) : '—'}</TableCell><TableCell><Badge variant={m.tipo === 'Ingreso' ? 'secondary' : 'destructive'}>{m.tipo}</Badge></TableCell><TableCell>{m.concepto}</TableCell><TableCell>{m.metodo}</TableCell><TableCell className={cn('text-right font-semibold', m.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-red-700')}>{m.tipo === 'Ingreso' ? '+' : '-'}{formatCurrency(m.monto)}</TableCell></TableRow>)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <BitacoraPanel turnoId={turno?.id} />

        <Card className="overflow-hidden border-[#10233F]/10 shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b bg-slate-50/70 px-4 py-3 sm:px-5"><div><CardTitle className="flex items-center gap-2 text-base text-[#10233F]"><Clock3 className="h-4 w-4" />Turnos anteriores</CardTitle><p className="mt-0.5 text-xs text-muted-foreground">Consulta la conciliación y el reporte guardado de cada entrega.</p></div><ExportButton rows={() => historial} filename="turnos_vulo" sheetName="Turnos" /></CardHeader>
          <CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead className="pl-5">Apertura</TableHead><TableHead>Usuario</TableHead><TableHead>Fondo</TableHead><TableHead>Contado</TableHead><TableHead>Diferencia</TableHead><TableHead>Entregado a</TableHead><TableHead>Reporte</TableHead><TableHead className="pr-5">Estado</TableHead></TableRow></TableHeader><TableBody>
            {historial.length === 0 ? <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">El primer turno aparecerá aquí.</TableCell></TableRow> : historial.map((t) => <TableRow key={t.id}><TableCell>{formatDateTime(t.abierto_at)}</TableCell><TableCell>{t.usuario_nombre}</TableCell><TableCell>{formatCurrency(t.fondo_inicial)}</TableCell><TableCell>{t.efectivo_contado == null ? '—' : formatCurrency(t.efectivo_contado)}</TableCell><TableCell className={cn('font-semibold', Number(t.diferencia) ? 'text-red-700' : 'text-emerald-700')}>{t.diferencia == null ? '—' : formatCurrency(t.diferencia)}</TableCell><TableCell>{t.entrega_a || 'Cierre final'}</TableCell><TableCell>{t.reporte_cierre && Object.keys(t.reporte_cierre).length ? <Button variant="outline" size="sm" onClick={() => { setSelectedReport(t.reporte_cierre); setReportDialog(true); }}><FileText className="mr-1.5 h-3.5 w-3.5" />Ver reporte</Button> : <span className="text-muted-foreground">—</span>}</TableCell><TableCell><Badge variant={t.estado === 'Abierto' ? 'default' : 'secondary'}>{t.estado}</Badge></TableCell></TableRow>)}
          </TableBody></Table></CardContent>
        </Card>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-[560px]">
          <DialogHeader className="border-b border-[#10233F]/10 px-5 pb-5 pt-6 text-left sm:px-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#10233F] text-white shadow-sm">
                <Unlock className="h-5 w-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="text-xl text-[#10233F]">Abrir turno</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-relaxed">
                  Registra el efectivo con el que recibes la caja.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#10233F]/10 bg-slate-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#10233F] shadow-sm ring-1 ring-[#10233F]/10">
                  <User className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#10233F]">{operatorName}</p>
                  <p className="text-xs text-muted-foreground">Responsable del turno</p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 border-[#10233F]/15 bg-white text-[#10233F]">{user?.rol || 'Usuario'}</Badge>
            </div>

            <div>
              <div className="mb-2 flex items-end justify-between gap-3">
                <Label htmlFor="fondo-inicial" className="text-sm font-semibold text-[#10233F]">Fondo inicial en caja</Label>
                <span className="text-xs text-muted-foreground">{currency.codigo}</span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-xl font-semibold text-[#10233F]">{currency.simbolo}</span>
                <Input
                  id="fondo-inicial"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="h-16 rounded-2xl border-[#10233F]/20 bg-white pl-10 pr-4 text-3xl font-bold tabular-nums text-[#10233F] shadow-sm focus-visible:ring-[#10233F]/20"
                  value={fondoInicial}
                  onChange={(event) => updateOpeningAmount(event.target.value)}
                  onBlur={() => validOpeningAmount && fondoInicial && setFondoInicial(openingAmount.toFixed(2))}
                  onKeyDown={(event) => { if (event.key === 'Enter' && validOpeningAmount && !saving) void abrirTurno(); }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[0, 500, 1000, 2000].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-10 rounded-xl px-1 text-xs font-semibold sm:text-sm',
                      validOpeningAmount && openingAmount === amount && fondoInicial !== ''
                        ? 'border-[#10233F] bg-[#10233F]/5 text-[#10233F]'
                        : 'border-[#10233F]/10 text-slate-600 hover:border-[#10233F]/30 hover:bg-[#10233F]/5',
                    )}
                    onClick={() => setFondoInicial(amount.toFixed(2))}
                  >
                    {amount === 0 ? 'Sin fondo' : formatCurrency(amount, { decimals: 0 })}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 rounded-xl bg-[#10233F]/5 px-4 py-3 text-sm text-[#10233F]">
              <Calculator className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-relaxed">Al cerrar se conciliará este fondo más los ingresos en efectivo, menos los egresos del turno.</p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-[#10233F]/10 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <Button variant="outline" className="w-full border-sky-200 bg-white text-sky-800 hover:bg-sky-50 sm:mr-auto sm:w-auto" onClick={continuarSoloConsulta}>
              <Eye className="mr-2 h-4 w-4" />Entrar sólo a consultar
            </Button>
            <Button className="w-full bg-[#10233F] hover:bg-[#10233F]/90 sm:min-w-60 sm:w-auto" onClick={abrirTurno} disabled={saving || !validOpeningAmount}>
              {saving ? 'Abriendo turno…' : openingAmount > 0 ? `Abrir turno con ${formatCurrency(openingAmount)}` : 'Abrir turno sin fondo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
