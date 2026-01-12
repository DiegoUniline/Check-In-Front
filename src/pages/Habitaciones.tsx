import { useState } from 'react';
import { 
  BedDouble, Grid3X3, List, Search, Filter, Plus, 
  MoreVertical, Sparkles, Wrench, DoorOpen, DoorClosed
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { mockHabitaciones, mockTiposHabitacion, Habitacion } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export default function Habitaciones() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPiso, setFilterPiso] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');

  const pisos = [...new Set(mockHabitaciones.map(h => h.piso))].sort();

  const filteredHabitaciones = mockHabitaciones.filter(h => {
    const matchSearch = h.numero.includes(searchQuery);
    const matchPiso = filterPiso === 'all' || h.piso.toString() === filterPiso;
    const matchTipo = filterTipo === 'all' || h.tipoId === filterTipo;
    const matchEstado = filterEstado === 'all' || h.estadoHabitacion === filterEstado;
    return matchSearch && matchPiso && matchTipo && matchEstado;
  });

  const getStatusColor = (hab: Habitacion) => {
    if (hab.estadoMantenimiento !== 'OK') return 'border-destructive bg-destructive/5';
    if (hab.estadoLimpieza !== 'Limpia') return 'border-info bg-info/5';
    switch (hab.estadoHabitacion) {
      case 'Disponible': return 'border-success bg-success/5';
      case 'Ocupada': return 'border-warning bg-warning/5';
      case 'Reservada': return 'border-primary bg-primary/5';
      case 'Bloqueada': return 'border-destructive bg-destructive/5';
      default: return 'border-muted';
    }
  };

  const getStatusBadge = (hab: Habitacion) => {
    if (hab.estadoMantenimiento !== 'OK') {
      return <Badge variant="destructive">Mantenimiento</Badge>;
    }
    if (hab.estadoLimpieza !== 'Limpia') {
      return <Badge className="bg-info">Limpieza</Badge>;
    }
    switch (hab.estadoHabitacion) {
      case 'Disponible': return <Badge className="bg-success">Disponible</Badge>;
      case 'Ocupada': return <Badge className="bg-warning text-warning-foreground">Ocupada</Badge>;
      case 'Reservada': return <Badge>Reservada</Badge>;
      case 'Bloqueada': return <Badge variant="destructive">Bloqueada</Badge>;
    }
  };

  const handleChangeStatus = (hab: Habitacion, newStatus: string) => {
    toast({
      title: 'Estado actualizado',
      description: `Habitación ${hab.numero} cambiada a ${newStatus}`,
    });
  };

  return (
    <MainLayout 
      title="Gestión de Habitaciones" 
      subtitle="Administración y estado de habitaciones"
    >
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por número..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={filterPiso} onValueChange={setFilterPiso}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Piso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los pisos</SelectItem>
              {pisos.map(p => (
                <SelectItem key={p} value={p.toString()}>Piso {p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {mockTiposHabitacion.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Disponible">Disponible</SelectItem>
              <SelectItem value="Ocupada">Ocupada</SelectItem>
              <SelectItem value="Reservada">Reservada</SelectItem>
              <SelectItem value="Bloqueada">Bloqueada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}>
            <ToggleGroupItem value="grid" aria-label="Vista grid">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Vista lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Habitación
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Disponibles', count: mockHabitaciones.filter(h => h.estadoHabitacion === 'Disponible' && h.estadoLimpieza === 'Limpia').length, color: 'text-success' },
          { label: 'Ocupadas', count: mockHabitaciones.filter(h => h.estadoHabitacion === 'Ocupada').length, color: 'text-warning' },
          { label: 'Reservadas', count: mockHabitaciones.filter(h => h.estadoHabitacion === 'Reservada').length, color: 'text-primary' },
          { label: 'Limpieza', count: mockHabitaciones.filter(h => h.estadoLimpieza !== 'Limpia').length, color: 'text-info' },
          { label: 'Mantenimiento', count: mockHabitaciones.filter(h => h.estadoMantenimiento !== 'OK').length, color: 'text-destructive' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.count}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredHabitaciones.map(hab => (
            <Card key={hab.id} className={cn("transition-all hover:shadow-md", getStatusColor(hab))}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-2xl font-bold">{hab.numero}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {hab.tipo.codigo}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Disponible')}>
                        <DoorOpen className="mr-2 h-4 w-4" /> Disponible
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Bloqueada')}>
                        <DoorClosed className="mr-2 h-4 w-4" /> Bloquear
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Limpieza')}>
                        <Sparkles className="mr-2 h-4 w-4" /> Enviar a limpieza
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeStatus(hab, 'Mantenimiento')}>
                        <Wrench className="mr-2 h-4 w-4" /> Reportar falla
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">{hab.tipo.nombre}</p>
                {getStatusBadge(hab)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Habitación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Limpieza</TableHead>
                <TableHead>Mantenimiento</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHabitaciones.map(hab => (
                <TableRow key={hab.id}>
                  <TableCell className="font-medium">{hab.numero}</TableCell>
                  <TableCell>{hab.tipo.nombre}</TableCell>
                  <TableCell>{hab.piso}</TableCell>
                  <TableCell>{getStatusBadge(hab)}</TableCell>
                  <TableCell>
                    <Badge variant={hab.estadoLimpieza === 'Limpia' ? 'secondary' : 'outline'}>
                      {hab.estadoLimpieza}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={hab.estadoMantenimiento === 'OK' ? 'secondary' : 'destructive'}>
                      {hab.estadoMantenimiento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Acciones
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                        <DropdownMenuItem>Cambiar estado</DropdownMenuItem>
                        <DropdownMenuItem>Historial</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {filteredHabitaciones.length} de {mockHabitaciones.length} habitaciones
      </p>
    </MainLayout>
  );
}