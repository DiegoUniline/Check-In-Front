import React, { useState, useMemo } from 'react';
import { 
  Plus, Package, Trash2, X, ChevronDown, ChevronRight, Hotel, Edit, User, Mail, Phone, UserPlus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AdminPlataforma() {
  const queryClient = useQueryClient();
  
  const [busqueda, setBusqueda] = useState('');
  const [modalCliente, setModalCliente] = useState(false);
  const [modalEditarCliente, setModalEditarCliente] = useState<{ open: boolean; cliente: any | null }>({ open: false, cliente: null });
  const [modalCrearUsuario, setModalCrearUsuario] = useState<{ open: boolean; cliente: any | null }>({ open: false, cliente: null });
  const [modalHotel, setModalHotel] = useState<{ open: boolean; cuenta_id: string | null }>({ open: false, cuenta_id: null });
  const [modalSuscripcion, setModalSuscripcion] = useState<{ open: boolean; hotel: any | null }>({ open: false, hotel: null });
  const [expandedCuenta, setExpandedCuenta] = useState<string | null>(null);
  
  const [formCliente, setFormCliente] = useState({ 
    razon_social: '', 
    nombre_administrador: '', 
    email_acceso: '', 
    telefono: '',
    password: ''
  });

  const [formEditarCliente, setFormEditarCliente] = useState({ 
    razon_social: '', 
    nombre_administrador: '', 
    email_acceso: '', 
    telefono: '',
    password: '',
    activo: true
  });

  const [formCrearUsuario, setFormCrearUsuario] = useState({
    nombre: '',
    email: '',
    password: ''
  });
  
  const [formHotel, setFormHotel] = useState({ 
    nombre: '', 
    ciudad: '', 
    telefono: ''
  });
  
  const [formSuscripcion, setFormSuscripcion] = useState({ 
    plan_id: '', 
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // --- QUERIES ---
  const { data: cuentas = [], isLoading: loadingCuentas } = useQuery({ 
    queryKey: ['saas-cuentas'], 
    queryFn: api.getCuentas 
  });

  const { data: hoteles = [] } = useQuery({ 
    queryKey: ['saas-hoteles'], 
    queryFn: api.getHotelesSaas
  });

  const { data: suscripciones = [] } = useQuery({ 
    queryKey: ['saas-suscripciones'], 
    queryFn: api.getSuscripcionesGlobales 
  });

  const { data: planes = [] } = useQuery({ 
    queryKey: ['saas-planes'], 
    queryFn: api.getPlanes 
  });

  // --- MUTACIONES ---
  const crearCliente = useMutation({
    mutationFn: async (data: typeof formCliente) => {
      // 1. Crear la cuenta
      const cuenta = await api.createCuenta({
        razon_social: data.razon_social,
        nombre_administrador: data.nombre_administrador,
        email_acceso: data.email_acceso,
        telefono: data.telefono
      });
      
      // 2. Crear el usuario admin de la cuenta (sin hotel)
      await api.createUsuario({
        nombre: data.nombre_administrador,
        email: data.email_acceso,
        password: data.password,
        rol: 'admin',
        cuenta_id: cuenta.id,
        hotel_id: null,
        activo: true
      });
      
      return cuenta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cliente y usuario administrador creados");
      setModalCliente(false);
      setFormCliente({ razon_social: '', nombre_administrador: '', email_acceso: '', telefono: '', password: '' });
    },
    onError: (e: any) => toast.error(e.message)
  });

  // Crear usuario para cuenta existente
  const crearUsuarioCuenta = useMutation({
    mutationFn: async (data: { cuenta_id: string; nombre: string; email: string; password: string }) => {
      return await api.createUsuario({
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        rol: 'admin',
        cuenta_id: data.cuenta_id,
        hotel_id: null,
        activo: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Usuario administrador creado correctamente");
      setModalCrearUsuario({ open: false, cliente: null });
      setFormCrearUsuario({ nombre: '', email: '', password: '' });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const editarCliente = useMutation({
    mutationFn: async (data: { id: string; form: typeof formEditarCliente }) => {
      await api.updateCuenta(data.id, {
        razon_social: data.form.razon_social,
        nombre_administrador: data.form.nombre_administrador,
        email_acceso: data.form.email_acceso,
        telefono: data.form.telefono,
        activo: data.form.activo
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cliente actualizado");
      setModalEditarCliente({ open: false, cliente: null });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const crearHotel = useMutation({
    mutationFn: (data: any) => api.createHotelSaas(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-hoteles'] });
      toast.success("Hotel creado");
      setModalHotel({ open: false, cuenta_id: null });
      setFormHotel({ nombre: '', ciudad: '', telefono: '' });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const crearSuscripcion = useMutation({
    mutationFn: (data: any) => api.createSuscripcion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción creada");
      setModalSuscripcion({ open: false, hotel: null });
      setFormSuscripcion({ 
        plan_id: '', 
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const extenderSuscripcion = useMutation({
    mutationFn: (id: string) => api.extenderSuscripcion(id, 30),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción extendida +30 días");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const eliminarCliente = useMutation({
    mutationFn: (id: string) => api.deleteCuenta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cliente eliminado");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const eliminarSuscripcion = useMutation({
    mutationFn: (id: string) => api.eliminarSuscripcion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción eliminada");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c: any) => 
      !busqueda || 
      c.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email_acceso?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [cuentas, busqueda]);

  const getHotelesCuenta = (cuenta_id: string) => hoteles.filter((h: any) => h.cuenta_id === cuenta_id);
  const getSuscripcionHotel = (hotel_id: string) => suscripciones.find((s: any) => s.hotel_id === hotel_id);

  const abrirEditarCliente = (cliente: any) => {
    setFormEditarCliente({
      razon_social: cliente.razon_social || '',
      nombre_administrador: cliente.nombre_administrador || '',
      email_acceso: cliente.email_acceso || '',
      telefono: cliente.telefono || '',
      password: '',
      activo: cliente.activo !== false
    });
    setModalEditarCliente({ open: true, cliente });
  };

  const abrirCrearUsuario = (cliente: any) => {
    setFormCrearUsuario({
      nombre: cliente.nombre_administrador || '',
      email: cliente.email_acceso || '',
      password: ''
    });
    setModalCrearUsuario({ open: true, cliente });
  };

  const RenderFilaCliente = ({ cliente }: { cliente: any }) => {
    const isExpanded = expandedCuenta === cliente.id;
    const hotelesCliente = getHotelesCuenta(cliente.id);

    return (
      <>
        <tr className={`border-b hover:bg-slate-50 cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
            onClick={() => setExpandedCuenta(isExpanded ? null : cliente.id)}>
          <td className="p-4">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown size={16} className="text-blue-600" /> : <ChevronRight size={16} />}
              <div>
                <span className="font-bold block">{cliente.razon_social}</span>
                <span className="text-xs text-slate-400">{cliente.nombre_administrador}</span>
              </div>
            </div>
          </td>
          <td className="p-4">
            <div className="flex items-center gap-1 text-slate-600 text-xs">
              <Mail className="w-3 h-3" />
              {cliente.email_acceso}
            </div>
            {cliente.telefono && (
              <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                <Phone className="w-3 h-3" />
                {cliente.telefono}
              </div>
            )}
          </td>
          <td className="p-4 text-center">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {hotelesCliente.length} Hoteles
            </span>
          </td>
          <td className="p-4 text-center">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${cliente.activo !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {cliente.activo !== false ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td className="p-4 text-right">
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-700" title="Crear Usuario Admin"
                onClick={(e) => { e.stopPropagation(); abrirCrearUsuario(cliente); }}>
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-600" title="Editar"
                onClick={(e) => { e.stopPropagation(); abrirEditarCliente(cliente); }}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" title="Eliminar"
                onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar cliente y todos sus datos?')) eliminarCliente.mutate(cliente.id); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan={5} className="bg-slate-50 p-6 border-b">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm">Hoteles de {cliente.razon_social}</h4>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setModalHotel({ open: true, cuenta_id: cliente.id }); }}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar Hotel
                </Button>
              </div>
              
              {hotelesCliente.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotelesCliente.map((hotel: any) => {
                    const suscripcion = getSuscripcionHotel(hotel.id);
                    return (
                      <div key={hotel.id} className="bg-white border rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-bold flex items-center gap-2">
                              <Hotel className="w-4 h-4" /> {hotel.nombre}
                            </h5>
                            <p className="text-xs text-slate-500">{hotel.ciudad}</p>
                          </div>
                        </div>
                        
                        {suscripcion ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Plan:</span>
                              <span className="font-bold">{suscripcion.plan_nombre}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Inicio:</span>
                              <span className="font-bold">{new Date(suscripcion.fecha_inicio).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Vence:</span>
                              <span className="font-bold">{new Date(suscripcion.fecha_fin).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Estado:</span>
                              <span className={`font-bold ${suscripcion.dias_restantes < 5 ? 'text-red-500' : 'text-green-500'}`}>
                                {suscripcion.dias_restantes > 0 ? `${suscripcion.dias_restantes} días` : 'Vencida'}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" className="flex-1 text-xs" onClick={() => extenderSuscripcion.mutate(suscripcion.id)}>
                                +30 días
                              </Button>
                              <Button size="sm" variant="destructive" className="text-xs" 
                                onClick={() => { if(confirm('¿Eliminar suscripción?')) eliminarSuscripcion.mutate(suscripcion.id); }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-3">
                            <p className="text-xs text-slate-400 mb-2">Sin suscripción</p>
                            <Button size="sm" variant="outline" className="w-full text-xs"
                              onClick={() => setModalSuscripcion({ open: true, hotel })}>
                              <Plus className="w-3 h-3 mr-1" /> Asignar Plan
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-4">Sin hoteles registrados</p>
              )}
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">SaaS Master Panel</h1>
          <p className="text-xs text-slate-400">Gestión de Clientes y Suscripciones</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Input placeholder="Buscar cliente..." className="bg-white" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <Button onClick={() => setModalCliente(true)}><Plus className="w-4 h-4 mr-2" /> Nuevo Cliente</Button>
        </div>
      </div>

      <Tabs defaultValue="cuentas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cuentas">Clientes</TabsTrigger>
          <TabsTrigger value="planes">Planes</TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas">
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white text-xs">
                <tr>
                  <th className="text-left p-4">Cliente / Administrador</th>
                  <th className="text-left p-4">Contacto</th>
                  <th className="text-center p-4">Hoteles</th>
                  <th className="text-center p-4">Estado</th>
                  <th className="text-right p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingCuentas ? (
                  <tr><td colSpan={5} className="p-20 text-center">Cargando...</td></tr>
                ) : cuentasFiltradas.length > 0 ? (
                  cuentasFiltradas.map((c: any) => <RenderFilaCliente key={c.id} cliente={c} />)
                ) : (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-400">No hay clientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="planes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.map((p: any) => (
              <div key={p.id} className="bg-white border p-6 rounded-xl">
                <Package className="text-blue-600 mb-4" />
                <h3 className="font-bold text-lg">{p.nombre}</h3>
                <p className="text-3xl font-black my-2">${p.costo_mensual}/mes</p>
                <div className="space-y-2 mt-4 text-xs text-slate-500">
                  <div className="flex justify-between"><span>Hoteles</span><span className="font-bold text-slate-900">{p.limite_hoteles}</span></div>
                  <div className="flex justify-between"><span>Habitaciones</span><span className="font-bold text-slate-900">{p.limite_habitaciones_por_hotel}</span></div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Nuevo Cliente */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="font-bold">Nuevo Cliente</h2>
              <button onClick={() => setModalCliente(false)}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" /> DATOS DE LA CUENTA
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Razón Social / Empresa *</label>
                    <Input 
                      value={formCliente.razon_social} 
                      onChange={e => setFormCliente({...formCliente, razon_social: e.target.value})} 
                      placeholder="Ej: Hoteles del Pacífico SA"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Teléfono</label>
                    <Input 
                      value={formCliente.telefono} 
                      onChange={e => setFormCliente({...formCliente, telefono: e.target.value})} 
                      placeholder="Ej: 33 1234 5678"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-green-600 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> ADMINISTRADOR DE LA CUENTA
                </h3>
                <p className="text-xs text-slate-400 mb-3">Este usuario podrá gestionar hoteles y crear usuarios</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Nombre completo *</label>
                    <Input 
                      value={formCliente.nombre_administrador} 
                      onChange={e => setFormCliente({...formCliente, nombre_administrador: e.target.value})} 
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Email de acceso *</label>
                    <Input 
                      type="email" 
                      value={formCliente.email_acceso} 
                      onChange={e => setFormCliente({...formCliente, email_acceso: e.target.value})} 
                      placeholder="Ej: admin@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Contraseña *</label>
                    <Input 
                      type="password" 
                      value={formCliente.password} 
                      onChange={e => setFormCliente({...formCliente, password: e.target.value})} 
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => crearCliente.mutate(formCliente)} 
                disabled={crearCliente.isPending || !formCliente.razon_social || !formCliente.nombre_administrador || !formCliente.email_acceso || !formCliente.password}
              >
                {crearCliente.isPending ? 'Creando...' : 'Crear Cliente y Administrador'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Usuario para Cuenta Existente */}
      {modalCrearUsuario.open && modalCrearUsuario.cliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold">Crear Usuario Admin</h2>
              <button onClick={() => setModalCrearUsuario({ open: false, cliente: null })}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-bold">Cuenta: {modalCrearUsuario.cliente.razon_social}</p>
                <p className="text-xs text-slate-500">Este usuario podrá entrar al sistema y gestionar esta cuenta</p>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500">Nombre completo *</label>
                <Input 
                  value={formCrearUsuario.nombre} 
                  onChange={e => setFormCrearUsuario({...formCrearUsuario, nombre: e.target.value})} 
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Email de acceso *</label>
                <Input 
                  type="email" 
                  value={formCrearUsuario.email} 
                  onChange={e => setFormCrearUsuario({...formCrearUsuario, email: e.target.value})} 
                  placeholder="Ej: admin@empresa.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Contraseña *</label>
                <Input 
                  type="password" 
                  value={formCrearUsuario.password} 
                  onChange={e => setFormCrearUsuario({...formCrearUsuario, password: e.target.value})} 
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={() => crearUsuarioCuenta.mutate({ 
                  cuenta_id: modalCrearUsuario.cliente.id,
                  nombre: formCrearUsuario.nombre,
                  email: formCrearUsuario.email,
                  password: formCrearUsuario.password
                })} 
                disabled={crearUsuarioCuenta.isPending || !formCrearUsuario.nombre || !formCrearUsuario.email || !formCrearUsuario.password}
              >
                {crearUsuarioCuenta.isPending ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cliente */}
      {modalEditarCliente.open && modalEditarCliente.cliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="font-bold">Editar Cliente</h2>
              <button onClick={() => setModalEditarCliente({ open: false, cliente: null })}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Razón Social / Empresa *</label>
                <Input 
                  value={formEditarCliente.razon_social} 
                  onChange={e => setFormEditarCliente({...formEditarCliente, razon_social: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Nombre Administrador *</label>
                <Input 
                  value={formEditarCliente.nombre_administrador} 
                  onChange={e => setFormEditarCliente({...formEditarCliente, nombre_administrador: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Email *</label>
                <Input 
                  type="email" 
                  value={formEditarCliente.email_acceso} 
                  onChange={e => setFormEditarCliente({...formEditarCliente, email_acceso: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Teléfono</label>
                <Input 
                  value={formEditarCliente.telefono} 
                  onChange={e => setFormEditarCliente({...formEditarCliente, telefono: e.target.value})} 
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="activo" 
                  checked={formEditarCliente.activo} 
                  onChange={e => setFormEditarCliente({...formEditarCliente, activo: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="activo" className="text-sm">Cliente activo</label>
              </div>

              <Button 
                className="w-full" 
                onClick={() => editarCliente.mutate({ id: modalEditarCliente.cliente.id, form: formEditarCliente })} 
                disabled={editarCliente.isPending || !formEditarCliente.razon_social || !formEditarCliente.email_acceso}
              >
                {editarCliente.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Hotel */}
      {modalHotel.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold">Nuevo Hotel</h2>
              <button onClick={() => setModalHotel({ open: false, cuenta_id: null })}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Nombre del Hotel *</label>
                <Input 
                  value={formHotel.nombre} 
                  onChange={e => setFormHotel({...formHotel, nombre: e.target.value})} 
                  placeholder="Ej: Hotel Paradise"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Ciudad</label>
                <Input 
                  value={formHotel.ciudad} 
                  onChange={e => setFormHotel({...formHotel, ciudad: e.target.value})} 
                  placeholder="Ej: Guadalajara"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Teléfono</label>
                <Input 
                  value={formHotel.telefono} 
                  onChange={e => setFormHotel({...formHotel, telefono: e.target.value})} 
                  placeholder="Ej: 33 1234 5678"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => crearHotel.mutate({ ...formHotel, cuenta_id: modalHotel.cuenta_id })} 
                disabled={crearHotel.isPending || !formHotel.nombre}
              >
                {crearHotel.isPending ? 'Creando...' : 'Crear Hotel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Suscripción */}
      {modalSuscripcion.open && modalSuscripcion.hotel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold">Asignar Plan a {modalSuscripcion.hotel.nombre}</h2>
              <button onClick={() => setModalSuscripcion({ open: false, hotel: null })}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Plan *</label>
                <Select value={formSuscripcion.plan_id} onValueChange={v => setFormSuscripcion({...formSuscripcion, plan_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                  <SelectContent>
                    {planes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre} - ${p.costo_mensual}/mes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Fecha Inicio *</label>
                <Input type="date" value={formSuscripcion.fecha_inicio} onChange={e => setFormSuscripcion({...formSuscripcion, fecha_inicio: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Fecha Fin *</label>
                <Input type="date" value={formSuscripcion.fecha_fin} onChange={e => setFormSuscripcion({...formSuscripcion, fecha_fin: e.target.value})} />
              </div>
              <Button className="w-full" disabled={crearSuscripcion.isPending || !formSuscripcion.plan_id}
                onClick={() => crearSuscripcion.mutate({ 
                  cuenta_id: modalSuscripcion.hotel.cuenta_id,
                  hotel_id: modalSuscripcion.hotel.id, 
                  plan_id: formSuscripcion.plan_id,
                  fecha_inicio: formSuscripcion.fecha_inicio,
                  fecha_fin: formSuscripcion.fecha_fin
                })}>
                {crearSuscripcion.isPending ? 'Guardando...' : 'Asignar Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
