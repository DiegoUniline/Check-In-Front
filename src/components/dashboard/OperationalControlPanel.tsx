import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import api, { type OperationalControl, type OperationalPriority } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const priorityStyle: Record<OperationalPriority, { shell: string; icon: string; label: string }> = {
  critical: { shell: 'border-red-200 bg-red-50/70', icon: 'bg-red-100 text-red-700', label: 'Crítico' },
  warning: { shell: 'border-amber-200 bg-amber-50/70', icon: 'bg-amber-100 text-amber-700', label: 'Atención' },
  info: { shell: 'border-blue-200 bg-blue-50/70', icon: 'bg-blue-100 text-blue-700', label: 'Informativo' },
};

export function OperationalControlPanel() {
  const navigate = useNavigate();
  const [control, setControl] = useState<OperationalControl | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      setControl(await api.getOperationalControl());
    } catch (error) {
      console.error('No se pudo cargar el control operativo:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const interval = window.setInterval(() => void load(true), 60_000);
    const onChange = () => void load(true);
    window.addEventListener('data:changed', onChange);
    window.addEventListener('vulo:bitacora-updated', onChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('data:changed', onChange);
      window.removeEventListener('vulo:bitacora-updated', onChange);
    };
  }, [load]);

  const status = useMemo(() => {
    if (!control) return { title: 'Calculando control', tone: 'text-muted-foreground', message: 'Revisando la operación del hotel.' };
    if (control.criticalCount > 0) return { title: 'Requiere atención inmediata', tone: 'text-red-700', message: `${control.criticalCount} situaciones pueden afectar la operación.` };
    if (control.warningCount > 0) return { title: 'Operación bajo control, con pendientes', tone: 'text-amber-700', message: `${control.warningCount} pendientes necesitan seguimiento.` };
    return { title: 'Hotel bajo control', tone: 'text-emerald-700', message: 'No hay situaciones críticas abiertas.' };
  }, [control]);

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl border bg-muted/45" />;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b bg-slate-950 px-5 py-5 text-white lg:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">VULO Control</h2>
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">{control?.storageMode === 'local' ? 'Respaldo local' : 'En tiempo real'}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-300">Lo que requiere atención antes de convertirse en un problema.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-36 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-end justify-between gap-3">
                <span className="text-xs text-slate-300">Nivel de control</span>
                <strong className="text-2xl leading-none">{control?.score ?? 0}</strong>
              </div>
              <Progress value={control?.score ?? 0} className="mt-2 h-1.5 bg-white/15" />
            </div>
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={refreshing} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b bg-slate-50 p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center gap-3">
            {control?.criticalCount ? <AlertTriangle className="h-6 w-6 text-red-600" /> : <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            <div>
              <p className={cn('font-semibold', status.tone)}>{status.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{status.message}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
            <button onClick={() => navigate('/turnos')} className="rounded-xl border bg-white p-3 text-left transition hover:border-orange-300 hover:shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" /> Turno</div>
              <p className="mt-1 text-sm font-semibold">{control?.openShift ? 'Abierto y activo' : 'Sin abrir'}</p>
            </button>
            <button onClick={() => navigate('/cierre-dia')} className="rounded-xl border bg-white p-3 text-left transition hover:border-orange-300 hover:shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><ClipboardCheck className="h-4 w-4" /> Cierre de hoy</div>
              <p className="mt-1 text-sm font-semibold">{control?.dayClosure?.estado === 'Cerrado' ? 'Día cerrado' : 'Pendiente'}</p>
            </button>
          </div>
        </aside>

        <div className="p-4 lg:p-5">
          {!control?.alerts.length ? (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed bg-emerald-50/40 p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h3 className="mt-3 font-semibold text-emerald-900">No hay pendientes operativos</h3>
              <p className="mt-1 text-sm text-emerald-800/70">La operación está lista para continuar.</p>
            </div>
          ) : (
            <div className="grid gap-2 xl:grid-cols-2">
              {control.alerts.slice(0, 8).map((alert) => {
                const style = priorityStyle[alert.priority];
                return (
                  <button key={alert.id} onClick={() => navigate(alert.action)} className={cn('group flex items-start gap-3 rounded-xl border p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm', style.shell)}>
                    <span className={cn('flex h-9 min-w-9 items-center justify-center rounded-xl text-sm font-bold', style.icon)}>{alert.count}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">{alert.title}</span>
                        <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">{style.label}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{alert.detail}</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-900">{alert.actionLabel}<ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
