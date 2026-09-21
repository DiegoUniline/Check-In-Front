import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Plus, RotateCcw, Search } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function StayDeliverables({ reservaId, active }: { reservaId: string; active: boolean }) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [search, setSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [items, reservationItems] = await Promise.all([
        api.getEntregables(),
        api.getEntregablesReserva(reservaId),
      ]);
      setCatalog((items || []).filter((item: any) => item.activo !== false));
      setAssigned(reservationItems || []);
    } catch (error: any) {
      toast({ title: 'No se pudieron cargar los entregables', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [reservaId]);

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter((item) =>
      `${item.nombre || ''} ${item.descripcion || ''}`.toLowerCase().includes(query),
    );
  }, [catalog, search]);

  const openAssign = () => {
    setSelected('');
    setQuantity('1');
    setSearch('');
    setAssignOpen(true);
  };

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
      await api.asignarEntregable(reservaId, {
        entregable_id: selected,
        cantidad: amount,
      });
      toast({ title: 'Entregable asignado', description: `${amount} × ${deliverable.nombre}` });
      setAssignOpen(false);
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo asignar', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const markReturned = async (item: any) => {
    setProcessing(true);
    try {
      await api.devolverEntregable(item.id, {
        cantidad_devuelta: Number(item.cantidad || 1),
      });
      toast({ title: 'Devolución registrada', description: `${item.nombre} quedó completo.` });
      await load();
    } catch (error: any) {
      toast({ title: 'No se pudo registrar la devolución', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const pending = assigned.filter((item) => item.requiere_devolucion && !item.devuelto).length;

  return <>
    <section className="overflow-hidden rounded-[8px] border border-slate-200/90 bg-white">
      <div className="flex min-h-[52px] items-center justify-between gap-3 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <KeyRound className="h-4 w-4 shrink-0 text-[#10233F]" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#10233F]">Entregables</h2>
            <p className="truncate text-xs text-muted-foreground">
              {loading
                ? 'Cargando…'
                : assigned.length === 0
                  ? 'Ningún entregable asignado'
                  : `${assigned.length} asignado${assigned.length === 1 ? '' : 's'}${pending ? ` · ${pending} pendiente${pending === 1 ? '' : 's'}` : ''}`}
            </p>
          </div>
        </div>
        {active && <Button variant="ghost" size="toolbar" className="h-8 shrink-0 px-2.5 text-xs" onClick={openAssign}>
          <Plus className="mr-1 h-3.5 w-3.5" />Asignar
        </Button>}
      </div>

      {!loading && assigned.length > 0 && <div className="divide-y border-t">
        {assigned.map((item) => {
          const quantityAssigned = Number(item.cantidad || 1);
          const quantityReturned = Number(item.cantidad_devuelta || 0);
          return <div key={item.id} className="flex min-h-10 items-center justify-between gap-3 px-3.5 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                {quantityAssigned} entregado{quantityAssigned === 1 ? '' : 's'}
                {item.requiere_devolucion
                  ? item.devuelto
                    ? ` · ${quantityReturned} devuelto${quantityReturned === 1 ? '' : 's'}`
                    : ` · Reposición ${formatCurrency(item.costo_reposicion || 0)}`
                  : ' · No requiere devolución'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.devuelto
                ? <Badge variant="outline" className="border-emerald-200 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Devuelto</Badge>
                : item.requiere_devolucion
                  ? <Badge variant="outline" className="border-amber-200 text-amber-700">Pendiente</Badge>
                  : <Badge variant="outline">Entregado</Badge>}
              {!item.devuelto && item.requiere_devolucion && active && <Button size="toolbar" variant="outline" className="h-8 px-2.5 text-xs" disabled={processing} onClick={() => markReturned(item)}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />Devolver
              </Button>}
            </div>
          </div>;
        })}
      </div>}
    </section>

    <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
      <DialogContent className="rounded-[8px] shadow-lg sm:max-w-lg [&_button]:rounded-[6px] [&_input]:rounded-[6px] [&_[role=combobox]]:rounded-[6px]">
        <DialogHeader>
          <DialogTitle>Asignar entregable</DialogTitle>
          <DialogDescription>Selecciona el objeto y la cantidad. El stock y la auditoría se actualizan al confirmar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-[6px] pl-9" placeholder="Buscar entregable…" />
          </div>
          <Select value={selected} onValueChange={setSelected} disabled={processing}>
            <SelectTrigger className="rounded-[6px]"><SelectValue placeholder="Seleccionar entregable" /></SelectTrigger>
            <SelectContent>
              {filteredCatalog.length === 0
                ? <div className="px-3 py-4 text-center text-sm text-muted-foreground">Sin coincidencias</div>
                : filteredCatalog.map((item) => <SelectItem key={item.id} value={item.id}>
                  {item.nombre}{item.stock != null ? ` · ${item.stock} disponibles` : ''}
                </SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Cantidad</label>
            <Input className="rounded-[6px]" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-[6px]" onClick={() => setAssignOpen(false)}>Cancelar</Button>
          <Button onClick={assign} disabled={!selected || processing} className="rounded-[6px] bg-[#10233F] hover:bg-[#10233F]/90">
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
