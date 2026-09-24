import { useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import api, { todayLocal } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateFormat';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: any;
  onDone?: () => void | Promise<void>;
};

const d = (v: any) => String(v || '').slice(0, 10);

export function ReactivarReservaDialog({ open, onOpenChange, reserva, onDone }: Props) {
  const { toast } = useToast();
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [habitacionId, setHabitacionId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const vencida = d(reserva?.fecha_checkout) < todayLocal();

  useEffect(() => {
    if (!open || !reserva || vencida) return;
    setMotivo('');
    let cancel = false;
    setCargando(true);
    api.getHabitacionesDisponibles(d(reserva.fecha_checkin), d(reserva.fecha_checkout), undefined, reserva.id)
      .then((lista: any[]) => {
        if (cancel) return;
        setHabitaciones(lista || []);
        const actualLibre = (lista || []).some((h) => h.id === reserva.habitacion_id);
        setHabitacionId(actualLibre ? reserva.habitacion_id : '');
      })
      .catch(() => { if (!cancel) setHabitaciones([]); })
      .finally(() => { if (!cancel) setCargando(false); });
    return () => { cancel = true; };
  }, [open, reserva?.id, vencida]);

  const actualLibre = habitaciones.some((h) => h.id === reserva?.habitacion_id);

  const reactivar = async () => {
    if (!habitacionId) { toast({ title: 'Elige una habitación libre', variant: 'destructive' }); return; }
    if (motivo.trim().length < 3) { toast({ title: 'Escribe el motivo', variant: 'destructive' }); return; }
    setGuardando(true);
    try {
      await api.reactivarReserva(reserva.id, habitacionId, motivo.trim());
      toast({ title: 'Reserva reactivada', description: 'Volvió a quedar confirmada y bloquea la habitación.' });
      onOpenChange(false);
      await onDone?.();
    } catch (error: any) {
      toast({ title: 'No se pudo reactivar', description: error.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  if (!reserva) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!guardando) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-4 w-4" />Reactivar reserva</DialogTitle>
          <DialogDescription>
            {formatDate(d(reserva.fecha_checkin))} → {formatDate(d(reserva.fecha_checkout))}. Volverá a quedar Confirmada; los pagos se conservan.
          </DialogDescription>
        </DialogHeader>

        {vencida ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Las fechas de esta reserva ya pasaron. Crea una reservación nueva.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Habitación</Label>
              {cargando ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando habitaciones libres…</p> : habitaciones.length === 0 ? (
                <p className="text-sm text-red-600">No hay habitaciones libres para esas fechas.</p>
              ) : (
                <Select value={habitacionId} onValueChange={setHabitacionId}>
                  <SelectTrigger><SelectValue placeholder="Elige una habitación libre" /></SelectTrigger>
                  <SelectContent>
                    {habitaciones.map((h) => (
                      <SelectItem key={h.id} value={h.id}>#{h.numero} · {h.tipos_habitacion?.nombre || 'Sin tipo'}{h.id === reserva.habitacion_id ? ' (original)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!cargando && !actualLibre && habitaciones.length > 0 && <p className="text-xs text-amber-700">La habitación original ya se ocupó; elige otra.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. el huésped confirmó que sí llega" />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>Cerrar</Button>
          {!vencida && <Button className="bg-[#10233F] hover:bg-[#10233F]/90" onClick={reactivar} disabled={guardando || cargando || !habitacionId}>
            {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reactivando…</> : 'Reactivar'}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
