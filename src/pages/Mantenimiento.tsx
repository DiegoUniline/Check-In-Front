import { useState, useEffect } from 'react';
import { 
  Wrench, Clock, CheckCircle, AlertTriangle, Plus,
  User, Calendar, ArrowRight, RefreshCw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';

export default function Mantenimiento() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [filterEstado, setFilterEstado] = useState('all');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  
  const [empleados, setEmpleados] = useState<any[]>([]);
  
  // Form state
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

  const filteredTickets = tickets.filter(t => 
    filterEstado === 'all' || t.estado === filterEstado
  );

  const stats = {
    abiertos: tickets.filter(t => t.estado === 'Abierto' || t.estado === 'Pendiente').length,
    enProceso: tickets.filter(t => t.estado === 'EnProceso' || t.estado === 'En Proceso').length,
    resueltos: tickets.filter(t => t.estado === 'Resuelto' || t.estado === 'Completado' || t.estado === 'Cerrado').length,
    criticos: tickets.filter(t => (t.prioridad === 'Crítica' || t.prioridad === 'Urgente') && t.estado !== 'Cerrado' && t.estado !== 'Completado').length,
  };

  const getPrioridadColor = (p?: string) => {
    switch (p) {
      case 'Crítica':
      case 'Urgente': return 'bg-destructive';
      case 'Alta': return 'bg-warning';
      case 'Normal': return 'bg-info';
      default: return 'bg-muted';
    }
  };

  const getEstadoColor = (e?: string) => {
    switch (e) {
      case 'Abierto':
      case 'Pendiente': return 'border-warning bg-warning/5';
      case 'EnProceso':
      case 'En Proceso': return 'border-info bg-info/5';
      case 'Resuelto':
      case 'Completado': return 'border-success bg-success/5';
      case 'Cerrado': return 'border-muted bg-muted/5';
      default: return '';
    }
  };

  const getHabitacionNumero = (ticket: any) => {
    if (ticket.habitacion?.numero) return ticket.habitacion.numero;
    return ticket.habitacion_numero || ticket.numero_habitacion || 'N/A';
  };

  const handleCreateTicket = async () => {
    if (!formData.habitacion_id || !formData.titulo || !formData.descripcion) {
      toast({ title: 'Error', description: 'Complete los campos requeridos (Habitación, Título y Descripción)', variant: 'destructive' });
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
      toast({
        title: 'Ticket creado',
        description: 'El ticket de mantenimiento ha sido registrado.',
      });
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
      toast({
        title: 'Estado actualizado',
        description: `Ticket actualizado a ${nuevoEstado}`,
      });
      cargarDatos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <MainLayout title="Mantenimiento" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Mantenimiento" 
      subtitle="Gestión de tickets y reparaciones"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-warning/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.abiertos}</p>
              <p className="text-sm text-muted-foreground">Abiertos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Wrench className="h-5 w-5 text-info" />
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
              <p className="text-2xl font-bold">{stats.resueltos}</p>
              <p className="text-sm text-muted-foreground">Resueltos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.criticos}</p>
              <p className="text-sm text-muted-foreground">Críticos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="EnProceso">En Proceso</SelectItem>
              <SelectItem value="Completado">Completado</SelectItem>
              <SelectItem value="Cerrado">Cerrado</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={cargarDatos}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Ticket de Mantenimiento</DialogTitle>
              <DialogDescription>Registra un nuevo problema de mantenimiento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Habitación *</Label>
                  <Select 
                    value={formData.habitacion_id} 
                    onValueChange={(v) => setFormData({...formData, habitacion_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {habitaciones.map(h => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.numero} - {h.tipo_nombre || h.tipo_codigo || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(v) => setFormData({...formData, categoria: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Plomería">Plomería</SelectItem>
                      <SelectItem value="Electricidad">Electricidad</SelectItem>
                      <SelectItem value="Mobiliario">Mobiliario</SelectItem>
                      <SelectItem value="HVAC">Aire/Calefacción</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título del ticket *</Label>
                <Input 
                  placeholder="Ej: Fuga de agua en baño"
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(v) => setFormData({...formData, prioridad: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baja">Baja</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Asignar a</Label>
                  <ComboboxCreatable
                    options={empleados.map(e => ({ value: e.id, label: `${e.nombre}${e.puesto ? ` (${e.puesto})` : ''}` }))}
                    value={formData.asignado_a}
                    onValueChange={(v) => setFormData({...formData, asignado_a: v})}
                    onCreate={async (nombre) => {
                      try {
                        const newEmp = await api.createEmpleado({ nombre, puesto: 'Mantenimiento' });
                        setEmpleados([...empleados, newEmp]);
                        toast({ title: 'Empleado creado' });
                        return { value: newEmp.id, label: newEmp.nombre };
                      } catch (e: any) {
                        toast({ title: 'Error', description: e.message, variant: 'destructive' });
                      }
                    }}
                    placeholder="Sin asignar"
                    searchPlaceholder="Buscar o crear empleado..."
                    createLabel="Crear empleado"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción del problema *</Label>
                <Textarea 
                  placeholder="Describe el problema detalladamente..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>
              <Button className="w-full" onClick={handleCreateTicket}>
                Crear Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tickets list */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hay tickets de mantenimiento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => (
            <Card key={ticket.id} className={getEstadoColor(ticket.estado)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted font-bold">
                      {getHabitacionNumero(ticket)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{ticket.numero_ticket || `TKT-${ticket.id?.slice(0, 6)}`}</span>
                        <Badge variant="outline">{ticket.categoria || 'General'}</Badge>
                        <Badge className={getPrioridadColor(ticket.prioridad)}>
                          {ticket.prioridad || 'Normal'}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{ticket.descripcion || 'Sin descripción'}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {(ticket.asignado_nombre || ticket.asignado) && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {ticket.asignado_nombre || ticket.asignado}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> 
                          {ticket.fecha_creacion || ticket.created_at 
                            ? format(new Date(ticket.fecha_creacion || ticket.created_at), 'd MMM yyyy', { locale: es })
                            : 'Sin fecha'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ticket.estado || 'Pendiente'}</Badge>
                    {(ticket.estado === 'Pendiente' || ticket.estado === 'Abierto') && (
                      <Button variant="outline" size="sm" onClick={() => handleCambiarEstado(ticket, 'EnProceso')}>
                        Iniciar
                      </Button>
                    )}
                    {(ticket.estado === 'EnProceso' || ticket.estado === 'En Proceso') && (
                      <Button variant="outline" size="sm" onClick={() => handleCambiarEstado(ticket, 'Completado')}>
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
