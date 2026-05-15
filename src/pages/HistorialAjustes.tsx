import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, History, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function HistorialAjustes() {
  const { toast } = useToast();
  const [movs, setMovs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<string>('todos');

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.getMovimientosInventario(500);
      setMovs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return movs.filter(m => {
      const matchTipo = tipo === 'todos' || (m.tipo || '').toLowerCase() === tipo.toLowerCase();
      const matchSearch = !s
        || (m.producto_nombre || '').toLowerCase().includes(s)
        || (m.producto_codigo || '').toLowerCase().includes(s)
        || (m.motivo || '').toLowerCase().includes(s)
        || (m.usuario_nombre || '').toLowerCase().includes(s);
      return matchTipo && matchSearch;
    });
  }, [movs, search, tipo]);

  const totals = useMemo(() => ({
    total: filtered.length,
    ajustes: filtered.filter(m => (m.tipo || '').toLowerCase() === 'ajuste').length,
    entradas: filtered.filter(m => (m.tipo || '').toLowerCase() === 'entrada').length,
    salidas: filtered.filter(m => (m.tipo || '').toLowerCase() === 'salida').length,
  }), [filtered]);

  if (loading) {
    return (
      <MainLayout title="Historial de Ajustes" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Historial de Ajustes" subtitle="Todos los movimientos de inventario registrados">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Movimientos</p><p className="text-2xl font-bold">{totals.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ajustes</p><p className="text-2xl font-bold">{totals.ajustes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Entradas</p><p className="text-2xl font-bold text-success">{totals.entradas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Salidas</p><p className="text-2xl font-bold text-destructive">{totals.salidas}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Movimientos</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar producto, motivo, usuario..." className="pl-9 w-[280px]" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ajuste">Ajustes</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="salida">Salidas</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon" variant="outline" onClick={cargar}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Antes → Después</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => {
                const t = (m.tipo || '').toLowerCase();
                const variant = t === 'entrada' ? 'default' : t === 'salida' ? 'destructive' : 'secondary';
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{m.producto_nombre || '—'}</div>
                      {m.producto_codigo && <div className="text-xs text-muted-foreground font-mono">{m.producto_codigo}</div>}
                    </TableCell>
                    <TableCell><Badge variant={variant as any} className="capitalize">{m.tipo}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{m.cantidad}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{m.stock_anterior} → {m.stock_nuevo}</TableCell>
                    <TableCell className="text-sm">{m.motivo || '—'}</TableCell>
                    <TableCell className="text-sm">{m.usuario_nombre || 'Sistema'}</TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin movimientos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </MainLayout>
  );
}