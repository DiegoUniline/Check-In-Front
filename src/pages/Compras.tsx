import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDataTable } from '@/hooks/useDataTable';
import { SortHeader } from '@/components/datatable/SortHeader';
import { BulkActionBar } from '@/components/datatable/BulkActionBar';
import { exportToCsv } from '@/lib/exportCsv';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import api, { todayLocal } from '@/lib/api';
import { ComboboxCreatable, ComboboxOption } from '@/components/ui/combobox-creatable';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/dateFormat';

interface OrderItem {
  producto_id: string;
  producto_nombre: string;
  cantidad: string;
  precio: string;
}

type EstadoCompra = 'Pendiente' | 'Enviada' | 'Confirmada' | 'EnTransito' | 'Recibida' | 'Cancelada' | 'Borrador';

const ESTADOS: Array<{ value: EstadoCompra; label: string }> = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Enviada', label: 'Enviada' },
  { value: 'Confirmada', label: 'Confirmada' },
  { value: 'EnTransito', label: 'En tránsito' },
  { value: 'Recibida', label: 'Recibida' },
  { value: 'Cancelada', label: 'Cancelada' },
];

const estadoLabel = (estado?: string) => estado === 'EnTransito' ? 'En tránsito' : estado || 'Pendiente';

const estadoClass = (estado?: string) => {
  const map: Record<string, string> = {
    Borrador: 'bg-muted text-muted-foreground',
    Pendiente: 'bg-warning/15 text-warning border-warning/25',
    Enviada: 'bg-info/15 text-info border-info/25',
    Confirmada: 'bg-primary/15 text-primary border-primary/25',
    EnTransito: 'bg-warning/15 text-warning border-warning/25',
    Recibida: 'bg-success/15 text-success border-success/25',
    Cancelada: 'bg-destructive/10 text-destructive border-destructive/25',
  };
  return map[estado || 'Pendiente'] || map.Pendiente;
};

export default function Compras() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('ordenes');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [provSearch, setProvSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ producto_id: '', producto_nombre: '', cantidad: '1', precio: '' }]);
  const [impuestoPct, setImpuestoPct] = useState('16');
  const [notas, setNotas] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const [detalleModal, setDetalleModal] = useState<{ open: boolean; orden: any | null }>({ open: false, orden: null });
  const [pagosOrden, setPagosOrden] = useState<any[]>([]);
  const [nuevoPago, setNuevoPago] = useState({ monto: '', metodo_pago: 'Efectivo', referencia: '', notas: '' });
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [changingState, setChangingState] = useState(false);

  const [isNewProveedorOpen, setIsNewProveedorOpen] = useState(false);
  const [newProveedor, setNewProveedor] = useState({ nombre: '', rfc: '', contacto: '', telefono: '', email: '' });
  const [savingProveedor, setSavingProveedor] = useState(false);
  const [eliminandoBulk, setEliminandoBulk] = useState(false);
  const [eliminandoBulkProv, setEliminandoBulkProv] = useState(false);

  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const pendingFocusIdx = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocusIdx.current == null) return;
    const row = rowRefs.current[pendingFocusIdx.current];
    row?.querySelector<HTMLElement>('button[role="combobox"], [role="combobox"], input, button')?.focus();
    pendingFocusIdx.current = null;
  }, [orderItems.length]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [ordenesData, proveedoresData, productosData] = await Promise.all([
        api.getCompras().catch(() => []),
        api.getProveedores().catch(() => []),
        api.getProductos().catch(() => []),
      ]);
      setOrdenes(Array.isArray(ordenesData) ? ordenesData : []);
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
      setProductos(Array.isArray(productosData) ? productosData : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const filteredOrdenes = useMemo(() => ordenes.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const numero = o.numero_orden || o.numero || o.codigo || '';
    const proveedor = o.proveedor?.nombre || o.proveedor_nombre || '';
    const matchSearch = !q || numero.toLowerCase().includes(q) || proveedor.toLowerCase().includes(q);
    const matchEstado = filterEstado === 'all' || o.estado === filterEstado;
    return matchSearch && matchEstado;
  }), [ordenes, searchQuery, filterEstado]);

  const ordenAccessors = useMemo(() => ({
    numero: (o: any) => o.numero_orden || o.numero || o.codigo || '',
    proveedor: (o: any) => o.proveedor?.nombre || o.proveedor_nombre || '',
    fecha: (o: any) => o.fecha || o.created_at || '',
    estado: (o: any) => o.estado || '',
    total: (o: any) => Number(o.total || 0),
  }), []);
  const dt = useDataTable<any>(filteredOrdenes, ordenAccessors, { storageKey: 'compras-ordenes' });

  const filteredProveedores = useMemo(() => {
    const q = provSearch.toLowerCase().trim();
    return proveedores.filter((p) => !q || [p.nombre, p.rfc, p.contacto, p.telefono, p.email]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [proveedores, provSearch]);
  const provAccessors = useMemo(() => ({
    nombre: (p: any) => p.nombre || '',
    rfc: (p: any) => p.rfc || '',
    contacto: (p: any) => p.contacto || '',
    telefono: (p: any) => p.telefono || '',
    email: (p: any) => p.email || '',
  }), []);
  const dtProv = useDataTable<any>(filteredProveedores, provAccessors, { storageKey: 'compras-proveedores' });

  const stats = useMemo(() => ({
    total: ordenes.length,
    activas: ordenes.filter((o) => !['Recibida', 'Cancelada'].includes(o.estado)).length,
    transito: ordenes.filter((o) => o.estado === 'EnTransito').length,
    valorActivo: ordenes.filter((o) => !['Recibida', 'Cancelada'].includes(o.estado)).reduce((s, o) => s + (Number(o.total) || 0), 0),
  }), [ordenes]);

  const subtotalNueva = orderItems.reduce((s, item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precio) || 0;
    return s + cantidad * precio;
  }, 0);
  const impuestoNueva = subtotalNueva * Math.max(0, Math.min(100, Number(impuestoPct) || 0)) / 100;
  const totalNueva = subtotalNueva + impuestoNueva;

  const resetNuevaOrden = () => {
    setSelectedProveedor('');
    setOrderItems([{ producto_id: '', producto_nombre: '', cantidad: '1', precio: '' }]);
    setImpuestoPct('16');
    setNotas('');
  };

  const handleCreateOrder = async () => {
    if (savingOrder) return;
    if (!selectedProveedor) {
      toast({ title: 'Falta proveedor', description: 'Selecciona quién surtirá esta orden.', variant: 'destructive' });
      return;
    }
    const detalle = orderItems
      .filter((i) => i.producto_id && Number(i.cantidad) > 0 && Number(i.precio) >= 0)
      .map((i) => ({
        producto_id: i.producto_id,
        producto_nombre: i.producto_nombre,
        cantidad: Number(i.cantidad),
        precio_unitario: Number(i.precio),
      }));
    if (!detalle.length) {
      toast({ title: 'Faltan productos', description: 'Agrega al menos una línea válida.', variant: 'destructive' });
      return;
    }

    setSavingOrder(true);
    try {
      await api.createCompra({
        proveedor_id: selectedProveedor,
        detalle,
        subtotal: subtotalNueva,
        impuestos: impuestoNueva,
        total: totalNueva,
        estado: 'Pendiente',
        fecha: todayLocal(),
        notas: notas.trim() || null,
      });
      toast({
        title: 'Orden creada',
        description: 'La orden quedó pendiente. El inventario se actualizará únicamente cuando la marques como recibida.',
      });
      setIsNewOrderOpen(false);
      resetNuevaOrden();
      await cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo crear la orden', variant: 'destructive' });
    } finally {
      setSavingOrder(false);
    }
  };

  const openDetalle = async (orden: any) => {
    setDetalleModal({ open: true, orden });
    setPagosOrden([]);
    try {
      const [detalle, pagos] = await Promise.all([
        api.getCompra(orden.id).catch(() => orden),
        api.getPagosCompra(orden.id).catch(() => []),
      ]);
      setDetalleModal({ open: true, orden: detalle || orden });
      setPagosOrden(Array.isArray(pagos) ? pagos : []);
    } catch {
      // Mantener la información del listado si el detalle falla.
    }
  };

  const totalPagadoOrden = useMemo(() => pagosOrden.reduce((s, p) => s + (Number(p.monto) || 0), 0), [pagosOrden]);
  const totalDetalle = Number(detalleModal.orden?.total || 0);
  const saldoDetalle = Math.max(0, totalDetalle - totalPagadoOrden);

  const registrarPago = async () => {
    if (!detalleModal.orden || guardandoPago) return;
    const monto = Number(nuevoPago.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      toast({ title: 'Monto inválido', description: 'Ingresa un monto mayor a cero.', variant: 'destructive' });
      return;
    }
    if (monto > saldoDetalle + 0.001) {
      toast({ title: 'El pago excede el saldo', description: `Saldo pendiente: ${formatCurrency(saldoDetalle)}`, variant: 'destructive' });
      return;
    }

    setGuardandoPago(true);
    try {
      await api.createPagoCompra({
        compra_id: detalleModal.orden.id,
        monto,
        metodo_pago: nuevoPago.metodo_pago,
        referencia: nuevoPago.referencia.trim(),
        notas: nuevoPago.notas.trim(),
      });
      const pagos = await api.getPagosCompra(detalleModal.orden.id);
      setPagosOrden(Array.isArray(pagos) ? pagos : []);
      setNuevoPago({ monto: '', metodo_pago: 'Efectivo', referencia: '', notas: '' });
      toast({ title: 'Pago registrado', description: 'El pago no modifica la recepción ni el inventario.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo registrar el pago', variant: 'destructive' });
    } finally {
      setGuardandoPago(false);
    }
  };

  const eliminarPago = async (pagoId: string) => {
    if (!detalleModal.orden) return;
    const ok = await confirm({ title: 'Eliminar pago', description: 'El saldo de la orden se recalculará.', confirmText: 'Eliminar', destructive: true });
    if (!ok) return;
    try {
      await api.deletePagoCompra(pagoId);
      setPagosOrden(await api.getPagosCompra(detalleModal.orden.id));
      toast({ title: 'Pago eliminado' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const cambiarEstado = async (orden: any, estado: EstadoCompra) => {
    if (changingState) return;
    if (estado === 'Recibida') {
      const ok = await confirm({
        title: 'Recibir mercancía',
        description: 'Esta acción ingresará al inventario las cantidades de la orden una sola vez. El pago es independiente de la recepción.',
        confirmText: 'Recibir e ingresar stock',
      });
      if (!ok) return;
    }
    if (estado === 'Cancelada') {
      const ok = await confirm({ title: 'Cancelar orden', description: 'La orden dejará de estar activa. No se modificará inventario si aún no fue recibida.', confirmText: 'Cancelar orden', destructive: true });
      if (!ok) return;
    }

    setChangingState(true);
    try {
      const updated = await api.updateEstadoCompra(orden.id, estado);
      toast({ title: estado === 'Recibida' ? 'Mercancía recibida' : 'Estado actualizado', description: estado === 'Recibida' ? 'El inventario fue actualizado con trazabilidad.' : estadoLabel(estado) });
      await cargarDatos();
      if (detalleModal.open && detalleModal.orden?.id === orden.id) {
        const detail = await api.getCompra(orden.id).catch(() => ({ ...orden, ...updated }));
        setDetalleModal({ open: true, orden: detail });
      }
    } catch (error: any) {
      toast({ title: 'No se pudo cambiar el estado', description: error?.message || 'Revisa la orden e intenta de nuevo.', variant: 'destructive' });
    } finally {
      setChangingState(false);
    }
  };

  const eliminarOrden = async (orden: any) => {
    const ok = await confirm({
      title: 'Eliminar orden',
      description: orden.estado === 'Recibida'
        ? 'Una orden recibida no debe eliminarse porque ya afectó inventario.'
        : `¿Eliminar ${orden.numero_orden || 'esta orden'}?`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.deleteCompra(orden.id);
      toast({ title: 'Orden eliminada' });
      if (detalleModal.orden?.id === orden.id) setDetalleModal({ open: false, orden: null });
      await cargarDatos();
    } catch (error: any) {
      toast({ title: 'No se puede eliminar', description: error?.message || 'La orden conserva movimientos relacionados.', variant: 'destructive' });
    }
  };

  const eliminarSeleccionadas = async () => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      const resultados = await Promise.allSettled(ids.map((id) => api.deleteCompra(id)));
      const ok = resultados.filter((r) => r.status === 'fulfilled').length;
      const fail = resultados.length - ok;
      toast({ title: `${ok} orden(es) eliminadas`, description: fail ? `${fail} no se eliminaron por tener movimientos o restricciones.` : undefined });
      dt.clearSelection();
      await cargarDatos();
    } finally {
      setEliminandoBulk(false);
    }
  };

  const exportarOrdenes = () => exportToCsv('ordenes_compra', dt.selectedRows.length ? dt.selectedRows : dt.processed, [
    { key: 'numero_orden', label: 'Orden', accessor: (o) => o.numero_orden || o.numero || o.codigo },
    { key: 'proveedor_nombre', label: 'Proveedor', accessor: (o) => o.proveedor?.nombre || o.proveedor_nombre },
    { key: 'fecha', label: 'Fecha', accessor: (o) => o.fecha || o.created_at },
    { key: 'estado', label: 'Estado' },
    { key: 'total', label: 'Total' },
  ]);

  const crearProveedor = async () => {
    if (!newProveedor.nombre.trim() || savingProveedor) return;
    setSavingProveedor(true);
    try {
      const creado = await api.createProveedor({
        nombre: newProveedor.nombre.trim(),
        rfc: newProveedor.rfc.trim() || null,
        contacto: newProveedor.contacto.trim() || null,
        telefono: newProveedor.telefono.trim() || null,
        email: newProveedor.email.trim() || null,
      });
      setProveedores((prev) => [...prev, creado].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))));
      setNewProveedor({ nombre: '', rfc: '', contacto: '', telefono: '', email: '' });
      setIsNewProveedorOpen(false);
      toast({ title: 'Proveedor creado' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'No se pudo crear', variant: 'destructive' });
    } finally {
      setSavingProveedor(false);
    }
  };

  const eliminarProveedoresSeleccionados = async () => {
    setEliminandoBulkProv(true);
    try {
      const ids = Array.from(dtProv.selected);
      const resultados = await Promise.allSettled(ids.map((id) => api.deleteProveedor(id)));
      const ok = resultados.filter((r) => r.status === 'fulfilled').length;
      toast({ title: `${ok} proveedor(es) eliminados` });
      dtProv.clearSelection();
      await cargarDatos();
    } finally {
      setEliminandoBulkProv(false);
    }
  };

  const exportarProveedores = () => exportToCsv('proveedores', dtProv.selectedRows.length ? dtProv.selectedRows : dtProv.processed, [
    { key: 'nombre', label: 'Nombre' },
    { key: 'rfc', label: 'RFC' },
    { key: 'contacto', label: 'Contacto' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
  ]);

  if (loading) {
    return (
      <MainLayout title="Compras" subtitle="Órdenes, recepción y pagos a proveedores">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border bg-muted/30 animate-pulse" />)}</div>
      </MainLayout>
    );
  }

  if (isNewOrderOpen) {
    const productoOptions: ComboboxOption[] = productos.map((p) => ({ value: p.id, label: p.nombre }));
    return (
      <MainLayout title="Nueva orden de compra" subtitle="Captura la orden; el stock entra únicamente al recibir mercancía">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => { setIsNewOrderOpen(false); resetNuevaOrden(); }}><ArrowLeft className="mr-1.5 h-4 w-4" />Volver a órdenes</Button>
          <div className="flex gap-2"><Button variant="outline" onClick={() => { setIsNewOrderOpen(false); resetNuevaOrden(); }} disabled={savingOrder}>Descartar</Button><Button onClick={handleCreateOrder} disabled={savingOrder}>{savingOrder ? 'Guardando…' : 'Guardar orden'}</Button></div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Proveedor *</Label>
                  <ComboboxCreatable
                    options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
                    value={selectedProveedor}
                    onValueChange={setSelectedProveedor}
                    onCreate={async (nombre) => {
                      const nuevo = await api.createProveedor({ nombre });
                      setProveedores((prev) => [...prev, nuevo]);
                      setSelectedProveedor(nuevo.id);
                      return { value: nuevo.id, label: nuevo.nombre };
                    }}
                    placeholder="Seleccionar proveedor"
                    searchPlaceholder="Buscar o crear proveedor"
                    createLabel="Crear proveedor"
                  />
                </div>
                <div className="space-y-1.5"><Label>Fecha</Label><Input value={todayLocal()} disabled /></div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between gap-3 bg-muted/30 px-3 py-2"><p className="text-sm font-semibold">Productos</p><Badge variant="secondary">{orderItems.filter((i) => i.producto_id).length} líneas</Badge></div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader><TableRow><TableHead className="min-w-[260px]">Producto</TableHead><TableHead className="w-28 text-center">Cantidad</TableHead><TableHead className="w-36 text-right">Costo unit.</TableHead><TableHead className="w-36 text-right">Subtotal</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                    <TableBody>
                      {orderItems.map((item, idx) => (
                        <TableRow key={idx} ref={(el) => { rowRefs.current[idx] = el; }}>
                          <TableCell>
                            <ComboboxCreatable
                              options={productoOptions}
                              value={item.producto_id}
                              onValueChange={(id) => {
                                const prod = productos.find((p) => p.id === id);
                                setOrderItems((prev) => prev.map((row, i) => i === idx ? { ...row, producto_id: id, producto_nombre: prod?.nombre || '', precio: row.precio || String(prod?.precio_compra || '') } : row));
                              }}
                              placeholder="Seleccionar producto"
                              searchPlaceholder="Buscar producto"
                            />
                          </TableCell>
                          <TableCell><Input type="number" min="0.01" step="0.01" inputMode="decimal" className="text-center" value={item.cantidad} onChange={(e) => setOrderItems((prev) => prev.map((row, i) => i === idx ? { ...row, cantidad: e.target.value } : row))} /></TableCell>
                          <TableCell><Input type="number" min="0" step="0.01" inputMode="decimal" className="text-right" value={item.precio} onChange={(e) => setOrderItems((prev) => prev.map((row, i) => i === idx ? { ...row, precio: e.target.value } : row))} onKeyDown={(e) => {
                            if ((e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) && idx === orderItems.length - 1 && item.producto_id && Number(item.cantidad) > 0 && item.precio !== '') {
                              e.preventDefault();
                              pendingFocusIdx.current = orderItems.length;
                              setOrderItems((prev) => [...prev, { producto_id: '', producto_nombre: '', cantidad: '1', precio: '' }]);
                            }
                          }} /></TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency((Number(item.cantidad) || 0) * (Number(item.precio) || 0))}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" disabled={orderItems.length === 1} onClick={() => setOrderItems((prev) => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t px-3 py-2"><Button variant="ghost" size="sm" onClick={() => setOrderItems((prev) => [...prev, { producto_id: '', producto_nombre: '', cantidad: '1', precio: '' }])}><Plus className="mr-1.5 h-4 w-4" />Agregar línea</Button></div>
              </div>

              <div className="space-y-1.5"><Label>Notas / condiciones</Label><Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Entrega, crédito, referencia, condiciones del proveedor..." /></div>
            </CardContent>
          </Card>

          <Card className="h-fit xl:sticky xl:top-0">
            <CardContent className="p-4 space-y-3">
              <div><p className="text-sm font-semibold">Resumen de la orden</p><p className="text-xs text-muted-foreground">No modifica inventario hasta recibir.</p></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotalNueva)}</span></div>
              <div className="grid grid-cols-[1fr_88px] gap-2 items-center"><Label className="text-muted-foreground">Impuesto %</Label><Input type="number" min="0" max="100" value={impuestoPct} onChange={(e) => setImpuestoPct(e.target.value)} className="text-right" /></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Impuestos</span><span>{formatCurrency(impuestoNueva)}</span></div>
              <Separator />
              <div className="flex justify-between items-baseline"><span className="font-semibold">Total</span><span className="text-xl font-bold text-primary">{formatCurrency(totalNueva)}</span></div>
              <Button className="w-full" onClick={handleCreateOrder} disabled={savingOrder}>{savingOrder ? 'Guardando…' : 'Crear orden pendiente'}</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (detalleModal.open && detalleModal.orden) {
    const orden = detalleModal.orden;
    const detalle = orden.detalle || orden.compras_detalle || [];
    return (
      <MainLayout title={orden.numero_orden || 'Detalle de compra'} subtitle="Orden, recepción física y pagos son procesos independientes">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => setDetalleModal({ open: false, orden: null })}><ArrowLeft className="mr-1.5 h-4 w-4" />Órdenes</Button>
          <div className="flex flex-wrap gap-2">
            {!['Recibida', 'Cancelada'].includes(orden.estado) && <Button variant="outline" onClick={() => cambiarEstado(orden, 'Cancelada')} disabled={changingState}>Cancelar</Button>}
            {!['Recibida', 'Cancelada'].includes(orden.estado) && <Button onClick={() => cambiarEstado(orden, 'Recibida')} disabled={changingState}><Package className="mr-2 h-4 w-4" />Recibir mercancía</Button>}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Card><CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{orden.proveedor_nombre || orden.proveedor?.nombre || 'Proveedor'}</h2><Badge variant="outline" className={estadoClass(orden.estado)}>{estadoLabel(orden.estado)}</Badge></div><p className="text-sm text-muted-foreground mt-1">{orden.fecha || orden.created_at ? formatDate(orden.fecha || orden.created_at) : 'Sin fecha'} · {detalle.length} líneas</p></div>
                <p className="text-2xl font-bold">{formatCurrency(totalDetalle)}</p>
              </div>
            </CardContent></Card>

            <Card className="overflow-hidden">
              <Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
                {detalle.map((item: any, idx: number) => <TableRow key={item.id || idx}><TableCell className="font-medium">{item.producto_nombre || 'Producto'}</TableCell><TableCell className="text-right">{Number(item.cantidad) || 0}</TableCell><TableCell className="text-right">{formatCurrency(Number(item.precio_unitario) || 0)}</TableCell><TableCell className="text-right font-medium">{formatCurrency(Number(item.total) || (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0))}</TableCell></TableRow>)}
                {!detalle.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Sin líneas de detalle</TableCell></TableRow>}
              </TableBody></Table>
            </Card>

            {orden.notas && <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Notas</p><p className="text-sm whitespace-pre-wrap">{orden.notas}</p></CardContent></Card>}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold">Pago al proveedor</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniMetric label="Total" value={formatCurrency(totalDetalle)} />
                  <MiniMetric label="Pagado" value={formatCurrency(totalPagadoOrden)} />
                  <MiniMetric label="Saldo" value={formatCurrency(saldoDetalle)} emphasis={saldoDetalle > 0} />
                </div>
                {saldoDetalle > 0 ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Monto</Label>
                      <Input type="number" min="0.01" max={saldoDetalle} step="0.01" value={nuevoPago.monto} onChange={(e) => setNuevoPago((p) => ({ ...p, monto: e.target.value }))} placeholder={formatCurrency(saldoDetalle)} />
                      <Select value={nuevoPago.metodo_pago} onValueChange={(v) => setNuevoPago((p) => ({ ...p, metodo_pago: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Efectivo">Efectivo</SelectItem><SelectItem value="Tarjeta">Tarjeta</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem></SelectContent></Select>
                      <Input value={nuevoPago.referencia} onChange={(e) => setNuevoPago((p) => ({ ...p, referencia: e.target.value }))} placeholder="Referencia (opcional)" />
                      <Button className="w-full" onClick={registrarPago} disabled={guardandoPago}>{guardandoPago ? 'Registrando…' : 'Registrar pago'}</Button>
                      <p className="text-[11px] text-muted-foreground">Registrar un pago no recibe mercancía ni modifica stock.</p>
                    </div>
                  </>
                ) : <div className="rounded-lg bg-success/10 p-3 text-sm text-success flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Orden liquidada</div>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold">Historial de pagos</p>
                {!pagosOrden.length ? <p className="text-sm text-muted-foreground">Sin pagos registrados.</p> : pagosOrden.map((pago) => <div key={pago.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-2 last:pb-0"><div><p className="text-sm font-medium">{formatCurrency(Number(pago.monto) || 0)}</p><p className="text-xs text-muted-foreground">{pago.metodo_pago || 'Pago'} · {pago.fecha ? formatDateTime(pago.fecha) : ''}</p></div><Button variant="ghost" size="icon" onClick={() => eliminarPago(pago.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
              </CardContent>
            </Card>

            <Card><CardContent className="p-4 space-y-2"><p className="font-semibold">Estado logístico</p><Select value={orden.estado || 'Pendiente'} onValueChange={(v) => cambiarEstado(orden, v as EstadoCompra)} disabled={changingState || orden.estado === 'Recibida'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ESTADOS.map((e) => <SelectItem key={e.value} value={e.value} disabled={e.value === 'Recibida' && orden.estado === 'Cancelada'}>{e.label}</SelectItem>)}</SelectContent></Select><p className="text-[11px] text-muted-foreground">“Recibida” es el único estado que ingresa mercancía a inventario.</p></CardContent></Card>

            <Button variant="outline" className="w-full text-destructive" onClick={() => eliminarOrden(orden)}><Trash2 className="mr-2 h-4 w-4" />Eliminar orden</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Compras" subtitle="Órdenes a proveedores, recepción de mercancía y pagos">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full mb-4 sm:w-fit"><TabsTrigger value="ordenes">Órdenes</TabsTrigger><TabsTrigger value="proveedores">Proveedores</TabsTrigger></TabsList>

        <TabsContent value="ordenes">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <Metric label="Órdenes" value={String(stats.total)} icon={ShoppingBag} />
            <Metric label="Activas" value={String(stats.activas)} icon={Clock} />
            <Metric label="En tránsito" value={String(stats.transito)} icon={Truck} />
            <Metric label="Valor en proceso" value={formatCurrency(stats.valorActivo)} icon={DollarSign} />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-4">
            <div className="relative flex-1 lg:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar orden o proveedor" /></div>
            <Select value={filterEstado} onValueChange={setFilterEstado}><SelectTrigger className="lg:w-[170px]"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem>{ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent></Select>
            <div className="flex gap-2 lg:ml-auto"><Button variant="outline" size="icon" onClick={cargarDatos}><RefreshCw className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setFilterEstado('all'); dt.resetPersisted(); }}><RotateCcw className="mr-1.5 h-4 w-4" />Restablecer</Button><Button onClick={() => setIsNewOrderOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Nueva orden</Button></div>
          </div>

          <div className="space-y-2 lg:hidden">
            {dt.processed.map((orden) => <OrderCard key={orden.id} orden={orden} onOpen={() => openDetalle(orden)} />)}
            {!dt.processed.length && <Card><CardContent className="p-8 text-center text-muted-foreground">No hay órdenes con estos filtros.</CardContent></Card>}
          </div>

          <Card className="hidden lg:block overflow-hidden">
            <div className="p-3 border-b"><BulkActionBar count={dt.selectedCount} onClear={dt.clearSelection} onDelete={eliminarSeleccionadas} onExport={exportarOrdenes} deleting={eliminandoBulk} entityName="órdenes" /></div>
            <div className="overflow-x-auto"><Table className="min-w-[850px]"><TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={dt.allVisibleSelected ? true : dt.someVisibleSelected ? 'indeterminate' : false} onCheckedChange={(v) => dt.toggleSelectAllVisible(!!v)} /></TableHead><SortHeader label="Orden" columnKey="numero" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} /><SortHeader label="Proveedor" columnKey="proveedor" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} /><SortHeader label="Fecha" columnKey="fecha" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} /><SortHeader label="Estado" columnKey="estado" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} /><SortHeader label="Total" columnKey="total" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="right" /><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>
              {dt.processed.map((orden) => <TableRow key={orden.id} className={dt.selected.has(orden.id) ? 'bg-primary/5' : ''}><TableCell><Checkbox checked={dt.selected.has(orden.id)} onCheckedChange={() => dt.toggleRow(orden.id)} /></TableCell><TableCell className="font-medium">{orden.numero_orden || orden.numero || orden.codigo || '—'}</TableCell><TableCell>{orden.proveedor_nombre || orden.proveedor?.nombre || '—'}</TableCell><TableCell>{orden.fecha || orden.created_at ? formatDate(orden.fecha || orden.created_at) : '—'}</TableCell><TableCell><Badge variant="outline" className={estadoClass(orden.estado)}>{estadoLabel(orden.estado)}</Badge></TableCell><TableCell className="text-right font-semibold">{formatCurrency(Number(orden.total) || 0)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => openDetalle(orden)}><Eye className="mr-1.5 h-4 w-4" />Ver</Button></TableCell></TableRow>)}
              {!dt.processed.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No hay órdenes.</TableCell></TableRow>}
            </TableBody></Table></div>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4"><div className="relative flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={provSearch} onChange={(e) => setProvSearch(e.target.value)} placeholder="Buscar proveedor, RFC, correo..." /></div><div className="flex gap-2 sm:ml-auto"><Button variant="outline" size="sm" onClick={() => { setProvSearch(''); dtProv.resetPersisted(); }}><RotateCcw className="mr-1.5 h-4 w-4" />Restablecer</Button><Button onClick={() => setIsNewProveedorOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Nuevo proveedor</Button></div></div>
          <Card className="overflow-hidden"><div className="p-3 border-b"><BulkActionBar count={dtProv.selectedCount} onClear={dtProv.clearSelection} onDelete={eliminarProveedoresSeleccionados} onExport={exportarProveedores} deleting={eliminandoBulkProv} entityName="proveedores" /></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={dtProv.allVisibleSelected ? true : dtProv.someVisibleSelected ? 'indeterminate' : false} onCheckedChange={(v) => dtProv.toggleSelectAllVisible(!!v)} /></TableHead><SortHeader label="Proveedor" columnKey="nombre" sortKey={dtProv.sortKey} sortDir={dtProv.sortDir} onSort={dtProv.toggleSort} /><SortHeader label="RFC" columnKey="rfc" sortKey={dtProv.sortKey} sortDir={dtProv.sortDir} onSort={dtProv.toggleSort} /><SortHeader label="Contacto" columnKey="contacto" sortKey={dtProv.sortKey} sortDir={dtProv.sortDir} onSort={dtProv.toggleSort} /><TableHead>Teléfono</TableHead><TableHead>Email</TableHead></TableRow></TableHeader><TableBody>{dtProv.processed.map((p) => <TableRow key={p.id}><TableCell><Checkbox checked={dtProv.selected.has(p.id)} onCheckedChange={() => dtProv.toggleRow(p.id)} /></TableCell><TableCell className="font-medium">{p.nombre}</TableCell><TableCell>{p.rfc || '—'}</TableCell><TableCell>{p.contacto || '—'}</TableCell><TableCell>{p.telefono || '—'}</TableCell><TableCell>{p.email || '—'}</TableCell></TableRow>)}{!dtProv.processed.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No hay proveedores.</TableCell></TableRow>}</TableBody></Table></div></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewProveedorOpen} onOpenChange={setIsNewProveedorOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Nuevo proveedor</DialogTitle><DialogDescription>Nombre obligatorio; el resto puede completarse después.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5 sm:col-span-2"><Label>Nombre *</Label><Input value={newProveedor.nombre} onChange={(e) => setNewProveedor((p) => ({ ...p, nombre: e.target.value }))} /></div><div className="space-y-1.5"><Label>RFC</Label><Input value={newProveedor.rfc} onChange={(e) => setNewProveedor((p) => ({ ...p, rfc: e.target.value }))} /></div><div className="space-y-1.5"><Label>Contacto</Label><Input value={newProveedor.contacto} onChange={(e) => setNewProveedor((p) => ({ ...p, contacto: e.target.value }))} /></div><div className="space-y-1.5"><Label>Teléfono</Label><Input value={newProveedor.telefono} onChange={(e) => setNewProveedor((p) => ({ ...p, telefono: e.target.value }))} /></div><div className="space-y-1.5"><Label>Email</Label><Input type="email" value={newProveedor.email} onChange={(e) => setNewProveedor((p) => ({ ...p, email: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setIsNewProveedorOpen(false)}>Cancelar</Button><Button onClick={crearProveedor} disabled={savingProveedor || !newProveedor.nombre.trim()}>{savingProveedor ? 'Guardando…' : 'Crear proveedor'}</Button></DialogFooter></DialogContent></Dialog>
    </MainLayout>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return <Card><CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{label}</p><p className="text-lg sm:text-xl font-bold truncate">{value}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary shrink-0"><Icon className="h-4 w-4" /></span></CardContent></Card>;
}

function MiniMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={cn('rounded-lg border p-2', emphasis && 'border-warning/30 bg-warning/5')}><p className="text-[10px] text-muted-foreground">{label}</p><p className={cn('text-sm font-semibold truncate', emphasis && 'text-warning')}>{value}</p></div>;
}

function OrderCard({ orden, onOpen }: { orden: any; onOpen: () => void }) {
  return (
    <Card><CardContent className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold truncate">{orden.numero_orden || orden.numero || orden.codigo || 'Orden'}</p><p className="text-sm text-muted-foreground truncate">{orden.proveedor_nombre || orden.proveedor?.nombre || 'Sin proveedor'}</p></div><Badge variant="outline" className={estadoClass(orden.estado)}>{estadoLabel(orden.estado)}</Badge></div><div className="grid grid-cols-2 gap-3 mt-3 text-sm"><div><p className="text-xs text-muted-foreground">Fecha</p><p>{orden.fecha || orden.created_at ? formatDate(orden.fecha || orden.created_at) : '—'}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">{formatCurrency(Number(orden.total) || 0)}</p></div></div><Button variant="outline" size="sm" className="w-full mt-3" onClick={onOpen}><Eye className="mr-1.5 h-4 w-4" />Ver orden</Button></CardContent></Card>
  );
}
