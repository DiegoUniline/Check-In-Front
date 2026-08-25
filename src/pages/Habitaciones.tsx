import { useState, useEffect, useMemo } from 'react';
import {
  Grid3X3, List, Search, Plus,
  MoreVertical, Sparkles, Wrench, DoorOpen, DoorClosed, Pencil, Trash2,
  RotateCcw, Globe, GlobeLock
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExportButton } from '@/components/ExportButton';
import { HabitacionesImport } from '@/components/HabitacionesImport';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImpuestosEditor } from '@/components/ImpuestosEditor';
import { getHabDefault, setHabDefault, type ImpuestoDefault } from '@/lib/impuestosDefault';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataTable } from '@/hooks/useDataTable';
import { SortHeader } from '@/components/datatable/SortHeader';
import { BulkActionBar } from '@/components/datatable/BulkActionBar';
import { exportToCsv } from '@/lib/exportCsv';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import api from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';

export default function Habitaciones() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return 'grid';
    return 'list';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPiso, setFilterPiso] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHab, setEditingHab] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [habToDelete, setHabToDelete] = useState<any>(null);

  const [formData, setFormData] = useState({
    tipo_habitacion_id: '',
    numero: '',
    piso: '',
    estado_habitacion: 'Disponible',
    estado_limpieza: 'Limpia',
    estado_mantenimiento: 'OK',
    excluida_publica: false,
    fotos: [] as string[],
  });
  const [formImpuestos, setFormImpuestos] = useState<ImpuestoDefault[]>([]);
  const [usarImpuestosTipo, setUsarImpuestosTipo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [eliminandoBulk, setEliminandoBulk] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.table === 'habitaciones' || detail?.table === 'reservas') cargarDatos();
    };
    window.addEventListener('data:changed', onChange);
    return () => window.removeEventListener('data:changed', onChange);
  }, []);

  const cargarDatos = async () => {
    try {
      const [habData, tiposData] = await Promise.all([
        api.getHabitaciones(),
        api.getTiposHabitacion()
      ]);
      setHabitaciones(Array.isArray(habData) ? habData : []);
      setTiposHabitacion(Array.isArray(tiposData) ? tiposData : []);
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las habitaciones', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const pisos = [...new Set(
    habitaciones.map(h => h.piso).filter((p): p is number => p !== null && p !== undefined)
  )].sort((a, b) => a - b);

  const filteredHabitaciones = habitaciones.filter(h => {
    const query = searchQuery.trim().toLowerCase();
    const numero = String(h.numero ?? '').toLowerCase();
    const tipo = String(h.tipo_nombre ?? '').toLowerCase();
    const matchSearch = !query || numero.includes(query) || tipo.includes(query);
    const matchPiso = filterPiso === 'all' || (h.piso != null && h.piso.toString() === filterPiso);
    const matchTipo = filterTipo === 'all' || h.tipo_habitacion_id === filterTipo;
    let matchEstado = true;
    if (filterEstado === 'Limpieza') {
      matchEstado = h.estado_limpieza !== 'Limpia' && h.estado_mantenimiento === 'OK';
    } else if (filterEstado === 'Mantenimiento') {
      matchEstado = h.estado_mantenimiento !== 'OK';
    } else if (filterEstado !== 'all') {
      matchEstado = h.estado_habitacion === filterEstado && h.estado_limpieza === 'Limpia' && h.estado_mantenimiento === 'OK';
    }
    return matchSearch && matchPiso && matchTipo && matchEstado;
  });

  const accessors = useMemo(() => ({
    numero: (h: any) => h.numero || '',
    tipo: (h: any) => h.tipo_nombre || '',
    piso: (h: any) => h.piso ?? '',
    estado: (h: any) => h.estado_habitacion || '',
    limpieza: (h: any) => h.estado_limpieza || '',
    mantenimiento: (h: any) => h.estado_mantenimiento || '',
  }), []);
  const dt = useDataTable<any>(filteredHabitaciones, accessors, { storageKey: 'habitaciones' });

  const handleResetAll = () => {
    setSearchQuery('');
    setFilterPiso('all');
    setFilterTipo('all');
    setFilterEstado('all');
    dt.resetPersisted();
  };

  const eliminarSeleccionadas = async () => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.deleteHabitacion(id)));
      toast({ title: 'Habitaciones eliminadas', description: `Se eliminaron ${ids.length}.` });
      dt.clearSelection();
      await cargarDatos();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message || 'No se pudo eliminar', variant: 'destructive' });
    } finally {
      setEliminandoBulk(false);
    }
  };

  const exportarCsv = () => {
    exportToCsv('habitaciones', dt.selectedRows.length > 0 ? dt.selectedRows : dt.processed, [
      { key: 'numero', label: 'Habitación', accessor: (h) => h.numero },
      { key: 'tipo_nombre', label: 'Tipo', accessor: (h) => h.tipo_nombre },
      { key: 'piso', label: 'Piso', accessor: (h) => h.piso },
      { key: 'estado_habitacion', label: 'Estado', accessor: (h) => h.estado_habitacion },
      { key: 'estado_limpieza', label: 'Limpieza', accessor: (h) => h.estado_limpieza },
      { key: 'estado_mantenimiento', label: 'Mantenimiento', accessor: (h) => h.estado_mantenimiento },
    ]);
  };

  const cambiarEstadoBulk = async (nuevo: string) => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.updateHabitacion(id, { estado_habitacion: nuevo })));
      toast({ title: 'Estado actualizado', description: `${ids.length} habitación(es) → ${nuevo}` });
      dt.clearSelection();
      await cargarDatos();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setEliminandoBulk(false);
    }
  };

  const cambiarWebBulk = async (excluida: boolean) => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.updateHabitacion(id, { excluida_publica: excluida })));
      toast({
        title: excluida ? 'Excluidas de la web' : 'Publicadas en la web',
        description: `${ids.length} habitación(es) actualizada(s)`,
      });
      dt.clearSelection();
      await cargarDatos();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setEliminandoBulk(false);
    }
  };

  const toggleWebSingle = async (hab: any) => {
    const nuevoExcluida = !hab.excluida_publica;
    setHabitaciones(prev => prev.map(h => h.id === hab.id ? { ...h, excluida_publica: nuevoExcluida } : h));
    try {
      await api.updateHabitacion(hab.id, { excluida_publica: nuevoExcluida });
      toast({
        title: nuevoExcluida ? 'Excluida de la web' : 'Publicada en la web',
        description: `Habitación ${hab.numero}`,
      });
    } catch (err: any) {
      setHabitaciones(prev => prev.map(h => h.id === hab.id ? { ...h, excluida_publica: !nuevoExcluida } : h));
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const getStatusColor = (hab: any) => {
    if (hab.estado_mantenimiento !== 'OK') return 'border-destructive/50 bg-destructive/[0.03]';
    if (hab.estado_limpieza !== 'Limpia') return 'border-info/50 bg-info/[0.03]';
    switch (hab.estado_habitacion) {
      case 'Disponible': return 'border-success/50 bg-success/[0.03]';
      case 'Ocupada': return 'border-warning/50 bg-warning/[0.03]';
      case 'Reservada': return 'border-primary/40 bg-primary/[0.03]';
      case 'Bloqueada': return 'border-destructive/50 bg-destructive/[0.03]';
      default: return 'border-muted';
    }
  };

  const getStatusBadge = (hab: any) => {
    if (hab.estado_mantenimiento !== 'OK') return <Badge variant="destructive">Mantenimiento</Badge>;
    if (hab.estado_limpieza !== 'Limpia') return <Badge className="bg-info">Limpieza</Badge>;
    switch (hab.estado_habitacion) {
      case 'Disponible': return <Badge className="bg-success">Disponible</Badge>;
      case 'Ocupada': return <Badge className="bg-warning text-warning-foreground">Ocupada</Badge>;
      case 'Reservada': return <Badge>Reservada</Badge>;
      case 'Bloqueada': return <Badge variant="destructive">Bloqueada</Badge>;
      default: return <Badge variant="outline">Sin estado</Badge>;
    }
  };

  const handleChangeStatus = async (hab: any, newStatus: string) => {
    try {
      if (newStatus === 'Limpieza') {
        await api.updateEstadoHabitacion(hab.id, { estado_limpieza: 'Sucia' });
      } else if (newStatus === 'Mantenimiento') {
        await api.updateEstadoHabitacion(hab.id, { estado_mantenimiento: 'Pendiente' });
      } else {
        await api.updateEstadoHabitacion(hab.id, { estado_habitacion: newStatus });
      }
      toast({ title: 'Estado actualizado', description: `Habitación ${hab.numero} actualizada` });
      cargarDatos();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    }
  };

  const openNewModal = () => {
    setEditingHab(null);
    setFormData({
      tipo_habitacion_id: tiposHabitacion[0]?.id || '',
      numero: '',
      piso: '1',
      estado_habitacion: 'Disponible',
      estado_limpieza: 'Limpia',
      estado_mantenimiento: 'OK',
      excluida_publica: false,
      fotos: [],
    });
    setFormImpuestos([]);
    setUsarImpuestosTipo(true);
    setModalOpen(true);
  };

  const openEditModal = (hab: any) => {
    setEditingHab(hab);
    setFormData({
      tipo_habitacion_id: hab.tipo_habitacion_id || '',
      numero: hab.numero || '',
      piso: hab.piso != null ? hab.piso.toString() : '',
      estado_habitacion: hab.estado_habitacion || 'Disponible',
      estado_limpieza: hab.estado_limpieza || 'Limpia',
      estado_mantenimiento: hab.estado_mantenimiento || 'OK',
      excluida_publica: !!hab.excluida_publica,
      fotos: Array.isArray(hab.fotos) ? hab.fotos : [],
    });
    const impuestos = getHabDefault(hab.id);
    setUsarImpuestosTipo(impuestos === null);
    setFormImpuestos(impuestos || []);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.numero.trim()) {
      toast({ title: 'Falta el número', description: 'Ingresa el número de habitación', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const pisoNum = parseInt(formData.piso, 10);
      const data = { ...formData, piso: isNaN(pisoNum) ? null : pisoNum };
      if (editingHab) {
        await api.updateHabitacion(editingHab.id, data);
        setHabDefault(editingHab.id, usarImpuestosTipo ? null : formImpuestos);
        toast({ title: 'Habitación actualizada', description: `Habitación ${formData.numero} guardada` });
      } else {
        const created = await api.createHabitacion(data);
        if (created?.id) setHabDefault(created.id, usarImpuestosTipo ? null : formImpuestos);
        toast({ title: 'Habitación creada', description: `Habitación ${formData.numero} creada exitosamente` });
      }
      setModalOpen(false);
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!habToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteHabitacion(habToDelete.id);
      toast({ title: 'Habitación eliminada', description: `Habitación ${habToDelete.numero} eliminada` });
      setDeleteDialogOpen(false);
      setHabToDelete(null);
      cargarDatos();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (hab: any) => {
    setHabToDelete(hab);
    setDeleteDialogOpen(true);
  };

  const roomStats = [
    { label: 'Disponibles', filter: 'Disponible', count: habitaciones.filter(h => h.estado_habitacion === 'Disponible' && h.estado_limpieza === 'Limpia' && h.estado_mantenimiento === 'OK').length, className: 'text-success' },
    { label: 'Ocupadas', filter: 'Ocupada', count: habitaciones.filter(h => h.estado_habitacion === 'Ocupada').length, className: 'text-warning' },
    { label: 'Reservadas', filter: 'Reservada', count: habitaciones.filter(h => h.estado_habitacion === 'Reservada').length, className: 'text-primary' },
    { label: 'Limpieza', filter: 'Limpieza', count: habitaciones.filter(h => h.estado_limpieza !== 'Limpia' && h.estado_mantenimiento === 'OK').length, className: 'text-info' },
    { label: 'Mantenimiento', filter: 'Mantenimiento', count: habitaciones.filter(h => h.estado_mantenimiento !== 'OK').length, className: 'text-destructive' },
  ];

  if (loading) {
    return (
      <MainLayout title="Habitaciones" subtitle="Estado y disponibilidad del hotel">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted/30" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Habitaciones" subtitle="Estado, disponibilidad y publicación online">
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-5 sm:divide-y-0">
            {roomStats.map(stat => (
              <button
                type="button"
                key={stat.label}
                onClick={() => setFilterEstado(filterEstado === stat.filter ? 'all' : stat.filter)}
                className={cn(
                  'flex items-center justify-between gap-3 p-3 text-left transition hover:bg-muted/40',
                  filterEstado === stat.filter && 'bg-primary/5'
                )}
              >
                <div>
                  <p className={cn('text-lg font-bold tabular-nums', stat.className)}>{stat.count}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
                <span className={cn('h-2 w-2 rounded-full bg-current opacity-70', stat.className)} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 xl:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar habitación o tipo..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={filterPiso} onValueChange={setFilterPiso}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Piso" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos los pisos</SelectItem>{pisos.map(p => <SelectItem key={p} value={p.toString()}>Piso {p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{tiposHabitacion.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[145px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Disponible">Disponible</SelectItem>
              <SelectItem value="Ocupada">Ocupada</SelectItem>
              <SelectItem value="Reservada">Reservada</SelectItem>
              <SelectItem value="Bloqueada">Bloqueada</SelectItem>
              <SelectItem value="Limpieza">Limpieza</SelectItem>
              <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || filterPiso !== 'all' || filterTipo !== 'all' || filterEstado !== 'all') && (
            <Button variant="ghost" size="sm" onClick={handleResetAll}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Limpiar</Button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')} className="shrink-0 rounded-lg border p-0.5">
            <ToggleGroupItem value="list" aria-label="Vista lista" className="h-8 w-8 p-0"><List className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Vista mapa" className="h-8 w-8 p-0"><Grid3X3 className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={openNewModal} size="sm" className="shrink-0"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva habitación</Button>
          <ExportButton
            rows={() => filteredHabitaciones.map((h: any) => ({
              Número: h.numero,
              Tipo: h.tipo_nombre || h.tipos_habitacion?.nombre || '',
              Piso: h.piso ?? '',
              Estado: h.estado_habitacion || '',
              Limpieza: h.estado_limpieza || '',
              Mantenimiento: h.estado_mantenimiento || '',
              'Precio base': h.precio_base ?? h.tipos_habitacion?.precio_base ?? 0,
              Notas: h.notas || '',
            }))}
            filename="habitaciones"
            sheetName="Habitaciones"
            label="Exportar"
          />
          <HabitacionesImport tiposHabitacion={tiposHabitacion} onImported={cargarDatos} />
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filteredHabitaciones.length} de {habitaciones.length} habitaciones</span>
        <span className="hidden sm:inline">Los estados de limpieza y mantenimiento tienen prioridad visual.</span>
      </div>

      {viewMode === 'list' && (
        <Card className="overflow-hidden">
          <div className="border-b px-3 py-2">
            <BulkActionBar
              count={dt.selectedCount}
              onClear={dt.clearSelection}
              onDelete={eliminarSeleccionadas}
              onExport={exportarCsv}
              deleting={eliminandoBulk}
              entityName="habitaciones"
              extraActions={
                <>
                  <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('Disponible')} disabled={eliminandoBulk}><DoorOpen className="mr-1 h-3.5 w-3.5" /> Disponible</Button>
                  <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('Bloqueada')} disabled={eliminandoBulk}><DoorClosed className="mr-1 h-3.5 w-3.5" /> Bloquear</Button>
                  <Button variant="outline" size="sm" onClick={() => cambiarWebBulk(false)} disabled={eliminandoBulk}><Globe className="mr-1 h-3.5 w-3.5 text-success" /> Publicar</Button>
                  <Button variant="outline" size="sm" onClick={() => cambiarWebBulk(true)} disabled={eliminandoBulk}><GlobeLock className="mr-1 h-3.5 w-3.5 text-destructive" /> Excluir</Button>
                </>
              }
            />
          </div>
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"><Checkbox checked={dt.allVisibleSelected ? true : dt.someVisibleSelected ? 'indeterminate' : false} onCheckedChange={(v) => dt.toggleSelectAllVisible(!!v)} /></TableHead>
                <SortHeader label="Habitación" columnKey="numero" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.numero} onFilterChange={(v) => dt.setColumnFilter('numero', v)} onValuesChange={(vs) => dt.setColumnFilterValues('numero', vs)} filterOptions={filteredHabitaciones.map((h: any) => h.numero)} />
                <SortHeader label="Tipo" columnKey="tipo" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.tipo} onFilterChange={(v) => dt.setColumnFilter('tipo', v)} onValuesChange={(vs) => dt.setColumnFilterValues('tipo', vs)} filterOptions={filteredHabitaciones.map((h: any) => h.tipo_nombre)} />
                <SortHeader label="Piso" columnKey="piso" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.piso} onFilterChange={(v) => dt.setColumnFilter('piso', v)} onValuesChange={(vs) => dt.setColumnFilterValues('piso', vs)} filterOptions={filteredHabitaciones.map((h: any) => h.piso)} />
                <SortHeader label="Estado" columnKey="estado" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.estado} onFilterChange={(v) => dt.setColumnFilter('estado', v)} onValuesChange={(vs) => dt.setColumnFilterValues('estado', vs)} filterOptions={filteredHabitaciones.map((h: any) => h.estado_habitacion)} />
                <SortHeader label="Limpieza" columnKey="limpieza" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.limpieza} onFilterChange={(v) => dt.setColumnFilter('limpieza', v)} onValuesChange={(vs) => dt.setColumnFilterValues('limpieza', vs)} filterOptions={filteredHabitaciones.map((h: any) => h.estado_limpieza)} />
                <SortHeader label="Mantenimiento" columnKey="mantenimiento" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.mantenimiento} onFilterChange={(v) => dt.setColumnFilter('mantenimiento', v)} onValuesChange={(vs) => dt.setColumnFilterValues('mantenimiento', vs)} filterOptions={filteredHabitaciones.map((h: any) => h.estado_mantenimiento)} />
                <TableHead className="text-center">Web</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dt.processed.map(hab => (
                <TableRow key={hab.id} className={dt.selected.has(hab.id) ? 'bg-primary/5' : ''}>
                  <TableCell><Checkbox checked={dt.selected.has(hab.id)} onCheckedChange={() => dt.toggleRow(hab.id)} /></TableCell>
                  <TableCell><span className="font-bold tabular-nums">{hab.numero}</span></TableCell>
                  <TableCell><div className="flex flex-col"><span className="font-medium">{hab.tipo_nombre}</span><span className="text-[11px] text-muted-foreground">{hab.tipo_codigo}</span></div></TableCell>
                  <TableCell>{hab.piso}</TableCell>
                  <TableCell>{getStatusBadge(hab)}</TableCell>
                  <TableCell><Badge variant={hab.estado_limpieza === 'Limpia' ? 'secondary' : 'outline'}>{hab.estado_limpieza}</Badge></TableCell>
                  <TableCell><Badge variant={hab.estado_mantenimiento === 'OK' ? 'secondary' : 'destructive'}>{hab.estado_mantenimiento}</Badge></TableCell>
                  <TableCell className="text-center"><div className="flex items-center justify-center gap-2"><Switch checked={!hab.excluida_publica} onCheckedChange={() => toggleWebSingle(hab)} aria-label="Publicada en la web" />{hab.excluida_publica ? <GlobeLock className="h-3.5 w-3.5 text-muted-foreground" /> : <Globe className="h-3.5 w-3.5 text-success" />}</div></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(hab)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Disponible')}><DoorOpen className="mr-2 h-4 w-4" /> Disponible</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Bloqueada')}><DoorClosed className="mr-2 h-4 w-4" /> Bloquear</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Limpieza')}><Sparkles className="mr-2 h-4 w-4" /> Enviar a limpieza</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Mantenimiento')}><Wrench className="mr-2 h-4 w-4" /> Reportar falla</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => confirmDelete(hab)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {dt.processed.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No hay habitaciones que coincidan.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      {viewMode === 'grid' && (
        filteredHabitaciones.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 text-center">
            <DoorOpen className="mb-3 h-9 w-9 text-muted-foreground/40" />
            <p className="font-medium">No hay habitaciones en esta vista</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleResetAll}>Ver todas</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredHabitaciones.map(hab => (
              <Card key={hab.id} className={cn('group transition hover:-translate-y-0.5 hover:shadow-md', getStatusColor(hab))}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xl font-bold leading-none tabular-nums">{hab.numero}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{hab.tipo_nombre || hab.tipo_codigo || 'Habitación'}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(hab)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Limpieza')}><Sparkles className="mr-2 h-4 w-4" /> Enviar a limpieza</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Mantenimiento')}><Wrench className="mr-2 h-4 w-4" /> Reportar falla</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => confirmDelete(hab)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {getStatusBadge(hab)}
                    <span className="text-[10px] text-muted-foreground">Piso {hab.piso ?? '—'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
                    <span>{hab.estado_limpieza === 'Limpia' ? 'Limpia' : hab.estado_limpieza}</span>
                    <span>{hab.estado_mantenimiento === 'OK' ? 'Sin fallas' : hab.estado_mantenimiento}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHab ? `Editar habitación ${editingHab.numero}` : 'Nueva habitación'}</DialogTitle>
            <DialogDescription>{editingHab ? 'Actualiza sus datos, publicación e impuestos.' : 'Agrega una habitación al inventario del hotel.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Número de habitación</Label>
              <Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} placeholder="Ej. 101" />
            </div>
            <div className="grid gap-1.5">
              <Label>Piso</Label>
              <Input type="number" value={formData.piso} onChange={(e) => setFormData({ ...formData, piso: e.target.value })} placeholder="Ej. 1" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Tipo de habitación</Label>
              <ComboboxCreatable
                options={tiposHabitacion.map(t => ({ value: t.id, label: `${t.nombre} · ${formatCurrency(t.precio_base)}` }))}
                value={formData.tipo_habitacion_id}
                onValueChange={(v) => setFormData({ ...formData, tipo_habitacion_id: v })}
                onCreate={async (nombre) => {
                  try {
                    const newTipo = await api.createTipoHabitacion({ nombre, precio_base: 1000 });
                    setTiposHabitacion([...tiposHabitacion, newTipo]);
                    toast({ title: 'Tipo de habitación creado' });
                    return { value: newTipo.id, label: `${newTipo.nombre} · ${formatCurrency(newTipo.precio_base)}` };
                  } catch (e: any) {
                    toast({ title: 'Error', description: e.message, variant: 'destructive' });
                  }
                }}
                placeholder="Seleccionar tipo..."
                searchPlaceholder="Buscar o crear tipo..."
                createLabel="Crear tipo"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Estado</Label>
              <Select value={formData.estado_habitacion} onValueChange={(v) => setFormData({ ...formData, estado_habitacion: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="Ocupada">Ocupada</SelectItem>
                  <SelectItem value="Reservada">Reservada</SelectItem>
                  <SelectItem value="Bloqueada">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="pr-3">
                <Label className="font-medium">Reservas online</Label>
                <p className="text-[11px] text-muted-foreground">{formData.excluida_publica ? 'Oculta en la web' : 'Disponible en la web'}</p>
              </div>
              <Switch checked={!formData.excluida_publica} onCheckedChange={(v) => setFormData({ ...formData, excluida_publica: !v })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Fotos</Label>
              <p className="text-[11px] text-muted-foreground">La primera imagen será la portada. Puedes subir hasta 10.</p>
              <MultiImageUpload bucket="habitacion-fotos" value={formData.fotos || []} onChange={(urls) => setFormData({ ...formData, fotos: urls })} folder="habitaciones" maxImages={10} />
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div><Label className="font-medium">Heredar impuestos del tipo</Label><p className="text-[11px] text-muted-foreground">Desactívalo solo si esta habitación necesita una regla propia.</p></div>
                <Switch checked={usarImpuestosTipo} onCheckedChange={setUsarImpuestosTipo} />
              </div>
              {!usarImpuestosTipo && <ImpuestosEditor value={formImpuestos} onChange={setFormImpuestos} title="Impuestos específicos" hint="Sobrescribe los impuestos del tipo para esta habitación." />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : (editingHab ? 'Guardar cambios' : 'Crear habitación')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar habitación {habToDelete?.numero}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">{isDeleting ? 'Eliminando...' : 'Eliminar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
