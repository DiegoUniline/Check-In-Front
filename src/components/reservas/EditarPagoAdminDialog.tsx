import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/dateFormat';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: any;
  onSaved?: () => void | Promise<void>;
};

const KEEP = '__keep';
const NONE = '__none';

const toLocalInput = (value?: string | null) => {
  if (!value) return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const raw = String(value);
  const date = raw.length <= 10 ? new Date(`${raw}T12:00:00`) : new Date(raw);
  return Number.isNaN(date.getTime()) ? format(new Date(), "yyyy-MM-dd'T'HH:mm") : format(date, "yyyy-MM-dd'T'HH:mm");
};

const turnoLabel = (t: any) =>
  `${t.usuario_nombre} · ${formatDateTime(t.abierto_at)}${t.cerrado_at ? ` → ${formatDateTime(t.cerrado_at)}` : ''} · ${t.estado}`;

export function EditarPagoAdminDialog({ open, onOpenChange, pago, onSaved }: Props) {
  const { toast } = useToast();
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [turnoSel, setTurnoSel] = useState(KEEP);
  const [estado, setEstado] = useState<'Activo' | 'Cancelado'>('Activo');
  const [motivo, setMotivo] = useState('');
  const [recalcular, setRecalcular] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [metodos, setMetodos] = useState<any[]>([]);
  const [turnos, setTurnos] = useState<any[]>([]);
  const [turnoActual, setTurnoActual] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !pago) return;
    setMonto(String(pago.monto ?? ''));
    setMetodo(pago.metodo_pago || '');
    setReferencia(pago.referencia || '');
    setFecha(toLocalInput(pago.created_at || pago.fecha));
    setUsuarioId(pago.created_by || '');
    setTurnoSel(KEEP);
    setEstado(pago.estado === 'Cancelado' ? 'Cancelado' : 'Activo');
    setMotivo('');
    setRecalcular(true);
    setTurnoActual(null);
    let alive = true;
    Promise.all([
      api.getUsuarios().catch(() => []),
      api.getMetodosPago().catch(() => []),
      pago.turno_id ? api.getTurno(pago.turno_id).catch(() => null) : Promise.resolve(null),
    ]).then(([u, m, t]) => {
      if (!alive) return;
      setUsuarios(u || []);
      setMetodos(m || []);
      setTurnoActual(t);
    });
    return () => { alive = false; };
  }, [open, pago?.id]);

  useEffect(() => {
    if (!open || !fecha) return;
    let alive = true;
    api.getTurnosAlrededor(new Date(fecha).toISOString())
      .then((list) => { if (alive) setTurnos(list); })
      .catch(() => { if (alive) setTurnos([]); });
    return () => { alive = false; };
  }, [open, fecha.slice(0, 10)]);

  const metodosOpciones = useMemo(() => {
    const names = metodos.map((m) => m.nombre).filter(Boolean);
    return metodo && !names.includes(metodo) ? [metodo, ...names] : names;
  }, [metodos, metodo]);

  const turnoDestino = turnoSel === KEEP ? turnoActual : turnoSel === NONE ? null : turnos.find((t) => t.id === turnoSel);
  const turnosAfectados = [turnoActual, turnoDestino]
    .filter((t, i, arr) => t && t.estado === 'Cerrado' && arr.findIndex((x) => x?.id === t.id) === i);

  const guardar = async () => {
    const amount = Number(monto);
    if (!(amount > 0)) { toast({ title: 'El importe debe ser mayor a cero', variant: 'destructive' }); return; }
    if (!metodo) { toast({ title: 'Selecciona el método de pago', variant: 'destructive' }); return; }
    if (!fecha) { toast({ title: 'Indica la fecha', variant: 'destructive' }); return; }
    if (motivo.trim().length < 3) { toast({ title: 'Escribe el motivo', variant: 'destructive' }); return; }
    setGuardando(true);
    try {
      const result = await api.adminEditarPago({
        paymentId: pago.id,
        monto: amount,
        metodo,
        referencia,
        fecha: new Date(fecha).toISOString(),
        usuarioId: usuarioId || null,
        turnoId: turnoSel !== KEEP && turnoSel !== NONE ? turnoSel : null,
        quitarTurno: turnoSel === NONE,
        estado,
        motivo: motivo.trim(),
        recalcularTurno: recalcular,
      });
      const recalculados = (result?.turnos_recalculados || []).filter((t: any) => t?.recalculado);
      toast({
        title: 'Pago actualizado',
        description: recalculados.length
          ? recalculados.map((t: any) =>
            `Corte de ${t.usuario}: esperado ${formatCurrency(t.esperado_anterior)} → ${formatCurrency(t.esperado)}, diferencia ${formatCurrency(t.diferencia)}`).join(' · ')
          : 'Saldo de la reserva recalculado.',
      });
      onOpenChange(false);
      await onSaved?.();
    } catch (error: any) {
      toast({ title: 'No se pudo editar el pago', description: error.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  return <Dialog open={open} onOpenChange={(v) => !guardando && onOpenChange(v)}>
    <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Editar pago (administrador)</DialogTitle>
        <DialogDescription>
          {pago?.numero_pago ? `#${pago.numero_pago} · ` : ''}Original: {formatCurrency(pago?.monto)} · {pago?.metodo_pago || '—'} · {pago?.created_by_nombre || 'Sin usuario'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Importe</Label>
          <Input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Método de pago</Label>
          <Select value={metodo} onValueChange={setMetodo}>
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              {metodosOpciones.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Fecha y hora</Label>
          <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Referencia</Label>
          <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Registró</Label>
          <Select value={usuarioId} onValueChange={setUsuarioId}>
            <SelectTrigger><SelectValue placeholder={pago?.created_by_nombre || 'Selecciona usuario'} /></SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>
                {[u.nombre, u.apellido_paterno].filter(Boolean).join(' ') || u.email} · {u.rol}
              </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select value={estado} onValueChange={(v) => setEstado(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Turno / corte de caja</Label>
          <Select value={turnoSel} onValueChange={setTurnoSel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={KEEP}>Mantener: {turnoActual ? turnoLabel(turnoActual) : pago?.turno_id ? 'turno actual' : 'sin turno'}</SelectItem>
              {turnos.filter((t) => t.id !== pago?.turno_id).map((t) => <SelectItem key={t.id} value={t.id}>{turnoLabel(t)}</SelectItem>)}
              {pago?.turno_id && <SelectItem value={NONE}>Quitar de cualquier turno</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Motivo de la corrección</Label>
          <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Se capturó en efectivo pero fue con tarjeta" />
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
        <Checkbox checked={recalcular} onCheckedChange={(v) => setRecalcular(Boolean(v))} className="mt-0.5" />
        <span>
          <strong>Actualizar reporte de corte del turno y recalcular todo.</strong>
          {turnosAfectados.length
            ? <> Se recalcularán: {turnosAfectados.map((t: any) => t.usuario_nombre).join(', ')} (efectivo esperado, diferencia, totales por método y reporte). El efectivo contado se conserva.</>
            : <> Ningún corte cerrado afectado; si el turno sigue abierto se calcula en vivo.</>}
        </span>
      </label>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>Cancelar</Button>
        <Button onClick={() => void guardar()} disabled={guardando}>
          {guardando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Guardar cambios
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
