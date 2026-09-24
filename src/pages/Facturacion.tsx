import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, Search, Send, CheckCircle2, Undo2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';

type EstadoFactura = 'Pendiente' | 'Realizada' | 'Enviada';

const ESTADOS: { id: EstadoFactura; label: string; badge: string }[] = [
  { id: 'Pendiente', label: 'Pendientes', badge: 'border-amber-200 bg-amber-50 text-amber-800' },
  { id: 'Realizada', label: 'Realizadas', badge: 'border-blue-200 bg-blue-50 text-blue-800' },
  { id: 'Enviada', label: 'Enviadas', badge: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
];

export default function Facturacion() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<EstadoFactura>('Pendiente');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ row: any; estado: EstadoFactura } | null>(null);
  const [folio, setFolio] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setRows(await api.getFacturacion());
    } catch (error: any) {
      toast({ title: 'No se pudo cargar facturación', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useRealtimeSync('reservas', () => void load(true));

  const counts = useMemo(() => ESTADOS.reduce((acc, e) => ({
    ...acc,
    [e.id]: rows.filter((r) => (r.factura_estado || 'Pendiente') === e.id).length,
  }), {} as Record<EstadoFactura, number>), [rows]);

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (r.factura_estado || 'Pendiente') === tab)
      .filter((r) => !q || [r.numero_reserva, r.cliente_nombre, r.clientes?.numero_documento, r.factura_folio, r.habitacion_numero]
        .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, tab, query]);

  const openChange = (row: any, estado: EstadoFactura) => {
    setFolio(row.factura_folio || '');
    setNotas(row.factura_notas || '');
    setEditing({ row, estado });
  };

  const applyChange = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.updateFacturaEstado(editing.row.id, editing.estado, { folio: folio.trim(), notas: notas.trim() });
      toast({ title: `Factura ${editing.estado.toLowerCase()}`, description: `Reserva #${editing.row.numero_reserva || String(editing.row.id).slice(0, 8)}` });
      setEditing(null);
      await load(true);
    } catch (error: any) {
      toast({ title: 'No se pudo actualizar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Facturación" subtitle="Reservaciones que requieren factura">
      <div className="space-y-3">
        <Card>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as EstadoFactura)}>
              <TabsList>
                {ESTADOS.map((e) => (
                  <TabsTrigger key={e.id} value={e.id} className="gap-1.5">
                    {e.label}
                    <span className="rounded-full bg-background px-1.5 text-[10px] font-semibold tabular-nums">{counts[e.id] || 0}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 w-64 pl-8 text-sm" placeholder="Reserva, huésped, RFC, folio…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" onClick={() => void load()} title="Actualizar">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reserva</TableHead>
                <TableHead>Huésped / RFC</TableHead>
                <TableHead>Estancia</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último cambio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
              ) : visibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">No hay facturas {ESTADOS.find((e) => e.id === tab)?.label.toLowerCase()}.</p>
                  </TableCell>
                </TableRow>
              ) : visibles.map((r) => {
                const estado = (r.factura_estado || 'Pendiente') as EstadoFactura;
                const meta = ESTADOS.find((e) => e.id === estado)!;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <button className="font-mono text-sm font-medium text-primary hover:underline" onClick={() => navigate(`/reservas/detalle/${r.id}`)}>
                        #{r.numero_reserva || String(r.id).slice(0, 8)}
                      </button>
                      <p className="text-xs text-muted-foreground">Hab. {r.habitacion_numero || '—'} · {r.estado}</p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[200px] truncate text-sm font-medium">{r.cliente_nombre || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.clientes?.numero_documento ? `${r.clientes?.tipo_documento || 'Doc'}: ${r.clientes.numero_documento}` : 'Sin RFC capturado'}
                        {r.clientes?.email ? ` · ${r.clientes.email}` : ''}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(r.fecha_checkin)} → {formatDate(r.fecha_checkout)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{formatCurrency(Number(r.total || 0))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={meta.badge}>{estado}</Badge>
                      {r.factura_folio && <p className="mt-1 text-xs text-muted-foreground">Folio {r.factura_folio}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.factura_actualizada_at ? <>
                        <p>{r.factura_actualizada_por_nombre || '—'}</p>
                        <p>{formatDateTime(r.factura_actualizada_at)}</p>
                      </> : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {estado === 'Pendiente' && (
                          <Button size="sm" onClick={() => openChange(r, 'Realizada')}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Realizada</Button>
                        )}
                        {estado === 'Realizada' && <>
                          <Button size="sm" variant="outline" onClick={() => openChange(r, 'Pendiente')}><Undo2 className="mr-1.5 h-3.5 w-3.5" />Pendiente</Button>
                          <Button size="sm" onClick={() => openChange(r, 'Enviada')}><Send className="mr-1.5 h-3.5 w-3.5" />Enviada</Button>
                        </>}
                        {estado === 'Enviada' && (
                          <Button size="sm" variant="outline" onClick={() => openChange(r, 'Realizada')}><Undo2 className="mr-1.5 h-3.5 w-3.5" />Realizada</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar factura como {editing?.estado}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Reserva #{editing.row.numero_reserva || String(editing.row.id).slice(0, 8)} · {editing.row.cliente_nombre} · {formatCurrency(Number(editing.row.total || 0))}
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="factura-folio">Folio de la factura</label>
                <Input id="factura-folio" value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="factura-notas">Notas</label>
                <textarea id="factura-notas" rows={2} className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional (correo al que se envió, observaciones…)" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>Volver</Button>
                <Button disabled={saving} onClick={() => void applyChange()}>{saving ? 'Guardando…' : 'Confirmar'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
