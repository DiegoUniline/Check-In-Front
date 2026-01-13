import { useState } from 'react';
import { 
  Sparkles, Clock, CheckCircle, AlertTriangle, 
  User, Play, Check, Eye
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockTareasLimpieza, TareaLimpieza } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Limpieza() {
  const { toast } = useToast();
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterPrioridad, setFilterPrioridad] = useState('all');

  // Extended mock data for demo
  const allTareas: TareaLimpieza[] = [
    ...mockTareasLimpieza,
    ...mockTareasLimpieza.map((t, i) => ({
      ...t,
      id: `extra-${i}`,
      estado: ['Completada', 'Verificada'][i % 2] as TareaLimpieza['estado'],
    })),
  ];

  const filteredTareas = allTareas.filter(t => {
    const matchEstado = filterEstado === 'all' || t.estado === filterEstado;
    const matchPrioridad = filterPrioridad === 'all' || t.prioridad === filterPrioridad;
    return matchEstado && matchPrioridad;
  });

  // Stats
  const stats = {
    pendientes: allTareas.filter(t => t.estado === 'Pendiente').length,
    enProceso: allTareas.filter(t => t.estado === 'EnProceso').length,
    completadas: allTareas.filter(t => t.estado === 'Completada' || t.estado === 'Verificada').length,
    inspecciones: allTareas.filter(t => t.estado === 'Completada').length,
  };

  const totalTareas = stats.pendientes + stats.enProceso + stats.completadas;
  const progreso = Math.round((stats.completadas / totalTareas) * 100);

  const getPrioridadColor = (p?: string) => {
    switch (p) {
      case 'Urgente': return 'bg-destructive text-destructive-foreground';
      case 'Alta': return 'bg-warning text-warning-foreground';
      case 'Normal': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEstadoIcon = (e?: string) => {
    switch (e) {
      case 'Pendiente': return <Clock className="h-4 w-4" />;
      case 'EnProceso': return <Play className="h-4 w-4" />;
      case 'Completada': return <Check className="h-4 w-4" />;
      case 'Verificada': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getHabitacionNumero = (tarea: any) => {
    if (tarea.habitacion?.numero) return tarea.habitacion.numero;
    return tarea.habitacion_numero || 'N/A';
  };

  const getHabitacionTipo = (tarea: any) => {
    if (tarea.habitacion?.tipo?.nombre) return tarea.habitacion.tipo.nombre;
    return tarea.tipo_habitacion_nombre || tarea.habitacion_tipo || '';
  };

  const handleAction = (tarea: any, action: string) => {
    toast({
      title: `Tarea ${action}`,
      description: `Habitación ${getHabitacionNumero(tarea)} - ${action}`,
    });
  };

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
      </div>

      {/* Task list */}
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
                    <p className="font-medium">{tarea.tipo}</p>
                    <p className="text-sm text-muted-foreground">{getHabitacionTipo(tarea)}</p>
                  </div>
                </div>
                <Badge className={getPrioridadColor(tarea.prioridad)}>
                  {tarea.prioridad}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{tarea.asignadoNombre || 'Sin asignar'}</span>
              </div>

              {tarea.notas && (
                <p className="text-sm text-muted-foreground mb-3 bg-muted p-2 rounded">
                  {tarea.notas}
                </p>
              )}

              <div className="flex items-center gap-2">
                {tarea.estado === 'Pendiente' && (
                  <Button size="sm" className="flex-1" onClick={() => handleAction(tarea, 'iniciada')}>
                    <Play className="mr-1 h-4 w-4" /> Iniciar
                  </Button>
                )}
                {tarea.estado === 'EnProceso' && (
                  <Button size="sm" className="flex-1" onClick={() => handleAction(tarea, 'completada')}>
                    <Check className="mr-1 h-4 w-4" /> Completar
                  </Button>
                )}
                {tarea.estado === 'Completada' && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAction(tarea, 'verificada')}>
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
    </MainLayout>
  );
}