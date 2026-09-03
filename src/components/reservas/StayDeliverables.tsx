import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Plus } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function StayDeliverables({ reservaId, active }: { reservaId: string; active: boolean }) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [items, reservationItems] = await Promise.all([api.getEntregables(), api.getEntregablesReserva(reservaId)]);
      setCatalog((items || []).filter((item: any) => item.activo !== false));
      setAssigned(reservationItems || []);
    } catch (error: any) {
      toast({ title: 'No se pudieron cargar los entregables', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reservaId]);

  const assign = async () => {
    const amount = Math.max(1, Number(quantity || 1));
    const deliverable = catalog.find((item) => item.id === selected);
    if (!deliverable) return;
    if (deliverable.stock != null && Number(deliverable.stock) < amount) {
      toast({ title: 'Stock insuficiente', description: `Sólo hay ${deliverable.stock} disponibles.`, variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      await api.asignarEntregable(reservaId, { entregable_id: selected, cantidad: amount, devuelto: false, fecha_entrega: new Date().toISOString() });
      toast({ title: 'Entregable asignado', description: `${amount} × ${deliverable.nombre}` });
      setSelected(''); setQuantity('1'); await load();
    } catch (error: any) {
      toast({ title: 'No se pudo asignar', description: error.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const markReturned = async (item: any) => {
    setProcessing(true);
    try {
      await api.devolverEntregable(item.id, { cantidad_devuelta: Number(item.cantidad || 1), costo_faltante: 0 });
      toast({ title: 'Devolución registrada', description: `${item.nombre} quedó completo.` });
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo registrar la devolución', description: error.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const pending = assigned.filter((item) => item.requiere_devolucion && !item.devuelto).length;
  return <section className="rounded-xl border border-[#10233F]/10 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="flex items-center gap-2 font-semibold text-[#10233F]"><KeyRound className="h-4 w-4" />Entregables</h2><p className="mt-1 text-sm text-muted-foreground">Llaves, controles, toallas u objetos que deben recuperarse.</p></div>{pending > 0 && <Badge className="bg-amber-600">{pending} pendiente{pending === 1 ? '' : 's'}</Badge>}</div>
    {active && <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px_auto]"><Select value={selected} onValueChange={setSelected} disabled={loading || processing}><SelectTrigger><SelectValue placeholder="Seleccionar entregable" /></SelectTrigger><SelectContent>{catalog.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}{item.stock != null ? ` · ${item.stock} disponibles` : ''}</SelectItem>)}</SelectContent></Select><Input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /><Button onClick={assign} disabled={!selected || processing}>{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Asignar</Button></div>}
    <div className="mt-4 divide-y rounded-xl border">{loading ? <div className="flex items-center justify-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando…</div> : assigned.length === 0 ? <p className="p-5 text-center text-sm text-muted-foreground">Sin entregables asignados.</p> : assigned.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 p-3"><div><p className="text-sm font-medium">{item.cantidad || 1} × {item.nombre}</p><p className="text-xs text-muted-foreground">{item.requiere_devolucion ? (item.devuelto ? 'Devuelto' : `Pendiente · reposición ${formatCurrency(item.costo_reposicion || 0)}`) : 'No requiere devolución'}</p></div>{item.devuelto ? <Badge variant="outline" className="border-emerald-200 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Completo</Badge> : item.requiere_devolucion && active ? <Button size="sm" variant="outline" disabled={processing} onClick={() => markReturned(item)}>Registrar devolución</Button> : null}</div>)}</div>
  </section>;
}
