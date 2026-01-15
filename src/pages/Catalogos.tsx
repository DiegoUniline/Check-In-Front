import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BedDouble, Package, Tags, KeyRound } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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

  // Entregables
  const [entregables, setEntregables] = useState<any[]>([]);
  const [loadingEntregables, setLoadingEntregables] = useState(true);
  const [modalEntregableOpen, setModalEntregableOpen] = useState(false);
  const [editingEntregable, setEditingEntregable] = useState<any>(null);
  const [deleteEntregableDialog, setDeleteEntregableDialog] = useState(false);
  const [entregableToDelete, setEntregableToDelete] = useState<any>(null);
  const [formEntregable, setFormEntregable] = useState({
    nombre: '',
    descripcion: '',
    requiere_devolucion: true,
    costo_reposicion: '0',
    activo: true,
  });

  useEffect(() => {
    cargarTiposHabitacion();
    cargarCategorias();
    cargarEntregables();
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

  // ========== ENTREGABLES ==========
  const cargarEntregables = async () => {
    try {
      const data = await api.getEntregables?.() || [];
      setEntregables(data);
    } catch (error) {
      console.error('Error cargando entregables:', error);
    } finally {
      setLoadingEntregables(false);
    }
  };

  const openNewEntregable = () => {
    setEditingEntregable(null);
    setFormEntregable({
      nombre: '',
      descripcion: '',
      requiere_devolucion: true,
      costo_reposicion: '0',
      activo: true,
    });
    setModalEntregableOpen(true);
  };

  const openEditEntregable = (ent: any) => {
    setEditingEntregable(ent);
    setFormEntregable({
      nombre: ent.nombre || '',
      descripcion: ent.descripcion || '',
      requiere_devolucion: !!ent.requiere_devolucion,
      costo_reposicion: ent.costo_reposicion?.toString() || '0',
      activo: ent.activo !== false,
    });
    setModalEntregableOpen(true);
  };

  const handleSaveEntregable = async () => {
    if (!formEntregable.nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }

    try {
      const data = {
        nombre: formEntregable.nombre.trim(),
        descripcion: formEntregable.descripcion.trim(),
        requiere_devolucion: formEntregable.requiere_devolucion,
        costo_reposicion: parseFloat(formEntregable.costo_reposicion) || 0,
        activo: formEntregable.activo,
      };

      if (editingEntregable) {
        await api.updateEntregable?.(editingEntregable.id, data);
        toast({ title: 'Entregable actualizado', description: `${data.nombre} guardado correctamente` });
      } else {
        await api.createEntregable?.(data);
        toast({ title: 'Entregable creado', description: `${data.nombre} creado exitosamente` });
      }

      setModalEntregableOpen(false);
      cargarEntregables();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo guardar', variant: 'destructive' });
    }
  };

  const confirmDeleteEntregable = (ent: any) => {
    setEntregableToDelete(ent);
    setDeleteEntregableDialog(true);
  };

  const handleDeleteEntregable = async () => {
    if (!entregableToDelete) return;
    try {
      await api.deleteEntregable?.(entregableToDelete.id);
      toast({ title: 'Entregable eliminado', description: `${entregableToDelete.nombre} eliminado` });
      setDeleteEntregableDialog(false);
      setEntregableToDelete(null);
      cargarEntregables();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
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
          <TabsTrigger value="entregables">
            <KeyRound className="h-4 w-4 mr-2" />
            Entregables
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

        {/* TAB: Entregables */}
        <TabsContent value="entregables">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Entregables</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Items que se entregan al huésped durante su estancia (llaves, controles, toallas, etc.)
                </p>
              </div>
              <Button onClick={openNewEntregable}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Entregable
              </Button>
            </CardHeader>
            <CardContent>
              {loadingEntregables ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Requiere Devolución</TableHead>
                      <TableHead>Costo Reposición</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entregables.map(ent => (
                      <TableRow key={ent.id} className={!ent.activo ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{ent.nombre}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{ent.descripcion || '-'}</TableCell>
                        <TableCell>
                          {ent.requiere_devolucion ? (
                            <Badge variant="default" className="bg-amber-500">Sí devolver</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {ent.costo_reposicion > 0 ? (
                            <span className="font-medium">${ent.costo_reposicion.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ent.activo !== false ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">Activo</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditEntregable(ent)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDeleteEntregable(ent)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {entregables.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No hay entregables registrados
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

      {/* Modal Entregable */}
      <Dialog open={modalEntregableOpen} onOpenChange={setModalEntregableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntregable ? 'Editar Entregable' : 'Nuevo Entregable'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input
                value={formEntregable.nombre}
                onChange={(e) => setFormEntregable({ ...formEntregable, nombre: e.target.value })}
                placeholder="Ej: Llave habitación, Control remoto, Toalla"
              />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                value={formEntregable.descripcion}
                onChange={(e) => setFormEntregable({ ...formEntregable, descripcion: e.target.value })}
                placeholder="Descripción del entregable..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="text-base">Requiere Devolución</Label>
                <p className="text-sm text-muted-foreground">El huésped debe devolver este item al hacer check-out</p>
              </div>
              <Switch
                checked={formEntregable.requiere_devolucion}
                onCheckedChange={(checked) => setFormEntregable({ ...formEntregable, requiere_devolucion: checked })}
              />
            </div>
            {formEntregable.requiere_devolucion && (
              <div className="grid gap-2">
                <Label>Costo de Reposición</Label>
                <Input
                  type="number"
                  value={formEntregable.costo_reposicion}
                  onChange={(e) => setFormEntregable({ ...formEntregable, costo_reposicion: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">Se cobrará este monto si el huésped no devuelve el item</p>
              </div>
            )}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="text-base">Activo</Label>
                <p className="text-sm text-muted-foreground">Disponible para asignar a reservas</p>
              </div>
              <Switch
                checked={formEntregable.activo}
                onCheckedChange={(checked) => setFormEntregable({ ...formEntregable, activo: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEntregableOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEntregable}>{editingEntregable ? 'Guardar' : 'Crear'}</Button>
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

      {/* Confirmar eliminar entregable */}
      <AlertDialog open={deleteEntregableDialog} onOpenChange={setDeleteEntregableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entregable?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{entregableToDelete?.nombre}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntregable} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
