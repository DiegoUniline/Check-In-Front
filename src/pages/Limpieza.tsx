import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Clock, CheckCircle, AlertTriangle,
  User, Play, Check, Eye, RefreshCw, UserPlus,
  RotateCcw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';

export default function Limpieza() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tareas, setTareas] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterPrioridad, setFilterPrioridad] = useState('all');
  const [filterEmpleado, setFilterEmpleado] = useState('all');
  const [asignarModal, setAsignarModal] = useState<{ open: boolean; tarea: any | null }>({ open: false, tarea: null });
  const [selectedEmpleado, setSelectedEmpleado] = useState('');
  const [eliminandoBulk, setEliminandoBulk] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [tareasData, empleadosData] = await Promise.all([
        api.getTareasLimpieza(),
        api.getEmpleados().catch(() => [])
      ]);
      setTareas(Array.isArray(tareasData) ? tareasData : []);
      setEmpleados(Array.isArray(empleadosData) ? empleadosData : []);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las tareas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const filteredTareas = tareas.filter(t => {
    const matchEstado = filterEstado === 'all' || t.estado === filterEstado;
    const matchPrioridad = filterPrioridad === 'all' || t.prioridad === filterPrioridad;
    const asignadoId = t.asignado_a || t.empleado_id || '';
    const matchEmpleado = filterEmpleado === 'all'
      || (filterEmpleado === 'sin_asignar' && !asignadoId && !t.asignado_nombre && !t.asignadoNombre)
      || asignadoId === filterEmpleado;
    return matchEstado && matchPrioridad && matchEmpleado;
  });

  const accessors = useMemo(() => ({
    estado: (t: any) => t.estado || '',
  }), []);
  const dt = useDataTable<any>(filteredTareas, accessors);

  const handleResetAll = () => {
    setFilterEstado('all');
    setFilterPrioridad('all');
    setFilterEmpleado('all');
    dt.resetPersisted();
  };

  const eliminarSeleccionadas = async () => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.deleteTareaLimpieza?.(id) ?? Promise.resolve()));
      toast({ title: 'Tareas eliminadas', description: `Se eliminaron ${ids.length} tarea(s).` });
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
      await Promise.all(ids.map(id => api.updateEstadoLimpieza(id, estado)));
      toast({ title: 'Estado actualizado', description: `${ids.length} tarea(s) → ${estado}` });
      dt.clearSelection();
      await cargarDatos();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getHabitacionNumero = (tarea: any) => {
    if (tarea.habitacion?.numero) return tarea.habitacion.numero;
    return tarea.habitacion_numero || tarea.numero_habitacion || 'N/A';
  };

  const getHabitacionTipo = (tarea: any) => {
    if (tarea.habitacion?.tipo?.nombre) return tarea.habitacion.tipo.nombre;
    return tarea.tipo_habitacion_nombre || tarea.habitacion_tipo || tarea.tipo_habitacion || '';
  };

  const exportarCsv = () => {
    const rows = dt.selectedRows.length > 0 ? dt.selectedRows : dt.processed;
    exportToCsv('tareas_limpieza', rows, [
      { key: 'habitacion', label: 'Habitación', accessor: (t) => getHabitacionNumero(t) },
      { key: 'tipo', label: 'Tipo', accessor: (t) => t.tipo || '' },
      { key: 'prioridad', label: 'Prioridad', accessor: (t) => t.prioridad || '' },
      { key: 'estado', label: 'Estado', accessor: (t) => t.estado || '' },
      { key: 'asignado', label: 'Asignado', accessor: (t) => t.asignado_nombre || '' },
      { key: 'notas', label: 'Notas', accessor: (t) => t.notas || '' },
    ]);
  };

  const stats = {
    pendientes: tareas.filter(t => t.estado === 'Pendiente').length,
    enProceso: tareas.filter(t => t.estado === 'EnProceso' || t.estado === 'En Proceso').length,
    completadas: tareas.filter(t => t.estado === 'Completada' || t.estado === 'Verificada').length,
    inspecciones: tareas.filter(t => t.estado === 'Completada').length,
    urgentes: tareas.filter(t => t.prioridad === 'Urgente' && t.estado !== 'Verificada').length,
  };

  const totalTareas = tareas.length || 1;
  const progreso = Math.round((stats.completadas / totalTareas) * 100) || 0;

  const getPrioridadColor = (p?: string) => {
    switch (p) {
      case 'Urgente': return 'bg-destructive text-destructive-foreground';
      case 'Alta': return 'bg-warning text-warning-foreground';
      case 'Normal': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleCambiarEstado = async (tarea: any, nuevoEstado: string) => {
    try {
      await api.updateEstadoLimpieza(tarea.id, nuevoEstado);
      toast({
        title: 'Estado actualizado',
        description: `Habitación ${getHabitacionNumero(tarea)} · ${nuevoEstado}`,
      });
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAsignar = async () => {
    if (!asignarModal.tarea || !selectedEmpleado) return;
    try {
      const empleado = empleados.find(e => e.id === selectedEmpleado);
      await api.asignarLimpieza(asignarModal.tarea.id, selectedEmpleado, empleado?.nombre || '');
      toast({ title: 'Tarea asignada', description: `Asignada a ${empleado?.nombre}` });
      setAsignarModal({ open: false, tarea: null });
      setSelectedEmpleado('');
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Limpieza" subtitle="Estado de habitaciones y tareas">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted/30" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Limpieza" subtitle="Prioriza, asigna y libera habitaciones">
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-5 sm:divide-y-0">
            <button type="button" onClick={() => setFilterEstado('Pendiente')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <Clock className="h-4 w-4 text-warning" />
              <div><p className="text-lg font-bold tabular-nums">{stats.pendientes}</p><p className="text-[11px] text-muted-foreground">Pendientes</p></div>
            </button>
            <button type="button" onClick={() => setFilterEstado('EnProceso')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <Play className="h-4 w-4 text-info" />
              <div><p className="text-lg font-bold tabular-nums">{stats.enProceso}</p><p className="text-[11px] text-muted-foreground">En proceso</p></div>
            </button>
            <button type="button" onClick={() => setFilterEstado('Completada')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <Eye className="h-4 w-4 text-primary" />
              <div><p className="text-lg font-bold tabular-nums">{stats.inspecciones}</p><p className="text-[11px] text-muted-foreground">Por inspeccionar</p></div>
            </button>
            <button type="button" onClick={() => setFilterPrioridad('Urgente')} className="flex items-center gap-2 p-3 text-left transition hover:bg-muted/40">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div><p className="text-lg font-bold tabular-nums">{stats.urgentes}</p><p className="text-[11px] text-muted-foreground">Urgentes</p></div>
            </button>
            <div className="col-span-2 flex items-center gap-3 p-3 sm:col-span-1">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-semibold text-primary">{progreso}%</span>
                </div>
                <Progress value={progreso} className="h-2" />
              </div>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="h-9 w-[145px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="EnProceso">En proceso</SelectItem>
              <SelectItem value="Completada">Por inspeccionar</SelectItem>
              <SelectItem value="Verificada">Verificada</SelectItem>
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
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Empleado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los empleados</SelectItem>
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

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <span className="text-xs text-muted-foreground">{filteredTareas.length} tareas</span>
          <Button variant="outline" size="sm" className="h-9" onClick={cargarDatos}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualizar
          </Button>
        </div>
      </div>

      <BulkActionBar
        count={dt.selectedCount}
        onClear={dt.clearSelection}
        onDelete={eliminarSeleccionadas}
        onExport={exportarCsv}
        deleting={eliminandoBulk}
        entityName="tareas"
        extraActions={
          <>
            <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('EnProceso')}>Iniciar</Button>
            <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('Completada')}>Completar</Button>
            <Button variant="outline" size="sm" onClick={() => cambiarEstadoBulk('Verificada')}>Verificar</Button>
          </>
        }
      />

      {filteredTareas.length === 0 ? (
        <div className="flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 text-center">
          <Sparkles className="mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">No hay tareas en esta vista</p>
          <p className="mt-1 text-sm text-muted-foreground">Cambia los filtros para ver otras habitaciones.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleResetAll}>Ver todas</Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {dt.processed.map((tarea: any) => {
            const sinAsignar = !tarea.asignado_nombre && !tarea.asignadoNombre;
            return (
              <Card key={tarea.id} className={cn(
                "group transition hover:border-primary/30 hover:shadow-md",
                tarea.prioridad === 'Urgente' && "border-destructive/50",
                dt.selected.has(tarea.id) && "ring-2 ring-primary"
              )}>
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={dt.selected.has(tarea.id)}
                      onCheckedChange={() => dt.toggleRow(tarea.id)}
                      aria-label="Seleccionar tarea"
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                      {getHabitacionNumero(tarea)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{tarea.tipo || tarea.tipo_limpieza || 'Limpieza'}</p>
                          <p className="truncate text-xs text-muted-foreground">{getHabitacionTipo(tarea) || 'Habitación'}</p>
                        </div>
                        <Badge className={cn('shrink-0 text-[10px]', getPrioridadColor(tarea.prioridad))}>{tarea.prioridad || 'Normal'}</Badge>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">{tarea.asignado_nombre || tarea.asignadoNombre || 'Sin asignar'}</span>
                        {sinAsignar && (
                          <button
                            type="button"
                            className="ml-auto font-medium text-primary hover:underline"
                            onClick={() => { setAsignarModal({ open: true, tarea }); setSelectedEmpleado(''); }}
                          >
                            Asignar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {(tarea.notas || tarea.observaciones) && (
                    <p className="mt-3 line-clamp-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                      {tarea.notas || tarea.observaciones}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 border-t pt-3">
                    {tarea.estado === 'Pendiente' && (
                      <Button size="sm" className="h-8 flex-1" onClick={() => handleCambiarEstado(tarea, 'EnProceso')}>
                        <Play className="mr-1 h-3.5 w-3.5" /> Iniciar
                      </Button>
                    )}
                    {(tarea.estado === 'EnProceso' || tarea.estado === 'En Proceso') && (
                      <Button size="sm" className="h-8 flex-1" onClick={() => handleCambiarEstado(tarea, 'Completada')}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Marcar lista
                      </Button>
                    )}
                    {tarea.estado === 'Completada' && (
                      <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => handleCambiarEstado(tarea, 'Verificada')}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Verificar habitación
                      </Button>
                    )}
                    {tarea.estado === 'Verificada' && (
                      <div className="flex h-8 flex-1 items-center justify-center rounded-md bg-success/10 text-xs font-semibold text-success">
                        <CheckCircle className="mr-1 h-3.5 w-3.5" /> Habitación lista
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={asignarModal.open} onOpenChange={(open) => setAsignarModal({ open, tarea: open ? asignarModal.tarea : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar tarea</DialogTitle>
            <DialogDescription>Habitación {asignarModal.tarea ? getHabitacionNumero(asignarModal.tarea) : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{asignarModal.tarea?.tipo || 'Limpieza general'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Selecciona a la persona responsable.</p>
            </div>
            <div className="space-y-2">
              <Label>Empleado</Label>
              <ComboboxCreatable
                options={empleados.map(e => ({ value: e.id, label: `${e.nombre}${e.puesto ? ` (${e.puesto})` : ''}` }))}
                value={selectedEmpleado}
                onValueChange={setSelectedEmpleado}
                placeholder="Seleccionar empleado..."
                searchPlaceholder="Buscar empleado..."
              />
            </div>
            <Button className="w-full" onClick={handleAsignar} disabled={!selectedEmpleado}>
              <UserPlus className="mr-2 h-4 w-4" /> Asignar tarea
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
