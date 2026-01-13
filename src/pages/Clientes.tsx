import { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Star, Mail, Phone, 
  MoreVertical, Eye, Edit, History, Award
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Cliente {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  telefono: string;
  nacionalidad?: string;
  tipo_documento?: string;
  numero_documento?: string;
  tipo_cliente?: string;
  nivel_lealtad?: string;
  es_vip?: boolean;
  total_estancias?: number;
  notas?: string;
  created_at?: string;
}

export default function Clientes() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await api.getClientes();
      setClientes(data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los clientes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = clientes.filter(c => {
    const fullName = `${c.nombre} ${c.apellido_paterno} ${c.apellido_materno || ''}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || 
           c.email?.toLowerCase().includes(query) || 
           c.telefono?.includes(query);
  });

  const getLoyaltyColor = (nivel?: string) => {
    switch (nivel) {
      case 'Diamante': return 'bg-purple-500';
      case 'Platino': return 'bg-slate-400';
      case 'Oro': return 'bg-yellow-500';
      case 'Plata': return 'bg-gray-400';
      default: return 'bg-orange-700';
    }
  };

  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDetailOpen(true);
  };

  // Stats
  const stats = {
    total: clientes.length,
    vip: clientes.filter(c => c.es_vip).length,
    nuevos: clientes.filter(c => (c.total_estancias || 0) <= 1).length,
    frecuentes: clientes.filter(c => (c.total_estancias || 0) > 5).length,
  };

  if (loading) {
    return (
      <MainLayout title="Gestión de Clientes" subtitle="Base de datos de huéspedes y empresas">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Gestión de Clientes" 
      subtitle="Base de datos de huéspedes y empresas"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Clientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Star className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.vip}</p>
              <p className="text-sm text-muted-foreground">VIP</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.nuevos}</p>
              <p className="text-sm text-muted-foreground">Nuevos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Award className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.frecuentes}</p>
              <p className="text-sm text-muted-foreground">Frecuentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre, email o teléfono..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-center">Estancias</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Lealtad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.slice(0, 20).map(cliente => (
                <TableRow key={cliente.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {cliente.nombre?.charAt(0)}{cliente.apellido_paterno?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {cliente.nombre} {cliente.apellido_paterno}
                          {cliente.es_vip && <Star className="h-4 w-4 text-warning fill-warning" />}
                        </p>
                        <p className="text-sm text-muted-foreground">{cliente.tipo_cliente || 'Individual'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {cliente.email || '-'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {cliente.telefono || '-'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{cliente.total_estancias || 0}</span>
                  </TableCell>
                  <TableCell>
                    {cliente.created_at ? format(new Date(cliente.created_at), 'd MMM yyyy', { locale: es }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getLoyaltyColor(cliente.nivel_lealtad)}>
                      {cliente.nivel_lealtad || 'Bronce'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewCliente(cliente)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <History className="mr-2 h-4 w-4" /> Historial
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {Math.min(20, filteredClientes.length)} de {filteredClientes.length} clientes
      </p>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {selectedCliente?.nombre?.charAt(0)}{selectedCliente?.apellido_paterno?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="flex items-center gap-2">
                  {selectedCliente?.nombre} {selectedCliente?.apellido_paterno}
                  {selectedCliente?.es_vip && <Star className="h-5 w-5 text-warning fill-warning" />}
                </p>
                <p className="text-sm font-normal text-muted-foreground">{selectedCliente?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Teléfono</Label>
                  <p className="font-medium">{selectedCliente?.telefono || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nacionalidad</Label>
                  <p className="font-medium">{selectedCliente?.nacionalidad || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Documento</Label>
                  <p className="font-medium">{selectedCliente?.tipo_documento}: {selectedCliente?.numero_documento || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nivel de Lealtad</Label>
                  <Badge className={getLoyaltyColor(selectedCliente?.nivel_lealtad)}>
                    {selectedCliente?.nivel_lealtad || 'Bronce'}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">{selectedCliente?.total_estancias || 0}</p>
                  <p className="text-sm text-muted-foreground">Estancias</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">-</p>
                  <p className="text-sm text-muted-foreground">Total Gastado</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">-</p>
                  <p className="text-sm text-muted-foreground">Rating</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="historial" className="mt-4">
              <div className="text-center text-muted-foreground py-8">
                No hay historial disponible
              </div>
            </TabsContent>
            
            <TabsContent value="preferencias" className="mt-4">
              <div className="space-y-3">
                {selectedCliente?.notas ? (
                  <p className="text-sm text-muted-foreground">{selectedCliente.notas}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin preferencias registradas</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
