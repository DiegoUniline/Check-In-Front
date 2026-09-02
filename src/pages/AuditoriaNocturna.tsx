import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/useAuth';
import { useToast } from '@/hooks/use-toast';
import api, { todayLocal, type NightAuditSnapshot } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';

export default function AuditoriaNocturna() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState(todayLocal());
  const [snapshot, setSnapshot] = useState<NightAuditSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [reopenDialog, setReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await api.getNightAuditSnapshot(date));
    } catch (error: any) {
      toast({ title: 'No se pudo preparar el cierre', description: error?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => { void load(); }, [load]);

  const blockers = useMemo(() => snapshot?.checks.filter((check) => check.blocking && !check.ok) || [], [snapshot]);
  const warnings = useMemo(() => snapshot?.checks.filter((check) => !check.blocking && !check.ok) || [], [snapshot]);
  const isClosed = snapshot?.closure?.estado === 'Cerrado';
  const canReopen = user?.rol === 'Admin' || user?.rol === 'Gerente' || user?.rol === 'SuperAdmin';

  const closeDay = async () => {
    if (!snapshot || blockers.length > 0) return;
    setSaving(true);
    try {
      const closure = await api.closeOperationalDay({
        fecha_operativa: date,
        checklist: snapshot.checks,
        resumen: snapshot.totals,
        observaciones: observaciones.trim() || undefined,
        cerrado_por: user?.id,
        cerrado_por_nombre: user?.nombre || user?.email,
      });
      toast({
        title: closure?._local_only ? 'Cierre guardado en este dispositivo' : 'Día operativo cerrado',
        description: closure?._local_only
          ? 'La protección central se activará cuando la base operativa esté actualizada.'
          : 'Los movimientos financieros de esta fecha quedaron bloqueados.',
      });
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo cerrar el día', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reopenDay = async () => {
    if (!snapshot?.closure?.id || !reopenReason.trim()) {
      toast({ title: 'Escribe el motivo de reapertura', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.reopenOperationalDay(snapshot.closure.id, { reabierto_por: user?.id, motivo_reapertura: reopenReason.trim() });
      toast({ title: 'Día reabierto', description: 'Los movimientos pueden corregirse; el motivo quedó registrado.' });
      setReopenDialog(false);
      setReopenReason('');
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo reabrir', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Cierre del día" subtitle="Nada pasa al día siguiente sin cuadrar">
      <div className="space-y-5">
        <Card className={cn('overflow-hidden border-2', isClosed ? 'border-emerald-200' : blockers.length ? 'border-red-200' : 'border-slate-200')}>
          <CardContent className={cn('p-5 lg:p-6', isClosed ? 'bg-emerald-50/70' : blockers.length ? 'bg-red-50/55' : 'bg-slate-50')}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', isClosed ? 'bg-emerald-100 text-emerald-700' : blockers.length ? 'bg-red-100 text-red-700' : 'bg-slate-900 text-white')}>
                  {isClosed ? <ShieldCheck className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{isClosed ? 'Día cerrado y protegido' : blockers.length ? 'El día todavía no puede cerrarse' : 'Todo listo para cerrar'}</h2>{isClosed && <Badge className="bg-emerald-600">Cerrado</Badge>}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{isClosed ? `Cerrado por ${snapshot?.closure?.cerrado_por_nombre || 'un responsable'} · ${formatDateTime(snapshot?.closure?.cerrado_at)}` : blockers.length ? `Resuelve ${blockers.length} validaciones obligatorias antes de continuar.` : 'La operación y las cajas pasaron las validaciones obligatorias.'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div><Label htmlFor="audit-date" className="text-xs">Fecha operativa</Label><Input id="audit-date" type="date" max={todayLocal()} className="mt-1 w-44 bg-white" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <Button variant="outline" size="icon" onClick={() => void load()}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></Button>
                {isClosed && canReopen && <Button variant="outline" onClick={() => setReopenDialog(true)}><RotateCcw className="mr-2 h-4 w-4" />Reabrir</Button>}
              </div>
            </div>
          </CardContent>
        </Card>

        {snapshot?.storageMode === 'local' && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="font-semibold">Respaldo local activo</p><p className="mt-0.5 text-amber-900/80">El cierre se conserva en este dispositivo, pero el bloqueo financiero central requiere aplicar la migración incluida.</p></div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Ingresos registrados', value: snapshot?.totals.ingresos || 0, icon: CircleDollarSign, tone: 'bg-emerald-100 text-emerald-700' },
            { label: 'Gastos registrados', value: snapshot?.totals.gastos || 0, icon: Banknote, tone: 'bg-red-100 text-red-700' },
            { label: 'Ventas POS', value: snapshot?.totals.ventas || 0, icon: CalendarCheck, tone: 'bg-blue-100 text-blue-700' },
            { label: 'Saldo en salidas', value: snapshot?.totals.saldoPendiente || 0, icon: AlertTriangle, tone: 'bg-amber-100 text-amber-700' },
          ].map((item) => <Card key={item.label}><CardContent className="p-4"><div className="flex items-center gap-3"><span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.tone)}><item.icon className="h-5 w-5" /></span><div><p className="text-lg font-bold">{formatCurrency(item.value)}</p><p className="text-xs text-muted-foreground">{item.label}</p></div></div></CardContent></Card>)}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Validaciones del cierre</CardTitle></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />) : snapshot?.checks.map((check) => (
              <div key={check.id} className={cn('flex items-start gap-3 rounded-xl border p-4', check.ok ? 'border-emerald-200 bg-emerald-50/45' : check.blocking ? 'border-red-200 bg-red-50/55' : 'border-amber-200 bg-amber-50/55')}>
                {check.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : check.blocking ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{check.label}</p>{!check.ok && <Badge variant={check.blocking ? 'destructive' : 'secondary'}>{check.count}</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>{!check.ok && check.action && <button onClick={() => navigate(check.action!)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">Resolver ahora<ArrowRight className="h-3.5 w-3.5" /></button>}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {!isClosed && (
          <Card><CardHeader><CardTitle className="text-base">Confirmar cierre operativo</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="observaciones">Observaciones del cierre</Label><Textarea id="observaciones" className="mt-2" rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Hechos relevantes del día, aclaraciones o seguimiento para gerencia." /></div>{warnings.length > 0 && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />Existen advertencias no bloqueantes. Quedarán guardadas en la fotografía del cierre.</div>}<div className="flex flex-col gap-3 rounded-xl bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Al cerrar se bloquearán pagos, gastos y ventas de esta fecha.</p><p className="text-sm text-slate-400">Sólo un administrador o gerente podrá reabrir con un motivo.</p></div><Button onClick={closeDay} disabled={saving || loading || blockers.length > 0} className="shrink-0 bg-orange-500 text-white hover:bg-orange-600"><LockKeyhole className="mr-2 h-4 w-4" />{saving ? 'Cerrando…' : 'Cerrar el día'}</Button></div></CardContent></Card>
        )}
      </div>

      <Dialog open={reopenDialog} onOpenChange={setReopenDialog}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Reabrir día operativo</DialogTitle></DialogHeader><div className="space-y-3 py-2"><div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><AlertTriangle className="h-4 w-4 shrink-0" />Esta acción permitirá modificar nuevamente movimientos financieros.</div><div><Label htmlFor="reopen-reason">Motivo obligatorio</Label><Textarea id="reopen-reason" className="mt-2" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Qué necesita corregirse y quién lo autorizó." /></div></div><DialogFooter><Button variant="outline" onClick={() => setReopenDialog(false)}>Cancelar</Button><Button variant="destructive" onClick={reopenDay} disabled={saving || !reopenReason.trim()}>Reabrir día</Button></DialogFooter></DialogContent></Dialog>
    </MainLayout>
  );
}
