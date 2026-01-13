import { useState, useEffect } from 'react';
import { 
  UserPlus, Search, MoreVertical, Edit, Trash2, 
  RefreshCw, Shield, Mail, Phone, Eye, EyeOff
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const rolesConfig = [
  { id: 'admin', nombre: 'Administrador', color: 'bg-red-500', description: 'Acceso total al sistema' },
  { id: 'gerente', nombre: 'Gerente', color: 'bg-blue-500', description: 'Gestión operativa completa' },
  { id: 'recepcion', nombre: 'Recepción', color: 'bg-green-500', description: 'Check-in/out y reservas' },
  { id: 'limpieza', nombre: 'Limpieza', color: 'bg-yellow-500', description: 'Gestión de habitaciones' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', color: 'bg-orange-500', description: 'Tareas de mantenimiento' },
  { id: 'pos', nombre: 'POS/Ventas', color: 'bg-purple-500', description: 'Punto de venta' },
];

export default function Usuarios() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRol, setFilterRol] = useState('all');
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; usuario: any | null }>({ open: false, usuario: null });
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    rol: 'recepcion',
    activo: true,
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await api.getUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      // Datos mock para desarrollo
      setUsuarios([
        { id: '1', email: 'admin@hotel.com', nombre: 'Admin', apellidoPaterno: 'Sistema', rol: 'admin', activo: true },
        { id: '2', email: 'recepcion@hotel.com', nombre: 'María', apellidoPaterno: 'López', rol: 'recepcion', activo: true },
        { id: '3', email: 'limpieza@hotel.com', nombre: 'Juan', apellidoPaterno: 'García', rol: 'limpieza', activo: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsuarios = usuarios.filter(u => {
    const matchSearch = 
      u.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.apellidoPaterno?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRol = filterRol === 'all' || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const getRolInfo = (rolId: string) => {
    return rolesConfig.find(r => r.id === rolId) || { id: rolId, nombre: rolId, color: 'bg-gray-500', description: '' };
  };

  const openNewModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      telefono: '',
      rol: 'recepcion',
      activo: true,
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEditModal = (usuario: any) => {
    setEditingUser(usuario);
    setFormData({
      email: usuario.email || '',
      password: '', // No mostrar contraseña existente
      nombre: usuario.nombre || '',
      apellidoPaterno: usuario.apellidoPaterno || usuario.apellido_paterno || '',
      apellidoMaterno: usuario.apellidoMaterno || usuario.apellido_materno || '',
      telefono: usuario.telefono || '',
      rol: usuario.rol || 'recepcion',
      activo: usuario.activo !== false,
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.email || !formData.nombre || !formData.rol) {
      toast({ title: 'Error', description: 'Complete los campos obligatorios', variant: 'destructive' });
      return;
    }
    
    if (!editingUser && !formData.password) {
      toast({ title: 'Error', description: 'La contraseña es obligatoria para nuevos usuarios', variant: 'destructive' });
      return;
    }

    try {
      const data: any = {
        email: formData.email,
        nombre: formData.nombre,
        apellido_paterno: formData.apellidoPaterno,
        apellido_materno: formData.apellidoMaterno,
        telefono: formData.telefono,
        rol: formData.rol,
        activo: formData.activo,
      };
      
      // Solo enviar password si se ingresó uno
      if (formData.password) {
        data.password = formData.password;
      }

      if (editingUser) {
        await api.updateUsuario(editingUser.id, data);
        toast({ title: 'Usuario actualizado' });
      } else {
        await api.createUsuario(data);
        toast({ title: 'Usuario creado exitosamente' });
      }

      setModalOpen(false);
      cargarUsuarios();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.usuario) return;
    
    if (deleteDialog.usuario.id === currentUser?.id) {
      toast({ title: 'Error', description: 'No puedes eliminar tu propio usuario', variant: 'destructive' });
      setDeleteDialog({ open: false, usuario: null });
      return;
    }
    
    try {
      await api.deleteUsuario(deleteDialog.usuario.id);
      toast({ title: 'Usuario eliminado' });
      setDeleteDialog({ open: false, usuario: null });
      cargarUsuarios();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getInitials = (nombre: string, apellido?: string) => {
    const n = nombre?.charAt(0) || '';
    const a = apellido?.charAt(0) || '';
    return (n + a).toUpperCase() || '??';
  };

  if (loading) {
    return (
      <MainLayout title="Usuarios" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Gestión de Usuarios" 
      subtitle="Administra los usuarios del sistema"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Usuarios</p>
            <p className="text-2xl font-bold">{usuarios.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-bold text-green-600">{usuarios.filter(u => u.activo !== false).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Administradores</p>
            <p className="text-2xl font-bold text-red-600">{usuarios.filter(u => u.rol === 'admin').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Roles</p>
            <p className="text-2xl font-bold">{rolesConfig.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterRol} onValueChange={setFilterRol}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {rolesConfig.map(rol => (
                <SelectItem key={rol.id} value={rol.id}>{rol.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={cargarUsuarios}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={openNewModal}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Users table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsuarios.map(usuario => {
              const rol = getRolInfo(usuario.rol);
              return (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={usuario.fotoUrl || usuario.foto_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(usuario.nombre, usuario.apellidoPaterno || usuario.apellido_paterno)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {usuario.nombre} {usuario.apellidoPaterno || usuario.apellido_paterno}
                        </p>
                        {usuario.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">Tú</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {usuario.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {usuario.telefono ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {usuario.telefono}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-white", rol.color)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {rol.nombre}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={usuario.activo !== false ? "default" : "secondary"}>
                      {usuario.activo !== false ? 'Activo' : 'Inactivo'}
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
                        <DropdownMenuItem onClick={() => openEditModal(usuario)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={() => setDeleteDialog({ open: true, usuario })}
                          disabled={usuario.id === currentUser?.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredUsuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
      </p>

      {/* Modal Usuario */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Modifique la información del usuario' : 'Ingrese la información del nuevo usuario'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido Paterno</Label>
                <Input
                  value={formData.apellidoPaterno}
                  onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@hotel.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{editingUser ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••" : "Contraseña"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Teléfono"
                />
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={formData.rol} onValueChange={(v) => setFormData({ ...formData, rol: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesConfig.map(rol => (
                      <SelectItem key={rol.id} value={rol.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", rol.color)} />
                          {rol.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="activo">Usuario activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingUser ? 'Guardar' : 'Crear Usuario'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, usuario: open ? deleteDialog.usuario : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario 
              "{deleteDialog.usuario?.nombre} {deleteDialog.usuario?.apellidoPaterno || deleteDialog.usuario?.apellido_paterno}" 
              y su acceso al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
