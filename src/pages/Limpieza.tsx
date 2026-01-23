import { useState, useEffect } from 'react';
import { 
  Sparkles, Clock, CheckCircle, AlertTriangle, 
  User, Play, Check, Eye, RefreshCw, UserPlus
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  const [asignarModal, setAsignarModal] = useState<{ open: boolean; tarea: any | null }>({ open: false, tarea: null });
  const [selectedEmpleado, setSelectedEmpleado] = useState('');

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
    return matchEstado && matchPrioridad;
  });

  // Stats
  const stats = {
    pendientes: tareas.filter(t => t.estado === 'Pendiente').length,
    enProceso: tareas.filter(t => t.estado === 'EnProceso' || t.estado === 'En Proceso').length,
    completadas: tareas.filter(t => t.estado === 'Completada' || t.estado === 'Verificada').length,
    inspecciones: tareas.filter(t => t.estado === 'Completada').length,
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

  const getHabitacionNumero = (tarea: any) => {
    if (tarea.habitacion?.numero) return tarea.habitacion.numero;
    return tarea.habitacion_numero || tarea.numero_habitacion || 'N/A';
  };

  const getHabitacionTipo = (tarea: any) => {
    if (tarea.habitacion?.tipo?.nombre) return tarea.habitacion.tipo.nombre;
    return tarea.tipo_habitacion_nombre || tarea.habitacion_tipo || tarea.tipo_habitacion || '';
  };

  const handleCambiarEstado = async (tarea: any, nuevoEstado: string) => {
    try {
      await api.updateEstadoLimpieza(tarea.id, nuevoEstado);
      toast({
        title: 'Estado actualizado',
        description: `Habitación ${getHabitacionNumero(tarea)} - ${nuevoEstado}`,
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
      toast({
        title: 'Tarea asignada',
        description: `Asignada a ${empleado?.nombre}`,
      });
      setAsignarModal({ open: false, tarea: null });
      setSelectedEmpleado('');
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Módulo de Limpieza" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Módulo de Limpieza" 
      subtitle="Gestión de tareas de housekeeping"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-warning/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendientes}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Play className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.enProceso}</p>
              <p className="text-sm text-muted-foreground">En Proceso</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completadas}</p>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inspecciones}</p>
              <p className="text-sm text-muted-foreground">Por Inspeccionar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Progreso del día</span>
            <span className="text-primary font-bold">{progreso}%</span>
          </div>
          <Progress value={progreso} className="h-3" />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="EnProceso">En Proceso</SelectItem>
            <SelectItem value="Completada">Completada</SelectItem>
            <SelectItem value="Verificada">Verificada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="Urgente">Urgente</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="Baja">Baja</SelectItem>
          </SelectContent>
        </Select>

        <Select value="all" onValueChange={(v) => {
          if (v !== 'all') {
            setFilterEstado('all');
            setFilterPrioridad('all');
          }
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por empleado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sin_asignar">Sin asignar</SelectItem>
            {empleados.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={cargarDatos}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Task list */}
      {filteredTareas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hay tareas de limpieza</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTareas.map((tarea: any) => (
            <Card key={tarea.id} className={cn(
              "transition-all hover:shadow-md",
              tarea.prioridad === 'Urgente' && "border-destructive/50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted font-bold text-lg">
                      {getHabitacionNumero(tarea)}
                    </div>
                    <div>
                      <p className="font-medium">{tarea.tipo || tarea.tipo_limpieza || 'Limpieza'}</p>
                      <p className="text-sm text-muted-foreground">{getHabitacionTipo(tarea)}</p>
                    </div>
                  </div>
                  <Badge className={getPrioridadColor(tarea.prioridad)}>
                    {tarea.prioridad || 'Normal'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{tarea.asignado_nombre || tarea.asignadoNombre || 'Sin asignar'}</span>
                  {!tarea.asignado_nombre && !tarea.asignadoNombre && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setAsignarModal({ open: true, tarea });
                        setSelectedEmpleado('');
                      }}
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Asignar
                    </Button>
                  )}
                </div>

                {(tarea.notas || tarea.observaciones) && (
                  <p className="text-sm text-muted-foreground mb-3 bg-muted p-2 rounded">
                    {tarea.notas || tarea.observaciones}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  {(tarea.estado === 'Pendiente') && (
                    <Button size="sm" className="flex-1" onClick={() => handleCambiarEstado(tarea, 'EnProceso')}>
                      <Play className="mr-1 h-4 w-4" /> Iniciar
                    </Button>
                  )}
                  {(tarea.estado === 'EnProceso' || tarea.estado === 'En Proceso') && (
                    <Button size="sm" className="flex-1" onClick={() => handleCambiarEstado(tarea, 'Completada')}>
                      <Check className="mr-1 h-4 w-4" /> Completar
                    </Button>
                  )}
                  {tarea.estado === 'Completada' && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCambiarEstado(tarea, 'Verificada')}>
                      <Eye className="mr-1 h-4 w-4" /> Inspeccionar
                    </Button>
                  )}
                  {tarea.estado === 'Verificada' && (
                    <Badge className="bg-success flex-1 justify-center py-2">
                      <CheckCircle className="mr-1 h-4 w-4" /> Verificada
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={asignarModal.open} onOpenChange={(open) => setAsignarModal({ open, tarea: open ? asignarModal.tarea : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar tarea de limpieza</DialogTitle>
            <DialogDescription>Selecciona o crea un empleado para esta tarea</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Habitación {asignarModal.tarea ? getHabitacionNumero(asignarModal.tarea) : ''}</p>
              <p className="text-sm text-muted-foreground">{asignarModal.tarea?.tipo || 'Limpieza general'}</p>
            </div>
            <div className="space-y-2">
              <Label>Seleccionar empleado</Label>
              <ComboboxCreatable
                options={empleados.map(e => ({ value: e.id, label: `${e.nombre}${e.puesto ? ` (${e.puesto})` : ''}` }))}
                value={selectedEmpleado}
                onValueChange={setSelectedEmpleado}
                placeholder="Seleccionar empleado..."
                searchPlaceholder="Buscar empleado..."
              />
            </div>
            <Button className="w-full" onClick={handleAsignar} disabled={!selectedEmpleado}>
              Asignar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
