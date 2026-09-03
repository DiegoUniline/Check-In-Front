import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  Banknote,
  Calculator,
  CheckCircle2,
  Clock3,
  Lock,
  Receipt,
  RefreshCw,
  Unlock,
  User,
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

export default function Turnos() {
  const { user } = useAuth();
  const { refreshShift } = useShift();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const currency = useCurrency();
  const [turno, setTurno] = useState<any | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [summary, setSummary] = useState<ShiftSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [fondoInicial, setFondoInicial] = useState('');
  const [fondoContado, setFondoContado] = useState('');
  const [entregaA, setEntregaA] = useState('');
  const [resumenEntrega, setResumenEntrega] = useState('');
  const [pendientesEntrega, setPendientesEntrega] = useState('');
  const [motivoDiferencia, setMotivoDiferencia] = useState('');
  const [checks, setChecks] = useState({ caja: false, pendientes: false, llegadas: false, incidentes: false });
  const shiftPromptShown = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [current, history] = await Promise.all([api.getOpenShift(user.id), api.getShiftHistory()]);
      setTurno(current);
      setHistorial(history);
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
  const allChecked = Object.values(checks).every(Boolean);
  const openingAmount = Number(fondoInicial || 0);
  const validOpeningAmount = Number.isFinite(openingAmount) && openingAmount >= 0;
  const operatorName = `${user?.nombre || ''} ${user?.apellidoPaterno || ''}`.trim() || user?.email || 'Usuario';

  const updateOpeningAmount = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const [integer = '', ...decimals] = cleaned.split('.');
    setFondoInicial(decimals.length ? `${integer}.${decimals.join('').slice(0, 2)}` : integer);
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

  const cerrarTurno = async () => {
    if (!turno || !fondoContado || !Number.isFinite(contado)) {
      toast({ title: 'Cuenta y registra el efectivo en caja', variant: 'destructive' });
      return;
    }
    if (!resumenEntrega.trim() || !pendientesEntrega.trim()) {
      toast({ title: 'La entrega debe incluir resumen y pendientes', variant: 'destructive' });
      return;
    }
    if (!allChecked) {
      toast({ title: 'Confirma los cuatro puntos del cierre', variant: 'destructive' });
      return;
    }
    if (Math.abs(diferencia) > 0.009 && !motivoDiferencia.trim()) {
      toast({ title: 'Explica la diferencia de caja', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.closeShift(turno.id, {
        efectivo_esperado: efectivoEsperado,
        efectivo_contado: contado,
        diferencia,
        ingresos_efectivo: summary.efectivo,
        ingresos_tarjeta: summary.tarjeta,
        ingresos_transferencia: summary.transferencia,
        otros_ingresos: summary.otros,
        egresos_efectivo: summary.egresosEfectivo,
        entrega_a: entregaA.trim() || null,
        resumen_entrega: resumenEntrega.trim(),
        pendientes_entrega: pendientesEntrega.trim(),
        motivo_diferencia: motivoDiferencia.trim() || null,
        checklist_cierre: checks,
      });
      await api.createBitacoraOperativa({
        turno_id: turno.id,
        categoria: 'Entrega de turno',
        prioridad: Math.abs(diferencia) > 0.009 ? 'Alta' : 'Normal',
        titulo: `Entrega de turno${entregaA.trim() ? ` a ${entregaA.trim()}` : ''}`,
        detalle: `${resumenEntrega.trim()}\n\nPendientes: ${pendientesEntrega.trim()}\nCaja: ${formatCurrency(contado)} · Diferencia: ${formatCurrency(diferencia)}`,
        estado: 'Abierto',
        autor_id: user?.id,
        autor_nombre: user?.nombre || user?.email || 'Usuario',
      }).catch(() => null);
      toast({ title: 'Turno cerrado y entregado', description: Math.abs(diferencia) < 0.01 ? 'Caja conciliada correctamente.' : `Diferencia registrada: ${formatCurrency(diferencia)}` });
      setCloseDialog(false);
      setFondoContado('');
      setEntregaA('');
      setResumenEntrega('');
      setPendientesEntrega('');
      setMotivoDiferencia('');
      setChecks({ caja: false, pendientes: false, llegadas: false, incidentes: false });
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

  return (
    <MainLayout title="Turnos" subtitle="Nadie entrega el hotel de memoria">
      <div className="space-y-5">
        {!turno && (location.state as { shiftRequired?: boolean } | null)?.shiftRequired && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <Lock className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Abre tu turno para comenzar</p><p className="mt-1 text-sm text-amber-900/75">Reservas, caja, ventas y operaciones quedan protegidas hasta registrar el efectivo inicial de tu turno.</p></div>
        </div>}
        <Card className={cn('overflow-hidden border-2', turno ? 'border-emerald-200' : 'border-amber-200')}>
          <CardContent className={cn('p-5', turno ? 'bg-emerald-50/60' : 'bg-amber-50/60')}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', turno ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {turno ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{turno ? 'Turno abierto' : 'No hay turno abierto'}</h2>{turno && <Badge className="bg-emerald-600">Activo</Badge>}{turno?._local_only && <Badge variant="outline">Este dispositivo</Badge>}</div>
                  <p className="text-sm text-muted-foreground">{turno ? `${turno.usuario_nombre} · ${formatDateTime(turno.abierto_at)}` : 'Abre caja para iniciar el control de tu operación.'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
                {turno ? <Button variant="destructive" onClick={() => setCloseDialog(true)}><ArrowRightLeft className="mr-2 h-4 w-4" />Entregar y cerrar</Button> : <Button onClick={() => setOpenDialog(true)}><Unlock className="mr-2 h-4 w-4" />Abrir turno</Button>}
              </div>
            </div>
          </CardContent>
        </Card>

        {turno && (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: 'Efectivo esperado', value: efectivoEsperado, icon: Banknote, tone: 'text-slate-900 bg-slate-100' },
                { label: 'Ingresos del turno', value: summary.efectivo + summary.tarjeta + summary.transferencia + summary.otros, icon: ArrowDownCircle, tone: 'text-emerald-700 bg-emerald-100' },
                { label: 'Egresos en efectivo', value: summary.egresosEfectivo, icon: ArrowUpCircle, tone: 'text-red-700 bg-red-100' },
                { label: 'Movimientos', value: summary.movimientos.length, icon: Receipt, tone: 'text-blue-700 bg-blue-100', count: true },
              ].map((item) => (
                <Card key={item.label}><CardContent className="p-4"><div className="flex items-center gap-3"><span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.tone)}><item.icon className="h-5 w-5" /></span><div><p className="text-lg font-bold sm:text-xl">{item.count ? item.value : formatCurrency(item.value)}</p><p className="text-xs text-muted-foreground">{item.label}</p></div></div></CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-5 w-5" />Movimientos reales desde la apertura</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {summary.linkedToShift === false && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">La migración de turnos aún no está aplicada; estos totales usan el horario de apertura como respaldo. Al aplicarla, cada movimiento quedará ligado a esta caja.</div>}
                <Table><TableHeader><TableRow><TableHead>Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Concepto</TableHead><TableHead>Método</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                  <TableBody>{summary.movimientos.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Todavía no hay movimientos en este turno.</TableCell></TableRow> : summary.movimientos.map((m) => <TableRow key={`${m.tipo}-${m.id}`}><TableCell>{m.fecha ? formatDateTime(m.fecha) : '—'}</TableCell><TableCell><Badge variant={m.tipo === 'Ingreso' ? 'secondary' : 'destructive'}>{m.tipo}</Badge></TableCell><TableCell>{m.concepto}</TableCell><TableCell>{m.metodo}</TableCell><TableCell className={cn('text-right font-semibold', m.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-red-700')}>{m.tipo === 'Ingreso' ? '+' : '-'}{formatCurrency(m.monto)}</TableCell></TableRow>)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <BitacoraPanel turnoId={turno?.id} />

        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-5 w-5" />Historial de turnos</CardTitle><ExportButton rows={() => historial} filename="turnos_vulo" sheetName="Turnos" /></CardHeader>
          <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Apertura</TableHead><TableHead>Usuario</TableHead><TableHead>Fondo</TableHead><TableHead>Contado</TableHead><TableHead>Diferencia</TableHead><TableHead>Entrega</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
            {historial.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">El primer turno aparecerá aquí.</TableCell></TableRow> : historial.map((t) => <TableRow key={t.id}><TableCell>{formatDateTime(t.abierto_at)}</TableCell><TableCell>{t.usuario_nombre}</TableCell><TableCell>{formatCurrency(t.fondo_inicial)}</TableCell><TableCell>{t.efectivo_contado == null ? '—' : formatCurrency(t.efectivo_contado)}</TableCell><TableCell className={cn('font-semibold', Number(t.diferencia) ? 'text-red-700' : 'text-emerald-700')}>{t.diferencia == null ? '—' : formatCurrency(t.diferencia)}</TableCell><TableCell className="max-w-56 truncate">{t.resumen_entrega || '—'}</TableCell><TableCell><Badge variant={t.estado === 'Abierto' ? 'default' : 'secondary'}>{t.estado}</Badge></TableCell></TableRow>)}
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

          <DialogFooter className="flex-row border-t border-[#10233F]/10 bg-slate-50/80 px-5 py-4 sm:justify-between sm:px-6">
            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button className="flex-1 bg-[#10233F] hover:bg-[#10233F]/90 sm:min-w-60" onClick={abrirTurno} disabled={saving || !validOpeningAmount}>
              {saving ? 'Abriendo turno…' : openingAmount > 0 ? `Abrir con ${formatCurrency(openingAmount)}` : 'Abrir sin fondo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}><DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Arqueo, entrega y cierre</DialogTitle></DialogHeader><div className="space-y-5 py-2">
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:grid-cols-4"><div><p className="text-xs text-slate-400">Fondo</p><p className="font-semibold">{formatCurrency(turno?.fondo_inicial)}</p></div><div><p className="text-xs text-slate-400">Efectivo ingresado</p><p className="font-semibold text-emerald-400">{formatCurrency(summary.efectivo)}</p></div><div><p className="text-xs text-slate-400">Egresos</p><p className="font-semibold text-red-400">{formatCurrency(summary.egresosEfectivo)}</p></div><div><p className="text-xs text-slate-400">Esperado</p><p className="text-lg font-bold">{formatCurrency(efectivoEsperado)}</p></div></div>
        <div><Label htmlFor="contado">Efectivo contado *</Label><Input id="contado" type="number" min="0" step="0.01" className="mt-2 text-lg" value={fondoContado} onChange={(e) => setFondoContado(e.target.value)} placeholder="0.00" />{fondoContado && <div className={cn('mt-2 flex items-center justify-between rounded-xl border p-3', Math.abs(diferencia) < 0.01 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50')}><span className="text-sm font-medium">Diferencia de caja</span><strong className={Math.abs(diferencia) < 0.01 ? 'text-emerald-700' : 'text-red-700'}>{formatCurrency(diferencia)}</strong></div>}</div>
        {Math.abs(diferencia) > 0.009 && <div><Label htmlFor="motivo">Motivo de la diferencia *</Label><Textarea id="motivo" className="mt-2" value={motivoDiferencia} onChange={(e) => setMotivoDiferencia(e.target.value)} placeholder="Explica qué ocurrió; quedará auditado." /></div>}
        <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="entrega-a">Entregar a</Label><Input id="entrega-a" className="mt-2" value={entregaA} onChange={(e) => setEntregaA(e.target.value)} placeholder="Siguiente responsable" /></div><div><Label htmlFor="resumen">Resumen de la operación *</Label><Input id="resumen" className="mt-2" value={resumenEntrega} onChange={(e) => setResumenEntrega(e.target.value)} placeholder="Cómo queda el hotel" /></div></div>
        <div><Label htmlFor="pendientes">Pendientes para el siguiente turno *</Label><Textarea id="pendientes" className="mt-2" rows={3} value={pendientesEntrega} onChange={(e) => setPendientesEntrega(e.target.value)} placeholder="Pagos, llegadas, solicitudes, habitaciones o incidentes. Si no hay, escribe “Sin pendientes”." /></div>
        <div className="rounded-2xl border p-4"><p className="mb-3 text-sm font-semibold">Confirmación obligatoria</p><div className="space-y-3">{[
          ['caja', 'Conté físicamente el efectivo y revisé los movimientos.'],
          ['pendientes', 'Documenté todos los pendientes para el siguiente turno.'],
          ['llegadas', 'Revisé llegadas, salidas y huéspedes con saldo.'],
          ['incidentes', 'Registré incidentes, promesas y observaciones relevantes.'],
        ].map(([key, label]) => <label key={key} className="flex cursor-pointer items-start gap-3 text-sm"><Checkbox checked={checks[key as keyof typeof checks]} onCheckedChange={(v) => setChecks((current) => ({ ...current, [key]: v === true }))} /><span>{label}</span></label>)}</div></div>
        {!allChecked && <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />El turno no podrá cerrarse hasta completar la entrega.</div>}
      </div><DialogFooter><Button variant="outline" onClick={() => setCloseDialog(false)}>Cancelar</Button><Button variant="destructive" onClick={cerrarTurno} disabled={saving || !allChecked}><CheckCircle2 className="mr-2 h-4 w-4" />{saving ? 'Cerrando…' : 'Cerrar y entregar'}</Button></DialogFooter></DialogContent></Dialog>
    </MainLayout>
  );
}
