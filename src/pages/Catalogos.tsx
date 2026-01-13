import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BedDouble, Package, Tags } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
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
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function Catalogos() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('tipos-habitacion');
  
  // Tipos Habitación
  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [modalTipoOpen, setModalTipoOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<any>(null);
  const [deleteTipoDialog, setDeleteTipoDialog] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<any>(null);
  const [formTipo, setFormTipo] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    capacidad_adultos: '2',
    capacidad_ninos: '1',
    capacidad_maxima: '3',
    precio_base: '',
    precio_persona_extra: '0',
    amenidades: '',
  });

  // Categorías Productos
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [modalCatOpen, setModalCatOpen] = useState(false);
  const [formCat, setFormCat] = useState({ nombre: '', descripcion: '' });

  useEffect(() => {
    cargarTiposHabitacion();
    cargarCategorias();
  }, []);

  // ========== TIPOS HABITACIÓN ==========
  const cargarTiposHabitacion = async () => {
    try {
      const data = await api.getTiposHabitacion();
      setTiposHabitacion(data);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los tipos', variant: 'destructive' });
    } finally {
      setLoadingTipos(false);
    }
  };

  const openNewTipo = () => {
    setEditingTipo(null);
    setFormTipo({
      codigo: '',
      nombre: '',
      descripcion: '',
      capacidad_adultos: '2',
      capacidad_ninos: '1',
      capacidad_maxima: '3',
      precio_base: '',
      precio_persona_extra: '0',
      amenidades: '',
    });
    setModalTipoOpen(true);
  };

  const openEditTipo = (tipo: any) => {
    setEditingTipo(tipo);
    setFormTipo({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      capacidad_adultos: tipo.capacidad_adultos?.toString() || '2',
      capacidad_ninos: tipo.capacidad_ninos?.toString() || '1',
      capacidad_maxima: tipo.capacidad_maxima?.toString() || '3',
      precio_base: tipo.precio_base?.toString() || '',
      precio_persona_extra: tipo.precio_persona_extra?.toString() || '0',
      amenidades: Array.isArray(tipo.amenidades) ? tipo.amenidades.join(', ') : '',
    });
    setModalTipoOpen(true);
  };

  const handleSaveTipo = async () => {
    try {
      const data = {
        codigo: formTipo.codigo.toUpperCase(),
        nombre: formTipo.nombre,
        descripcion: formTipo.descripcion,
        capacidad_adultos: parseInt(formTipo.capacidad_adultos),
        capacidad_ninos: parseInt(formTipo.capacidad_ninos),
        capacidad_maxima: parseInt(formTipo.capacidad_maxima),
        precio_base: parseFloat(formTipo.precio_base),
        precio_persona_extra: parseFloat(formTipo.precio_persona_extra) || 0,
        amenidades: formTipo.amenidades.split(',').map(a => a.trim()).filter(a => a),
      };

      if (editingTipo) {
        await api.updateTipoHabitacion(editingTipo.id, data);
        toast({ title: 'Tipo actualizado', description: `${data.nombre} guardado correctamente` });
      } else {
        await api.createTipoHabitacion(data);
        toast({ title: 'Tipo creado', description: `${data.nombre} creado exitosamente` });
      }

      setModalTipoOpen(false);
      cargarTiposHabitacion();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo guardar', variant: 'destructive' });
    }
  };

  const confirmDeleteTipo = (tipo: any) => {
    setTipoToDelete(tipo);
    setDeleteTipoDialog(true);
  };

  const handleDeleteTipo = async () => {
    if (!tipoToDelete) return;
    try {
      await api.deleteTipoHabitacion(tipoToDelete.id);
      toast({ title: 'Tipo eliminado', description: `${tipoToDelete.nombre} eliminado` });
      setDeleteTipoDialog(false);
      setTipoToDelete(null);
      cargarTiposHabitacion();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  // ========== CATEGORÍAS PRODUCTOS ==========
  const cargarCategorias = async () => {
    try {
      const data = await api.getCategorias();
      setCategorias(data);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleSaveCategoria = async () => {
    try {
      await api.createCategoria(formCat);
      toast({ title: 'Categoría creada', description: `${formCat.nombre} creada exitosamente` });
      setModalCatOpen(false);
      setFormCat({ nombre: '', descripcion: '' });
      cargarCategorias();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo guardar', variant: 'destructive' });
    }
  };

  return (
    <MainLayout title="Catálogos" subtitle="Administración de catálogos del sistema">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="tipos-habitacion">
            <BedDouble className="h-4 w-4 mr-2" />
            Tipos de Habitación
          </TabsTrigger>
          <TabsTrigger value="categorias-productos">
            <Package className="h-4 w-4 mr-2" />
            Categorías Productos
          </TabsTrigger>
        </TabsList>

        {/* TAB: Tipos de Habitación */}
        <TabsContent value="tipos-habitacion">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tipos de Habitación</CardTitle>
              <Button onClick={openNewTipo}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTipos ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Capacidad</TableHead>
                      <TableHead>Precio Base</TableHead>
                      <TableHead>Precio Extra</TableHead>
                      <TableHead>Amenidades</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiposHabitacion.map(tipo => (
                      <TableRow key={tipo.id}>
                        <TableCell>
                          <Badge variant="outline">{tipo.codigo}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{tipo.nombre}</TableCell>
                        <TableCell>
                          {tipo.capacidad_adultos}A + {tipo.capacidad_ninos}N (máx {tipo.capacidad_maxima})
                        </TableCell>
                        <TableCell>${tipo.precio_base?.toLocaleString()}</TableCell>
                        <TableCell>${tipo.precio_persona_extra?.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(tipo.amenidades || []).slice(0, 3).map((a: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                            ))}
                            {(tipo.amenidades || []).length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{tipo.amenidades.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditTipo(tipo)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDeleteTipo(tipo)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tiposHabitacion.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No hay tipos de habitación registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Categorías Productos */}
        <TabsContent value="categorias-productos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categorías de Productos</CardTitle>
              <Button onClick={() => setModalCatOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCategorias ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorias.map(cat => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.nombre}</TableCell>
                        <TableCell>{cat.descripcion || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {categorias.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No hay categorías registradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Tipo Habitación */}
      <Dialog open={modalTipoOpen} onOpenChange={setModalTipoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTipo ? 'Editar Tipo de Habitación' : 'Nuevo Tipo de Habitación'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Código *</Label>
                <Input
                  value={formTipo.codigo}
                  onChange={(e) => setFormTipo({ ...formTipo, codigo: e.target.value.toUpperCase() })}
                  placeholder="Ej: STD, DLX, STE"
                  maxLength={5}
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre *</Label>
                <Input
                  value={formTipo.nombre}
                  onChange={(e) => setFormTipo({ ...formTipo, nombre: e.target.value })}
                  placeholder="Ej: Estándar, Deluxe, Suite"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                value={formTipo.descripcion}
                onChange={(e) => setFormTipo({ ...formTipo, descripcion: e.target.value })}
                placeholder="Descripción del tipo de habitación..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Capacidad Adultos</Label>
                <Input
                  type="number"
                  value={formTipo.capacidad_adultos}
                  onChange={(e) => setFormTipo({ ...formTipo, capacidad_adultos: e.target.value })}
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <Label>Capacidad Niños</Label>
                <Input
                  type="number"
                  value={formTipo.capacidad_ninos}
                  onChange={(e) => setFormTipo({ ...formTipo, capacidad_ninos: e.target.value })}
                  min="0"
                />
              </div>
              <div className="grid gap-2">
                <Label>Capacidad Máxima</Label>
                <Input
                  type="number"
                  value={formTipo.capacidad_maxima}
                  onChange={(e) => setFormTipo({ ...formTipo, capacidad_maxima: e.target.value })}
                  min="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Precio Base por Noche *</Label>
                <Input
                  type="number"
                  value={formTipo.precio_base}
                  onChange={(e) => setFormTipo({ ...formTipo, precio_base: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label>Precio Persona Extra</Label>
                <Input
                  type="number"
                  value={formTipo.precio_persona_extra}
                  onChange={(e) => setFormTipo({ ...formTipo, precio_persona_extra: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Amenidades (separadas por coma)</Label>
              <Textarea
                value={formTipo.amenidades}
                onChange={(e) => setFormTipo({ ...formTipo, amenidades: e.target.value })}
                placeholder="WiFi, TV, A/C, Minibar, Vista al mar, Jacuzzi..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalTipoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTipo}>{editingTipo ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Categoría */}
      <Dialog open={modalCatOpen} onOpenChange={setModalCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input
                value={formCat.nombre}
                onChange={(e) => setFormCat({ ...formCat, nombre: e.target.value })}
                placeholder="Ej: Bebidas, Snacks, Servicios"
              />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                value={formCat.descripcion}
                onChange={(e) => setFormCat({ ...formCat, descripcion: e.target.value })}
                placeholder="Descripción de la categoría..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCatOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategoria}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar tipo */}
      <AlertDialog open={deleteTipoDialog} onOpenChange={setDeleteTipoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de habitación?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{tipoToDelete?.nombre}"? Las habitaciones de este tipo quedarán sin categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTipo} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
