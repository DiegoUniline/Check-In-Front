import { useState } from 'react';
import { 
  Users, Search, Plus, Star, Mail, Phone, 
  MoreVertical, Eye, Edit, History, Award
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { mockClientes, Cliente } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Clientes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredClientes = mockClientes.filter(c => {
    const fullName = `${c.nombre} ${c.apellidoPaterno} ${c.apellidoMaterno}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || 
           c.email.toLowerCase().includes(query) || 
           c.telefono.includes(query);
  });

  const getLoyaltyColor = (nivel: Cliente['nivelLealtad']) => {
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
    total: mockClientes.length,
    vip: mockClientes.filter(c => c.esVip).length,
    nuevos: mockClientes.filter(c => c.totalEstancias <= 1).length,
    frecuentes: mockClientes.filter(c => c.totalEstancias > 5).length,
  };

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
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-center">Estancias</TableHead>
              <TableHead>Última Visita</TableHead>
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
                        {cliente.nombre.charAt(0)}{cliente.apellidoPaterno.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {cliente.nombre} {cliente.apellidoPaterno}
                        {cliente.esVip && <Star className="h-4 w-4 text-warning fill-warning" />}
                      </p>
                      <p className="text-sm text-muted-foreground">{cliente.tipoCliente}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {cliente.email}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {cliente.telefono}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">{cliente.totalEstancias}</span>
                </TableCell>
                <TableCell>
                  {format(cliente.createdAt, 'd MMM yyyy', { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge className={getLoyaltyColor(cliente.nivelLealtad)}>
                    {cliente.nivelLealtad}
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
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {Math.min(20, filteredClientes.length)} de {filteredClientes.length} clientes
      </p>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {selectedCliente?.nombre.charAt(0)}{selectedCliente?.apellidoPaterno.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="flex items-center gap-2">
                  {selectedCliente?.nombre} {selectedCliente?.apellidoPaterno}
                  {selectedCliente?.esVip && <Star className="h-5 w-5 text-warning fill-warning" />}
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
                  <p className="font-medium">{selectedCliente?.telefono}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nacionalidad</Label>
                  <p className="font-medium">{selectedCliente?.nacionalidad}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Documento</Label>
                  <p className="font-medium">{selectedCliente?.tipoDocumento}: {selectedCliente?.numeroDocumento}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nivel de Lealtad</Label>
                  <Badge className={getLoyaltyColor(selectedCliente?.nivelLealtad || 'Bronce')}>
                    {selectedCliente?.nivelLealtad}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">{selectedCliente?.totalEstancias}</p>
                  <p className="text-sm text-muted-foreground">Estancias</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">$24,500</p>
                  <p className="text-sm text-muted-foreground">Total Gastado</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-primary">4.8</p>
                  <p className="text-sm text-muted-foreground">Rating</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="historial" className="mt-4">
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Suite Deluxe - 3 noches</p>
                        <p className="text-sm text-muted-foreground">Enero 2024</p>
                      </div>
                      <p className="font-medium text-primary">$7,500</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="preferencias" className="mt-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Piso alto</Badge>
                  <Badge variant="outline">Vista al mar</Badge>
                  <Badge variant="outline">Cama king</Badge>
                  <Badge variant="outline">Late checkout</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Notas: Prefiere habitaciones tranquilas, alergia a mariscos.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}