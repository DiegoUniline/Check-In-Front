import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, HandCoins, RefreshCw, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PagosMultiplesGrid, type PagoItem } from '@/components/PagosMultiplesGrid';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useShift } from '@/contexts/useShift';
import { useAuth } from '@/contexts/useAuth';
import { canAccess } from '@/lib/permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateFormat';
import api from '@/lib/api';

const saldoDe = (r: any) => Math.max(0, Number(r.saldo_pendiente || 0));

export default function CuentasPorCobrar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasOpenShift } = useShift();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [verLiquidadas, setVerLiquidadas] = useState(false);
  const [cobrando, setCobrando] = useState<any | null>(null);
  const [pagos, setPagos] = useState<PagoItem[]>([]);
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const puedeCobrar = canAccess('reservas.operacion.partial_payment', user?.rol);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setRows(await api.getCuentasPorCobrar(verLiquidadas));
    } catch (error: any) {
      toast({ title: 'No se pudieron cargar las cuentas', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [verLiquidadas]);
  useRealtimeSync('reservas', () => void load(true));
  useRealtimeSync('pagos', () => void load(true));

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.cliente_nombre, r.numero_reserva, r.habitacion_numero, r.cliente_telefono]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, busqueda]);

  const pendientes = rows.filter((r) => !r.credito_liquidado);
  const totalPorCobrar = pendientes.reduce((s, r) => s + saldoDe(r), 0);
  const totalPagar = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);

  const abrirCobro = (r: any) => { setCobrando(r); setPagos([]); setReferencia(''); };

  const aplicar = async () => {
    if (!cobrando) return;
    const saldo = saldoDe(cobrando);
    if (totalPagar <= 0) {
      toast({ title: 'Captura el pago', description: 'Asigna un importe a una o varias formas de pago.', variant: 'destructive' });
      return;
    }
    if (totalPagar > saldo + 0.009) {
      toast({ title: 'Revisa el pago', description: 'El pago no puede superar el saldo pendiente.', variant: 'destructive' });
      return;
    }
    setGuardando(true);
    try {
      const { saldo: restante } = await api.aplicarPagoCredito(cobrando.id, pagos, referencia.trim());
      toast({
        title: restante <= 0.009 ? 'Crédito liquidado' : 'Pago aplicado',
        description: restante <= 0.009
          ? `${formatCurrency(totalPagar)} registrados en el turno. La cuenta quedó en ceros.`
          : `${formatCurrency(totalPagar)} registrados en el turno. Resta ${formatCurrency(restante)}.`,
      });
      setCobrando(null);
      await load(true);
    } catch (error: any) {
      toast({ title: 'No se pudo aplicar el pago', description: error.message, variant: 'destructive' });
      await load(true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <MainLayout title="Cuentas por cobrar" subtitle="Estancias que salieron a crédito">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[8px] border bg-white p-4">
            <p className="text-xs text-muted-foreground">Saldo por cobrar</p>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalPorCobrar)}</p>
          </div>
          <div className="rounded-[8px] border bg-white p-4">
            <p className="text-xs text-muted-foreground">Cuentas abiertas</p>
            <p className="text-2xl font-bold text-[#10233F]">{pendientes.length}</p>
          </div>
          <div className="rounded-[8px] border bg-white p-4">
            <p className="text-xs text-muted-foreground">Crédito otorgado (abiertas)</p>
            <p className="text-2xl font-bold text-[#10233F]">{formatCurrency(pendientes.reduce((s, r) => s + Number(r.credito_monto || 0), 0))}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Huésped, reserva, habitación o teléfono" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ver-liquidadas" checked={verLiquidadas} onCheckedChange={setVerLiquidadas} />
            <Label htmlFor="ver-liquidadas" className="text-sm">Incluir liquidadas</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-1.5 h-4 w-4" />Actualizar</Button>
        </div>

        {!hasOpenShift && (
          <div className="rounded-[8px] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Abre un turno para aplicar pagos; cada abono se registra en el corte del turno abierto.
          </div>
        )}

        <div className="overflow-x-auto rounded-[8px] border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Huésped</TableHead>
                <TableHead>Reserva</TableHead>
                <TableHead>Hab.</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
              ) : filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Sin cuentas por cobrar</TableCell></TableRow>
              ) : filtradas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.cliente_nombre || 'Sin nombre'}</p>
                    {r.cliente_telefono && <p className="text-xs text-muted-foreground">{r.cliente_telefono}</p>}
                  </TableCell>
                  <TableCell>#{r.numero_reserva || r.id.slice(0, 8)}</TableCell>
                  <TableCell>{r.habitacion_numero || '—'}</TableCell>
                  <TableCell>{formatDate(r.fecha_checkout)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.credito_monto || 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.total_pagado || 0))}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {r.credito_liquidado
                      ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">Liquidado</Badge>
                      : <span className="text-amber-700">{formatCurrency(saldoDe(r))}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/reservas/detalle/${r.id}`)} title="Ver expediente"><Eye className="h-4 w-4" /></Button>
                      {!r.credito_liquidado && puedeCobrar && (
                        <Button size="sm" className="bg-[#10233F] hover:bg-[#10233F]/90" disabled={!hasOpenShift || saldoDe(r) <= 0.009} onClick={() => abrirCobro(r)}>
                          <HandCoins className="mr-1.5 h-4 w-4" />Aplicar pago
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={Boolean(cobrando)} onOpenChange={(v) => { if (!v && !guardando) setCobrando(null); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aplicar pago · {cobrando?.cliente_nombre || ''} #{cobrando?.numero_reserva || ''}</DialogTitle>
          </DialogHeader>
          {cobrando && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-[8px] bg-amber-50 p-3 text-sm">
                <span>Saldo pendiente</span>
                <span className="text-lg font-bold text-amber-800">{formatCurrency(saldoDe(cobrando))}</span>
              </div>
              <PagosMultiplesGrid total={saldoDe(cobrando)} pagos={pagos} onChange={setPagos} />
              <div className="space-y-1.5">
                <Label>Referencia</Label>
                <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={guardando} onClick={() => setCobrando(null)}>Cancelar</Button>
            <Button className="bg-[#10233F] hover:bg-[#10233F]/90" disabled={guardando || totalPagar <= 0} onClick={() => void aplicar()}>
              {guardando ? 'Aplicando…' : `Aplicar ${formatCurrency(totalPagar)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
