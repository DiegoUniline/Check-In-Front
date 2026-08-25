import { useState, useEffect, useMemo } from 'react';
import {
  Wrench, CheckCircle, AlertTriangle, Plus,
  User, Calendar, RefreshCw, RotateCcw, Play, Check
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataTable } from '@/hooks/useDataTable';
import { BulkActionBar } from '@/components/datatable/BulkActionBar';
import { exportToCsv } from '@/lib/exportCsv';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';
import { formatDate } from '@/lib/dateFormat';

export default function Mantenimiento() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterPrioridad, setFilterPrioridad] = useState('all');
  const [filterEmpleado, setFilterEmpleado] = useState('all');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [eliminandoBulk, setEliminandoBulk] = useState(false);

  const [formData, setFormData] = useState({
    habitacion_id: '',
    titulo: '',
    categoria: '',
    descripcion: '',
    prioridad: 'Normal',
    asignado_a: '',
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [tareasData, habsData, empleadosData] = await Promise.all([
        api.getTareasMantenimiento(),
        api.getHabitaciones(),
        api.getEmpleados().catch(() => [])
      ]);
      setTickets(Array.isArray(tareasData) ? tareasData : []);
      setHabitaciones(Array.isArray(habsData) ? habsData : []);
      setEmpleados(Array.isArray(empleadosData) ? empleadosData : []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const filteredTickets = tickets.filter(t => {
    const matchEstado = filterEstado === 'all' || t.estado === filterEstado;
    const matchPrioridad = filterPrioridad === 'all' || t.prioridad === filterPrioridad;
    const asignadoId = t.asignado_a || t.empleado_id || '';
    const matchEmpleado = filterEmpleado === 'all'
      || (filterEmpleado === 'sin_asignar' && !asignadoId && !t.asignado_nombre && !t.asignado)
      || asignadoId === filterEmpleado;
    return matchEstado && matchPrioridad && matchEmpleado;
  });

  const accessors = useMemo(() => ({
    estado: (t: any) => t.estado || '',
  }), []);
  const dt = useDataTable<any>(filteredTickets, accessors);

  const handleResetAll = () => {
    setFilterEstado('all');
    setFilterPrioridad('all');
    setFilterEmpleado('all');
    dt.resetPersisted();
  };

  const eliminarSeleccionados = async () => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.deleteTareaMantenimiento?.(id) ?? Promise.resolve()));
      toast({ title: 'Tickets eliminados', description: `Se eliminaron ${ids.length} ticket(s).` });
      dt.clearSelection();
      await cargarDatos();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message, variant: 'destructive' });
    } finally {
      setEliminandoBulk(false);
    }
  };

  const cambiarEstadoBulk = async (estado: string) => {
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.updateEstadoMantenimiento(id, estado)));
      toast({ title: 'Estado actualizado', description: `${ids.length} ticket(s) → ${estado}` });
      dt.clearSelection();
      await cargarDatos();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getHabitacionNumero = (ticket: any) => {
    if (ticket.habitacion?.numero) return ticket.habitacion.numero;
    return ticket.habitacion_numero || ticket.numero_habitacion || 'N/A';
  };

  const exportarCsv = () => {
    const rows = dt.selectedRows.length > 0 ? dt.selectedRows : dt.processed;
    exportToCsv('tickets_mantenimiento', rows, [
      { key: 'habitacion', label: 'Habitación', accessor: (t) => getHabitacionNumero(t) },
      { key: 'titulo', label: 'Título', accessor: (t) => t.titulo || '' },
      { key: 'categoria', label: 'Categoría', accessor: (t) => t.categoria || '' },
      { key: 'prioridad', label: 'Prioridad', accessor: (t) => t.prioridad || '' },
      { key: 'estado', label: 'Estado', accessor: (t) => t.estado || '' },
      { key: 'asignado', label: 'Asignado', accessor: (t) => t.asignado_nombre || '' },
      { key: 'descripcion', label: 'Descripción', accessor: (t) => t.descripcion || '' },
    ]);
  };

  const stats = {
    abiertos: tickets.filter(t => t.estado === 'Abierto' || t.estado === 'Pendiente').length,
    enProceso: tickets.filter(t => t.estado === 'EnProceso' || t.estado === 'En Proceso').length,
    resueltos: tickets.filter(t => t.estado === 'Resuelto' || t.estado === 'Completada' || t.estado === 'Completado' || t.estado === 'Cerrado').length,
    criticos: tickets.filter(t => (t.prioridad === 'Crítica' || t.prioridad === 'Urgente') && t.estado !== 'Cerrado' && t.estado !== 'Completada' && t.estado !== 'Completado').length,
  };

  const getPrioridadColor = (p?: string) => {
    switch (p) {
      case 'Crítica':
      case 'Urgente': return 'bg-destructive text-destructive-foreground';
      case 'Alta': return 'bg-warning text-warning-foreground';
      case 'Normal': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEstadoColor = (e?: string) => {
    switch (e) {
      case 'Abierto':
      case 'Pendiente': return 'border-warning/40';
      case 'EnProceso':
      case 'En Proceso': return 'border-info/40';
      case 'Resuelto':
      case 'Completada':
      case 'Completado': return 'border-success/40';
      case 'Cerrado': return 'border-muted';
      default: return '';
    }
  };

  const handleCreateTicket = async () => {
    if (!formData.habitacion_id || !formData.titulo || !formData.descripcion) {
      toast({ title: 'Faltan datos', description: 'Completa habitación, título y descripción.', variant: 'destructive' });
      return;
    }

    try {
      const empleadoSeleccionado = empleados.find(e => e.id === formData.asignado_a);
      await api.createTareaMantenimiento({
        habitacion_id: formData.habitacion_id,
        titulo: formData.titulo,
        categoria: formData.categoria || 'General',
        descripcion: formData.descripcion,
        prioridad: formData.prioridad,
        estado: 'Pendiente',
        asignado_a: formData.asignado_a || null,
        asignado_nombre: empleadoSeleccionado?.nombre || null,
      });
      toast({ title: 'Ticket creado', description: 'El problema quedó registrado.' });
      setIsNewTicketOpen(false);
      setFormData({ habitacion_id: '', titulo: '', categoria: '', descripcion: '', prioridad: 'Normal', asignado_a: '' });
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCambiarEstado = async (ticket: any, nuevoEstado: string) => {
    try {
      await api.updateEstadoMantenimiento(ticket.id, nuevoEstado);
      toast({ title: 'Estado actualizado', description: `Ticket → ${nuevoEstado}` });
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Mantenimiento" subtitle="Incidencias y reparaciones">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted/30" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Mantenimiento" subtitle="Detecta, asigna y resuelve incidencias">
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
            <button type="button" onClick={() => setFilterEstado('Pendiente')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div><p className="text-lg font-bold tabular-nums">{stats.abiertos}</p><p className="text-[11px] text-muted-foreground">Abiertos</p></div>
            </button>
            <button type="button" onClick={() => setFilterEstado('EnProceso')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <Wrench className="h-4 w-4 text-info" />
              <div><p className="text-lg font-bold tabular-nums">{stats.enProceso}</p><p className="text-[11px] text-muted-foreground">En proceso</p></div>
            </button>
            <button type="button" onClick={() => setFilterPrioridad('Urgente')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div><p className="text-lg font-bold tabular-nums">{stats.criticos}</p><p className="text-[11px] text-muted-foreground">Críticos</p></div>
            </button>
            <button type="button" onClick={() => setFilterEstado('Completada')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <CheckCircle className="h-4 w-4 text-success" />
              <div><p className="text-lg font-bold tabular-nums">{stats.resueltos}</p><p className="text-[11px] text-muted-foreground">Resueltos</p></div>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="h-9 w-[145px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="EnProceso">En proceso</SelectItem>
              <SelectItem value="Completada">Resuelto</SelectItem>
              <SelectItem value="Cerrado">Cerrado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda prioridad</SelectItem>
              <SelectItem value="Urgente">Urgente</SelectItem>
              <SelectItem value="Alta">Alta</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Baja">Baja</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEmpleado} onValueChange={setFilterEmpleado}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los responsables</SelectItem>
              <SelectItem value="sin_asignar">Sin asignar</SelectItem>
              {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
            </SelectContent>
          </Select>

          {(filterEstado !== 'all' || filterPrioridad !== 'all' || filterEmpleado !== 'all') && (
            <Button variant="ghost" size="sm" className="h-9" onClick={handleResetAll}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Limpiar filtros
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 xl:justify-end">
          <span className="text-xs text-muted-foreground">{filteredTickets.length} tickets</span>
          <Button variant="outline" size="sm" className="h-9" onClick={cargarDatos}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualizar
          </Button>
          <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo ticket</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo ticket de mantenimiento</DialogTitle>
                <DialogDescription>Registra el problema con lo mínimo necesario para actuar.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Habitación *</Label>
                    <Select value={formData.habitacion_id} onValueChange={(v) => setFormData({ ...formData, habitacion_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {habitaciones.map(h => <SelectItem key={h.id} value={h.id}>{h.numero} · {h.tipo_nombre || h.tipo_codigo || 'Habitación'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Plomería">Plomería</SelectItem>
                        <SelectItem value="Electricidad">Electricidad</SelectItem>
                        <SelectItem value="Mobiliario">Mobiliario</SelectItem>
                        <SelectItem value="HVAC">Aire / calefacción</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Título *</Label>
                  <Input placeholder="Ej. Fuga de agua en baño" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Prioridad</Label>
                    <Select value={formData.prioridad} onValueChange={(v) => setFormData({ ...formData, prioridad: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baja">Baja</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Asignar a</Label>
                    <ComboboxCreatable
                      options={empleados.map(e => ({ value: e.id, label: `${e.nombre}${e.puesto ? ` (${e.puesto})` : ''}` }))}
                      value={formData.asignado_a}
                      onValueChange={(v) => setFormData({ ...formData, asignado_a: v })}
                      placeholder="Sin asignar"
                      searchPlaceholder="Buscar empleado..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Descripción *</Label>
                  <Textarea className="min-h-24" placeholder="Qué ocurre, dónde y cualquier detalle útil..." value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleCreateTicket}>Crear ticket</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <BulkActionBar
        count={dt.selectedCount}
        onClear={dt.clearSelection}
        onDelete={eliminarSeleccionados}
        onExport={exportarCsv}
        deleting={eliminandoBulk}
        entityName="tickets"
        extraActions={
          <>
            <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('EnProceso')}>Iniciar</Button>
            <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('Completada')}>Resolver</Button>
            <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('Cerrado')}>Cerrar</Button>
          </>
        }
      />

      {filteredTickets.length === 0 ? (
        <div className="flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 text-center">
          <Wrench className="mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">No hay tickets en esta vista</p>
          <p className="mt-1 text-sm text-muted-foreground">Cambia los filtros o registra una incidencia nueva.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleResetAll}>Ver todos</Button>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {dt.processed.map(ticket => (
            <Card key={ticket.id} className={cn("transition hover:border-primary/30 hover:shadow-md", getEstadoColor(ticket.estado), dt.selected.has(ticket.id) && 'ring-2 ring-primary')}>
              <CardContent className="p-3.5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={dt.selected.has(ticket.id)}
                    onCheckedChange={() => dt.toggleRow(ticket.id)}
                    aria-label="Seleccionar ticket"
                    className="mt-1"
                  />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                    {getHabitacionNumero(ticket)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="mr-auto min-w-0 truncate text-sm font-semibold">{ticket.titulo || ticket.numero_ticket || `Ticket ${ticket.id?.slice(0, 6)}`}</p>
                      <Badge variant="outline" className="text-[10px]">{ticket.categoria || 'General'}</Badge>
                      <Badge className={cn('text-[10px]', getPrioridadColor(ticket.prioridad))}>{ticket.prioridad || 'Normal'}</Badge>
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{ticket.descripcion || 'Sin descripción'}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {ticket.asignado_nombre || ticket.asignado || 'Sin asignar'}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {ticket.fecha_creacion || ticket.created_at ? formatDate(ticket.fecha_creacion || ticket.created_at) : 'Sin fecha'}</span>
                      <span className="ml-auto font-medium text-foreground">{ticket.estado || 'Pendiente'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                  {(ticket.estado === 'Pendiente' || ticket.estado === 'Abierto') && (
                    <Button size="sm" className="h-8" onClick={() => handleCambiarEstado(ticket, 'EnProceso')}>
                      <Play className="mr-1 h-3.5 w-3.5" /> Iniciar trabajo
                    </Button>
                  )}
                  {(ticket.estado === 'EnProceso' || ticket.estado === 'En Proceso') && (
                    <Button size="sm" className="h-8" onClick={() => handleCambiarEstado(ticket, 'Completada')}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Marcar resuelto
                    </Button>
                  )}
                  {(ticket.estado === 'Completada' || ticket.estado === 'Completado' || ticket.estado === 'Resuelto' || ticket.estado === 'Cerrado') && (
                    <div className="flex h-8 items-center rounded-md bg-success/10 px-3 text-xs font-semibold text-success">
                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Resuelto
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
