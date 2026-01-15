import React, { useState, useMemo } from 'react';
import { 
  Plus, Package, Search, Trash2, X, ChevronDown, ChevronRight, Hotel, Calendar
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
  const [modalHotel, setModalHotel] = useState<{ open: boolean; cuenta_id: string | null }>({ open: false, cuenta_id: null });
  const [modalSuscripcion, setModalSuscripcion] = useState<{ open: boolean; hotel: any | null }>({ open: false, hotel: null });
  const [expandedCuenta, setExpandedCuenta] = useState<string | null>(null);
  const [formCliente, setFormCliente] = useState({ razon_social: '', email_acceso: '', password: '', nombre_administrador: '', telefono: '' });
  const [formHotel, setFormHotel] = useState({ nombre: '', ciudad: '', telefono: '' });
  const [formSuscripcion, setFormSuscripcion] = useState({ plan_id: '', dias: '30' });

  // --- QUERIES ---
  const { data: cuentas = [], isLoading: loadingCuentas } = useQuery({ 
    queryKey: ['saas-cuentas'], 
    queryFn: api.getCuentas 
  });

  const { data: hoteles = [] } = useQuery({ 
    queryKey: ['saas-hoteles'], 
    queryFn: () => api.request<any[]>('/saas/hoteles', 'GET')
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
    mutationFn: (data: typeof formCliente) => api.request('/saas/cuentas', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cliente creado");
      setModalCliente(false);
      setFormCliente({ razon_social: '', email_acceso: '', password: '', nombre_administrador: '', telefono: '' });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const crearHotel = useMutation({
    mutationFn: (data: any) => api.request('/saas/hoteles', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-hoteles'] });
      toast.success("Hotel creado");
      setModalHotel({ open: false, cuenta_id: null });
      setFormHotel({ nombre: '', ciudad: '', telefono: '' });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const crearSuscripcion = useMutation({
    mutationFn: (data: any) => api.request('/saas/suscripciones', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción creada");
      setModalSuscripcion({ open: false, hotel: null });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const extenderSuscripcion = useMutation({
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}/extender`, 'POST', { dias: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción extendida +30 días");
    }
  });

  const eliminarCliente = useMutation({
    mutationFn: (id: string) => api.request(`/saas/cuentas/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-cuentas'] });
      toast.success("Cliente eliminado");
    }
  });

  const eliminarSuscripcion = useMutation({
    mutationFn: (id: string) => api.request(`/saas/suscripciones/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-suscripciones'] });
      toast.success("Suscripción eliminada");
    }
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

  // --- COMPONENTE FILA CLIENTE ---
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
              <span className="font-bold">{cliente.razon_social}</span>
            </div>
          </td>
          <td className="p-4 text-slate-600 text-xs">{cliente.email_acceso}</td>
          <td className="p-4 text-center">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {hotelesCliente.length} Hoteles
            </span>
          </td>
          <td className="p-4 text-center">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${cliente.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {cliente.activo ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td className="p-4 text-right">
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar cliente?')) eliminarCliente.mutate(cliente.id); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
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
                              <span className="text-slate-500">Vence:</span>
                              <span className="font-bold">{new Date(suscripcion.fecha_fin).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Estado:</span>
                              <span className={`font-bold ${suscripcion.dias_restantes < 5 ? 'text-red-500' : 'text-green-500'}`}>
                                {suscripcion.dias_restantes} días
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
                  <th className="text-left p-4">Razón Social</th>
                  <th className="text-left p-4">Email</th>
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
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold">Nuevo Cliente</h2>
              <button onClick={() => setModalCliente(false)}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Razón Social *</label>
                <Input value={formCliente.razon_social} onChange={e => setFormCliente({...formCliente, razon_social: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Nombre Administrador</label>
                <Input value={formCliente.nombre_administrador} onChange={e => setFormCliente({...formCliente, nombre_administrador: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Email *</label>
                <Input value={formCliente.email_acceso} onChange={e => setFormCliente({...formCliente, email_acceso: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Teléfono</label>
                <Input value={formCliente.telefono} onChange={e => setFormCliente({...formCliente, telefono: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Contraseña *</label>
                <Input type="password" value={formCliente.password} onChange={e => setFormCliente({...formCliente, password: e.target.value})} />
              </div>
              <Button className="w-full" onClick={() => crearCliente.mutate(formCliente)} disabled={crearCliente.isPending}>
                {crearCliente.isPending ? 'Guardando...' : 'Crear Cliente'}
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
                <label className="text-xs font-bold text-slate-500">Nombre *</label>
                <Input value={formHotel.nombre} onChange={e => setFormHotel({...formHotel, nombre: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Ciudad</label>
                <Input value={formHotel.ciudad} onChange={e => setFormHotel({...formHotel, ciudad: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Teléfono</label>
                <Input value={formHotel.telefono} onChange={e => setFormHotel({...formHotel, telefono: e.target.value})} />
              </div>
              <Button className="w-full" onClick={() => crearHotel.mutate({ ...formHotel, cuenta_id: modalHotel.cuenta_id })} disabled={crearHotel.isPending}>
                {crearHotel.isPending ? 'Guardando...' : 'Crear Hotel'}
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
                <label className="text-xs font-bold text-slate-500">Días iniciales</label>
                <Input type="number" value={formSuscripcion.dias} onChange={e => setFormSuscripcion({...formSuscripcion, dias: e.target.value})} />
              </div>
              <Button className="w-full" disabled={crearSuscripcion.isPending || !formSuscripcion.plan_id}
                onClick={() => crearSuscripcion.mutate({ 
                  cuenta_id: modalSuscripcion.hotel.cuenta_id,
                  hotel_id: modalSuscripcion.hotel.id, 
                  plan_id: formSuscripcion.plan_id,
                  dias: parseInt(formSuscripcion.dias)
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
