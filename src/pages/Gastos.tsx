import { useEffect, useMemo, useState } from 'react';
import {
  Building,
  Car,
  DollarSign,
  Eye,
  FileText,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataTable } from '@/hooks/useDataTable';
import { SortHeader } from '@/components/datatable/SortHeader';
import { BulkActionBar } from '@/components/datatable/BulkActionBar';
import { exportToCsv } from '@/lib/exportCsv';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import api, { todayLocal } from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/dateFormat';

const categoriasConfig = [
  { id: 'Operación', nombre: 'Operación', icon: Building, tone: 'bg-info/10 text-info' },
  { id: 'Mantenimiento', nombre: 'Mantenimiento', icon: Wrench, tone: 'bg-primary/10 text-primary' },
  { id: 'Suministros', nombre: 'Suministros', icon: Package, tone: 'bg-success/10 text-success' },
  { id: 'Alimentos', nombre: 'Alimentos y Bebidas', icon: Utensils, tone: 'bg-warning/10 text-warning' },
  { id: 'Transporte', nombre: 'Transporte', icon: Car, tone: 'bg-muted text-muted-foreground' },
  { id: 'Personal', nombre: 'Personal', icon: Users, tone: 'bg-info/10 text-info' },
  { id: 'Otros', nombre: 'Otros', icon: Tag, tone: 'bg-muted text-muted-foreground' },
];

type Periodo = 'hoy' | 'mes' | 'todo';

const emptyForm = {
  categoria: '',
  monto: '',
  descripcion: '',
  metodo_pago: 'Efectivo',
  proveedor: '',
  proveedor_id: '',
  factura: '',
  notas: '',
};

const fechaGasto = (g: any) => {
  const raw = g?.fecha || g?.created_at;
  if (!raw) return null;
  try {
    const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export default function Gastos() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gastos, setGastos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [isNewGastoOpen, setIsNewGastoOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; gasto: any | null }>({ open: false, gasto: null });
  const [comprobanteModal, setComprobanteModal] = useState<{ open: boolean; gasto: any | null; url?: string | null }>({ open: false, gasto: null, url: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; gasto: any | null }>({ open: false, gasto: null });
  const [eliminandoBulk, setEliminandoBulk] = useState(false);

  const cargarGastos = async () => {
    setLoading(true);
    try {
      const [gastosData, proveedoresData] = await Promise.all([
        api.getGastos(),
        api.getProveedores().catch(() => []),
      ]);
      setGastos(Array.isArray(gastosData) ? gastosData : []);
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudieron cargar los gastos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarGastos(); }, []);

  const hoy = useMemo(() => parseISO(todayLocal()), [gastos.length]);
  const gastosPeriodo = useMemo(() => gastos.filter((g) => {
    const fecha = fechaGasto(g);
    if (!fecha) return periodo === 'todo';
    if (periodo === 'hoy') return isSameDay(fecha, hoy);
    if (periodo === 'mes') return isSameMonth(fecha, hoy);
    return true;
  }), [gastos, periodo, hoy]);

  const filteredGastos = useMemo(() => gastosPeriodo.filter((g) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || [g.descripcion, g.proveedor, g.factura, g.metodo_pago]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
    const matchCategoria = filterCategoria === 'all' || g.categoria === filterCategoria;
    return matchSearch && matchCategoria;
  }), [gastosPeriodo, searchQuery, filterCategoria]);

  const accessors = useMemo(() => ({
    fecha: (g: any) => g.fecha || g.created_at || '',
    categoria: (g: any) => g.categoria || '',
    descripcion: (g: any) => g.descripcion || '',
    proveedor: (g: any) => g.proveedor || '',
    metodo: (g: any) => g.metodo_pago || '',
    monto: (g: any) => Number(g.monto) || 0,
  }), []);
  const dt = useDataTable<any>(filteredGastos, accessors, { storageKey: 'gastos' });

  const totalMes = useMemo(() => gastos.filter((g) => {
    const fecha = fechaGasto(g);
    return fecha ? isSameMonth(fecha, hoy) : false;
  }).reduce((s, g) => s + (Number(g.monto) || 0), 0), [gastos, hoy]);
  const totalHoy = useMemo(() => gastos.filter((g) => {
    const fecha = fechaGasto(g);
    return fecha ? isSameDay(fecha, hoy) : false;
  }).reduce((s, g) => s + (Number(g.monto) || 0), 0), [gastos, hoy]);
  const totalPeriodo = useMemo(() => gastosPeriodo.reduce((s, g) => s + (Number(g.monto) || 0), 0), [gastosPeriodo]);

  const gastosPorCategoria = useMemo(() => categoriasConfig.map((cat) => ({
    ...cat,
    count: gastosPeriodo.filter((g) => g.categoria === cat.id).length,
    total: gastosPeriodo.filter((g) => g.categoria === cat.id).reduce((s, g) => s + (Number(g.monto) || 0), 0),
  })).sort((a, b) => b.total - a.total), [gastosPeriodo]);

  const getCategoriaInfo = (id: string) => categoriasConfig.find((c) => c.id === id) || categoriasConfig[categoriasConfig.length - 1];

  const handleResetAll = () => {
    setSearchQuery('');
    setFilterCategoria('all');
    setPeriodo('mes');
    dt.resetPersisted();
  };

  const handleNuevoGasto = async () => {
    const monto = Number(formData.monto);
    if (!formData.categoria || !Number.isFinite(monto) || monto <= 0) {
      toast({ title: 'Revisa el gasto', description: 'Selecciona una categoría e ingresa un monto mayor a cero.', variant: 'destructive' });
      return;
    }
    const descripcion = formData.descripcion.trim() || `Gasto ${getCategoriaInfo(formData.categoria).nombre}`;
    setSaving(true);
    try {
      await api.createGasto({
        categoria: formData.categoria,
        monto,
        descripcion,
        metodo_pago: formData.metodo_pago,
        proveedor: formData.proveedor || null,
        factura: formData.factura.trim() || null,
        notas: formData.notas.trim() || null,
        // Fecha del hotel, no UTC. Evita que un gasto nocturno caiga en el día siguiente.
        fecha: todayLocal(),
      });
      toast({ title: 'Gasto registrado', description: `${descripcion} · ${formatCurrency(monto)}` });
      setIsNewGastoOpen(false);
      setFormData(emptyForm);
      await cargarGastos();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo registrar el gasto', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const eliminarSeleccionados = async () => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map((id) => api.deleteGasto(id)));
      toast({ title: 'Gastos eliminados', description: `${ids.length} registro(s) eliminados.` });
      dt.clearSelection();
      await cargarGastos();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudieron eliminar', variant: 'destructive' });
    } finally {
      setEliminandoBulk(false);
    }
  };

  const exportarCsv = () => {
    const rows = dt.selectedRows.length ? dt.selectedRows : dt.processed;
    exportToCsv('gastos', rows, [
      { key: 'fecha', label: 'Fecha', accessor: (g) => g.fecha || g.created_at },
      { key: 'categoria', label: 'Categoría' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'proveedor', label: 'Proveedor' },
      { key: 'metodo_pago', label: 'Método' },
      { key: 'monto', label: 'Monto' },
      { key: 'factura', label: 'Comprobante' },
    ]);
  };

  const handleDeleteGasto = async () => {
    if (!deleteDialog.gasto) return;
    try {
      await api.deleteGasto(deleteDialog.gasto.id);
      toast({ title: 'Gasto eliminado' });
      setDeleteDialog({ open: false, gasto: null });
      await cargarGastos();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const handleVerDetalle = async (gasto: any) => {
    const detalles = await api.getGasto(gasto.id).catch(() => gasto);
    setDetalleModal({ open: true, gasto: detalles || gasto });
  };

  const getComprobanteUrl = (factura?: string | null) => {
    const raw = String(factura || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      return `${apiUrl.replace(/\/api\/?$/i, '')}${raw}`;
    }
    return null;
  };

  const handleVerComprobante = async (gasto: any) => {
    const detalles = await api.getGasto(gasto.id).catch(() => gasto);
    const factura = String(detalles?.factura || '').trim();
    if (!factura) {
      toast({ title: 'Sin comprobante', description: 'Este gasto no tiene folio, archivo o URL asociada.' });
      return;
    }
    setComprobanteModal({ open: true, gasto: detalles, url: getComprobanteUrl(factura) });
  };

  if (loading) {
    return (
      <MainLayout title="Gastos" subtitle="Registro y seguimiento de egresos">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border bg-muted/30 animate-pulse" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Gastos" subtitle="Control de egresos, proveedores y comprobantes">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <Metric label="Este mes" value={formatCurrency(totalMes)} icon={TrendingDown} emphasis />
        <Metric label="Hoy" value={formatCurrency(totalHoy)} icon={DollarSign} />
        <Metric label={periodo === 'todo' ? 'Historial' : periodo === 'hoy' ? 'Registros hoy' : 'Registros mes'} value={String(gastosPeriodo.length)} icon={Receipt} />
        <Metric label="Período visible" value={formatCurrency(totalPeriodo)} icon={Tag} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <TabsList className="grid grid-cols-3 w-full lg:w-fit">
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="mes">Este mes</TabsTrigger>
            <TabsTrigger value="todo">Todo</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setIsNewGastoOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Registrar gasto
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 mb-4">
        {gastosPorCategoria.map((cat) => {
          const Icon = cat.icon;
          const active = filterCategoria === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategoria(active ? 'all' : cat.id)}
              className={`rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/30 ${active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'bg-card'}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`rounded-lg p-1.5 ${cat.tone}`}><Icon className="h-4 w-4" /></span>
                <span className="text-[11px] text-muted-foreground">{cat.count}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{cat.nombre}</p>
              <p className="text-sm font-semibold truncate">{formatCurrency(cat.total)}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-2 mb-4">
        <div className="relative flex-1 xl:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar descripción, proveedor, comprobante..." className="pl-9" />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="xl:w-[190px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categoriasConfig.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2 xl:ml-auto">
          <Button variant="outline" size="icon" onClick={cargarGastos} title="Actualizar"><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleResetAll}><RotateCcw className="mr-1.5 h-4 w-4" />Restablecer</Button>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {dt.processed.map((gasto) => {
          const cat = getCategoriaInfo(gasto.categoria);
          const Icon = cat.icon;
          return (
            <Card key={gasto.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2 min-w-0">
                    <span className={`rounded-lg p-2 shrink-0 h-fit ${cat.tone}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{gasto.descripcion || cat.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{gasto.proveedor || cat.nombre}</p>
                    </div>
                  </div>
                  <p className="font-bold text-destructive shrink-0">-{formatCurrency(Number(gasto.monto) || 0)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 text-xs text-muted-foreground">
                  <span>{fechaGasto(gasto) ? format(fechaGasto(gasto)!, 'dd/MM/yyyy') : 'Sin fecha'}</span>
                  <span>{gasto.metodo_pago || 'Sin método'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleVerDetalle(gasto)}><Eye className="mr-1.5 h-4 w-4" />Detalle</Button>
                  <Button variant="outline" size="sm" onClick={() => handleVerComprobante(gasto)} disabled={!String(gasto.factura || '').trim()}><FileText className="mr-1.5 h-4 w-4" />Comprobante</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {dt.processed.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No hay gastos con estos filtros.</CardContent></Card>}
      </div>

      <Card className="hidden lg:block overflow-hidden">
        <div className="p-3 border-b">
          <BulkActionBar count={dt.selectedCount} onClear={dt.clearSelection} onDelete={eliminarSeleccionados} onExport={exportarCsv} deleting={eliminandoBulk} entityName="gastos" />
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={dt.allVisibleSelected ? true : dt.someVisibleSelected ? 'indeterminate' : false} onCheckedChange={(v) => dt.toggleSelectAllVisible(!!v)} /></TableHead>
                <SortHeader label="Fecha" columnKey="fecha" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
                <SortHeader label="Categoría" columnKey="categoria" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
                <SortHeader label="Descripción" columnKey="descripcion" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
                <SortHeader label="Proveedor" columnKey="proveedor" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
                <SortHeader label="Método" columnKey="metodo" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} />
                <SortHeader label="Monto" columnKey="monto" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="right" />
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dt.processed.map((gasto) => {
                const cat = getCategoriaInfo(gasto.categoria);
                const Icon = cat.icon;
                return (
                  <TableRow key={gasto.id} className={dt.selected.has(gasto.id) ? 'bg-primary/5' : ''}>
                    <TableCell><Checkbox checked={dt.selected.has(gasto.id)} onCheckedChange={() => dt.toggleRow(gasto.id)} /></TableCell>
                    <TableCell>{fechaGasto(gasto) ? format(fechaGasto(gasto)!, 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className={`rounded-md p-1 ${cat.tone}`}><Icon className="h-3.5 w-3.5" /></span>{cat.nombre}</span></TableCell>
                    <TableCell className="font-medium max-w-[260px] truncate">{gasto.descripcion || '—'}</TableCell>
                    <TableCell>{gasto.proveedor || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{gasto.metodo_pago || 'N/A'}</Badge></TableCell>
                    <TableCell className="text-right font-semibold text-destructive">-{formatCurrency(Number(gasto.monto) || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleVerDetalle(gasto)} title="Detalle"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleVerComprobante(gasto)} disabled={!String(gasto.factura || '').trim()} title="Comprobante"><FileText className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, gasto })} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {dt.processed.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No hay gastos con estos filtros.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="mt-3 text-center text-xs text-muted-foreground">Mostrando {dt.processed.length} de {gastos.length} registros</p>

      <Dialog open={isNewGastoOpen} onOpenChange={setIsNewGastoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar gasto</DialogTitle>
            <DialogDescription>Solo categoría y monto son obligatorios.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData((f) => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{categoriasConfig.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto *</Label>
              <Input type="number" min="0.01" step="0.01" inputMode="decimal" value={formData.monto} onChange={(e) => setFormData((f) => ({ ...f, monto: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descripción</Label>
              <Input value={formData.descripcion} onChange={(e) => setFormData((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Se genera automáticamente si la dejas vacía" />
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={formData.metodo_pago} onValueChange={(v) => setFormData((f) => ({ ...f, metodo_pago: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Efectivo">Efectivo</SelectItem><SelectItem value="Tarjeta">Tarjeta</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <ComboboxCreatable
                options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
                value={formData.proveedor_id}
                onValueChange={(id) => {
                  const proveedor = proveedores.find((p) => p.id === id);
                  setFormData((f) => ({ ...f, proveedor_id: id, proveedor: proveedor?.nombre || '' }));
                }}
                onCreate={async (nombre) => {
                  const nuevo = await api.createProveedor({ nombre });
                  setProveedores((prev) => [...prev, nuevo]);
                  setFormData((f) => ({ ...f, proveedor_id: nuevo.id, proveedor: nuevo.nombre }));
                  return { value: nuevo.id, label: nuevo.nombre };
                }}
                placeholder="Seleccionar proveedor"
                searchPlaceholder="Buscar o crear"
                createLabel="Crear proveedor"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Comprobante / factura</Label>
              <Input value={formData.factura} onChange={(e) => setFormData((f) => ({ ...f, factura: e.target.value }))} placeholder="Folio, URL de PDF o imagen" />
              <p className="text-xs text-muted-foreground">Puedes guardar un folio o una URL para consultar el archivo después.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea rows={3} value={formData.notas} onChange={(e) => setFormData((f) => ({ ...f, notas: e.target.value }))} placeholder="Información adicional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewGastoOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleNuevoGasto} disabled={saving}>{saving ? 'Registrando…' : 'Registrar gasto'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detalleModal.open} onOpenChange={(open) => setDetalleModal({ open, gasto: open ? detalleModal.gasto : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalle del gasto</DialogTitle><DialogDescription>Información registrada</DialogDescription></DialogHeader>
          {detalleModal.gasto && (
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/30 p-3">
                <div><p className="text-xs text-muted-foreground">Concepto</p><p className="font-medium">{detalleModal.gasto.descripcion}</p></div>
                <p className="text-lg font-bold text-destructive">-{formatCurrency(Number(detalleModal.gasto.monto) || 0)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Fecha" value={formatDateTime(detalleModal.gasto.fecha || detalleModal.gasto.created_at)} />
                <Detail label="Categoría" value={getCategoriaInfo(detalleModal.gasto.categoria).nombre} />
                <Detail label="Método" value={detalleModal.gasto.metodo_pago || '—'} />
                <Detail label="Proveedor" value={detalleModal.gasto.proveedor || '—'} />
              </div>
              {(detalleModal.gasto.factura || detalleModal.gasto.notas) && <Separator />}
              {detalleModal.gasto.factura && <Detail label="Comprobante" value={detalleModal.gasto.factura} />}
              {detalleModal.gasto.notas && <Detail label="Notas" value={detalleModal.gasto.notas} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={comprobanteModal.open} onOpenChange={(open) => setComprobanteModal({ open, gasto: open ? comprobanteModal.gasto : null, url: open ? comprobanteModal.url : null })}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comprobante</DialogTitle><DialogDescription>{comprobanteModal.gasto?.descripcion || 'Documento asociado al gasto'}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border p-3 text-sm break-words">{comprobanteModal.gasto?.factura}</div>
            {comprobanteModal.url ? (
              <>
                <Button asChild variant="outline" className="w-full"><a href={comprobanteModal.url} target="_blank" rel="noreferrer">Abrir en nueva pestaña</a></Button>
                <div className="h-[55vh] overflow-hidden rounded-lg border"><iframe title="Comprobante" src={comprobanteModal.url} className="h-full w-full" /></div>
              </>
            ) : <p className="text-sm text-muted-foreground">El comprobante está registrado como folio, no como URL.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, gasto: open ? deleteDialog.gasto : null })}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente este registro. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGasto}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

function Metric({ label, value, icon: Icon, emphasis = false }: { label: string; value: string; icon: any; emphasis?: boolean }) {
  return (
    <Card className={emphasis ? 'border-destructive/20' : ''}>
      <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{label}</p><p className="text-lg sm:text-xl font-bold truncate">{value}</p></div>
        <span className={`rounded-lg p-2 shrink-0 ${emphasis ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}><Icon className="h-4 w-4" /></span>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium break-words">{value || '—'}</p></div>;
}
