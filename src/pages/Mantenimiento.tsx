import { useState } from 'react';
import { 
  Wrench, Clock, CheckCircle, AlertTriangle, Plus,
  User, Calendar, ArrowRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { mockHabitaciones } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Ticket {
  id: string;
  habitacion: string;
  categoria: string;
  descripcion: string;
  prioridad: 'Baja' | 'Normal' | 'Alta' | 'Crítica';
  estado: 'Abierto' | 'EnProceso' | 'Resuelto' | 'Cerrado';
  asignado?: string;
  fechaCreacion: Date;
  fechaResolucion?: Date;
}

const mockTickets: Ticket[] = [
  { id: 'TKT-001', habitacion: '201', categoria: 'Plomería', descripcion: 'Fuga en el lavabo del baño', prioridad: 'Alta', estado: 'EnProceso', asignado: 'Juan Pérez', fechaCreacion: new Date() },
  { id: 'TKT-002', habitacion: '305', categoria: 'Electricidad', descripcion: 'Aire acondicionado no enfría', prioridad: 'Crítica', estado: 'Abierto', fechaCreacion: new Date() },
  { id: 'TKT-003', habitacion: '102', categoria: 'Mobiliario', descripcion: 'Puerta del closet no cierra bien', prioridad: 'Baja', estado: 'Resuelto', asignado: 'Carlos López', fechaCreacion: new Date(), fechaResolucion: new Date() },
  { id: 'TKT-004', habitacion: '410', categoria: 'Plomería', descripcion: 'Regadera con baja presión', prioridad: 'Normal', estado: 'Abierto', fechaCreacion: new Date() },
  { id: 'TKT-005', habitacion: '503', categoria: 'Electricidad', descripcion: 'TV no enciende', prioridad: 'Normal', estado: 'EnProceso', asignado: 'Juan Pérez', fechaCreacion: new Date() },
];

export default function Mantenimiento() {
  const { toast } = useToast();
  const [filterEstado, setFilterEstado] = useState('all');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const filteredTickets = mockTickets.filter(t => 
    filterEstado === 'all' || t.estado === filterEstado
  );

  const stats = {
    abiertos: mockTickets.filter(t => t.estado === 'Abierto').length,
    enProceso: mockTickets.filter(t => t.estado === 'EnProceso').length,
    resueltos: mockTickets.filter(t => t.estado === 'Resuelto' || t.estado === 'Cerrado').length,
    criticos: mockTickets.filter(t => t.prioridad === 'Crítica' && t.estado !== 'Cerrado').length,
  };

  const getPrioridadColor = (p: Ticket['prioridad']) => {
    switch (p) {
      case 'Crítica': return 'bg-destructive';
      case 'Alta': return 'bg-warning';
      case 'Normal': return 'bg-info';
      default: return 'bg-muted';
    }
  };

  const getEstadoColor = (e: Ticket['estado']) => {
    switch (e) {
      case 'Abierto': return 'border-warning bg-warning/5';
      case 'EnProceso': return 'border-info bg-info/5';
      case 'Resuelto': return 'border-success bg-success/5';
      case 'Cerrado': return 'border-muted bg-muted/5';
    }
  };

  const handleCreateTicket = () => {
    toast({
      title: 'Ticket creado',
      description: 'El ticket de mantenimiento ha sido registrado.',
    });
    setIsNewTicketOpen(false);
  };

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
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Abierto">Abierto</SelectItem>
            <SelectItem value="EnProceso">En Proceso</SelectItem>
            <SelectItem value="Resuelto">Resuelto</SelectItem>
            <SelectItem value="Cerrado">Cerrado</SelectItem>
          </SelectContent>
        </Select>

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
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Habitación</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockHabitaciones.slice(0, 10).map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.numero}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plomeria">Plomería</SelectItem>
                      <SelectItem value="electricidad">Electricidad</SelectItem>
                      <SelectItem value="mobiliario">Mobiliario</SelectItem>
                      <SelectItem value="hvac">Aire/Calefacción</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción del problema</Label>
                <Textarea placeholder="Describe el problema detalladamente..." />
              </div>
              <Button className="w-full" onClick={handleCreateTicket}>
                Crear Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tickets list */}
      <div className="space-y-4">
        {filteredTickets.map(ticket => (
          <Card key={ticket.id} className={getEstadoColor(ticket.estado)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted font-bold">
                    {ticket.habitacion}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{ticket.id}</span>
                      <Badge variant="outline">{ticket.categoria}</Badge>
                      <Badge className={getPrioridadColor(ticket.prioridad)}>
                        {ticket.prioridad}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{ticket.descripcion}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {ticket.asignado && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {ticket.asignado}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> 
                        {format(ticket.fechaCreacion, 'd MMM', { locale: es })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ticket.estado}</Badge>
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}