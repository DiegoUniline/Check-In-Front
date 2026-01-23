const API_URL = import.meta.env.VITE_API_URL || 'https://checkinapi-5cc3a2116a1c.herokuapp.com/api';

class ApiClient {
  private token: string | null = null;
  private hotelId: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('token');
    return this.token;
  }

  setHotelId(hotelId: string | null) {
    this.hotelId = hotelId;
    if (hotelId) localStorage.setItem('hotel_id', hotelId);
    else localStorage.removeItem('hotel_id');
  }

  getHotelId(): string | null {
    if (!this.hotelId) this.hotelId = localStorage.getItem('hotel_id');
    return this.hotelId;
  }

  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    const { method = 'GET', body } = options;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const hotelId = this.getHotelId();
    if (hotelId) headers['x-hotel-id'] = hotelId;
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(error.error || 'Error en la solicitud');
    }
    return response.json();
  }

  // Método público para componentes que necesitan llamadas directas
  publicRequest = async <T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const hotelId = this.getHotelId();
    if (hotelId) headers['x-hotel-id'] = hotelId;
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(error.error || 'Error en la solicitud');
    }
    return response.json();
  };

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: { email, password } });
    this.setToken(data.token);
    if (data.user?.hotel_id) this.setHotelId(data.user.hotel_id);
    return data;
  }
  logout() { 
    this.setToken(null); 
    this.setHotelId(null);
  }

  // Dashboard
  getDashboardStats = () => this.request<any>('/dashboard/stats');
  getDashboardCheckinsHoy = () => this.request<any[]>('/dashboard/checkins-hoy');
  getDashboardCheckoutsHoy = () => this.request<any[]>('/dashboard/checkouts-hoy');
  getDashboardVentasHoy = () => this.request<any>('/dashboard/ventas-hoy');
  getDashboardTareasCriticas = () => this.request<any>('/dashboard/tareas-criticas');
  getDashboardOcupacionTipo = () => this.request<any[]>('/dashboard/ocupacion-tipo');
  getDashboardIngresosMes = () => this.request<any>('/dashboard/ingresos-mes');

  // Habitaciones
  getHabitaciones = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/habitaciones${query}`);
  };
  getHabitacion = (id: string) => this.request<any>(`/habitaciones/${id}`);
  getHabitacionesDisponibles = (checkin: string, checkout: string, tipoId?: string) => {
    const params = new URLSearchParams({ checkin, checkout });
    if (tipoId) params.append('tipo_id', tipoId);
    return this.request<any[]>(`/habitaciones/disponibles?${params}`);
  };
  createHabitacion = (data: any) => this.request<any>('/habitaciones', { method: 'POST', body: data });
  updateHabitacion = (id: string, data: any) => this.request<any>(`/habitaciones/${id}`, { method: 'PUT', body: data });
  updateEstadoHabitacion = (id: string, data: any) => this.request<any>(`/habitaciones/${id}/estado`, { method: 'PATCH', body: data });
  deleteHabitacion = (id: string) => this.request<any>(`/habitaciones/${id}`, { method: 'DELETE' });

  // Tipos Habitación
  getTiposHabitacion = () => this.request<any[]>('/tipos-habitacion');
  createTipoHabitacion = (data: any) => this.request<any>('/tipos-habitacion', { method: 'POST', body: data });
  updateTipoHabitacion = (id: string, data: any) => this.request<any>(`/tipos-habitacion/${id}`, { method: 'PUT', body: data });
  deleteTipoHabitacion = (id: string) => this.request<any>(`/tipos-habitacion/${id}`, { method: 'DELETE' });

  // Clientes
  getClientes = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/clientes${query}`);
  };
  getCliente = (id: string) => this.request<any>(`/clientes/${id}`);
  getClienteReservas = (id: string) => this.request<any[]>(`/clientes/${id}/reservas`);
  createCliente = (data: any) => this.request<any>('/clientes', { method: 'POST', body: data });
  updateCliente = (id: string, data: any) => this.request<any>(`/clientes/${id}`, { method: 'PUT', body: data });
  deleteCliente = (id: string) => this.request<any>(`/clientes/${id}`, { method: 'DELETE' });

  // Reservas
  getReservas = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/reservas${query}`);
  };
  getReserva = (id: string) => this.request<any>(`/reservas/${id}`);
  getCheckinsHoy = () => this.request<any[]>('/reservas/checkins-hoy');
  getCheckoutsHoy = () => this.request<any[]>('/reservas/checkouts-hoy');
  createReserva = (data: any) => this.request<any>('/reservas', { method: 'POST', body: data });
  updateReserva = (id: string, data: any) => this.request<any>(`/reservas/${id}`, { method: 'PUT', body: data });
  checkin = (id: string, habitacionId?: string) => this.request<any>(`/reservas/${id}/checkin`, { method: 'POST', body: { habitacion_id: habitacionId } });
  checkout = (id: string) => this.request<any>(`/reservas/${id}/checkout`, { method: 'POST' });
  cancelarReserva = (id: string, motivo?: string) => this.request<any>(`/reservas/${id}/cancelar`, { method: 'POST', body: { motivo } });
  confirmarReserva = (id: string) => this.request<any>(`/reservas/${id}/confirmar`, { method: 'PATCH' });

  // Pagos
  getPagos = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/pagos${query}`);
  };
  getPagosReserva = (reservaId: string) => this.request<any[]>(`/pagos/reserva/${reservaId}`);
  createPago = (data: any) => this.request<any>('/pagos', { method: 'POST', body: data });
  deletePago = (id: string) => this.request<any>(`/pagos/${id}`, { method: 'DELETE' });

// Mi suscripción
getMiSuscripcion = () => this.request<any>(`/saas/mi-suscripcion/${this.getHotelId()}`);
  
  // Cargos
  getCargosReserva = (reservaId: string) => this.request<any[]>(`/cargos/reserva/${reservaId}`);
  createCargo = (data: any) => this.request<any>('/cargos', { method: 'POST', body: data });
  deleteCargo = (id: string) => this.request<any>(`/cargos/${id}`, { method: 'DELETE' });

  // Conceptos Cargo
  getConceptosCargo = () => this.request<any[]>('/conceptos-cargo');
  createConceptoCargo = (data: any) => this.request<any>('/conceptos-cargo', { method: 'POST', body: data });

  // Entregables
  getEntregables = () => this.request<any[]>('/entregables');
  createEntregable = (data: any) => this.request<any>('/entregables', { method: 'POST', body: data });
  updateEntregable = (id: string, data: any) => this.request<any>(`/entregables/${id}`, { method: 'PUT', body: data });
  deleteEntregable = (id: string) => this.request<any>(`/entregables/${id}`, { method: 'DELETE' });
  getEntregablesReserva = (reservaId: string) => this.request<any[]>(`/entregables/reserva/${reservaId}`);
  asignarEntregable = (reservaId: string, data: any) => this.request<any>(`/entregables/reserva/${reservaId}`, { method: 'POST', body: data });
  devolverEntregable = (id: string, data?: any) => this.request<any>(`/entregables/devolver/${id}`, { method: 'PATCH', body: data });

  // Limpieza
  getTareasLimpieza = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/limpieza${query}`);
  };
  getTareasLimpiezaHoy = () => this.request<any[]>('/limpieza/hoy');
  createTareaLimpieza = (data: any) => this.request<any>('/limpieza', { method: 'POST', body: data });
  updateEstadoLimpieza = (id: string, estado: string) => this.request<any>(`/limpieza/${id}/estado`, { method: 'PATCH', body: { estado } });
  asignarLimpieza = (id: string, asignadoA: string, asignadoNombre: string) => 
    this.request<any>(`/limpieza/${id}/asignar`, { method: 'PUT', body: { asignado_a: asignadoA, asignado_nombre: asignadoNombre } });
  deleteTareaLimpieza = (id: string) => this.request<any>(`/limpieza/${id}`, { method: 'DELETE' });

  // Mantenimiento
  getTareasMantenimiento = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/mantenimiento${query}`);
  };
  getTareasMantenimientoPendientes = () => this.request<any[]>('/mantenimiento/pendientes');
  createTareaMantenimiento = (data: any) => this.request<any>('/mantenimiento', { method: 'POST', body: data });
  updateTareaMantenimiento = (id: string, data: any) => this.request<any>(`/mantenimiento/${id}`, { method: 'PUT', body: data });
  updateEstadoMantenimiento = (id: string, estado: string, costoReal?: number) => 
    this.request<any>(`/mantenimiento/${id}/estado`, { method: 'PATCH', body: { estado, costo_real: costoReal } });
  deleteTareaMantenimiento = (id: string) => this.request<any>(`/mantenimiento/${id}`, { method: 'DELETE' });

  // Empleados
  getEmpleados = async (params?: Record<string, string>) => {
    /*
      Compatibilidad "empleados" -> "usuarios"
      - Relacionado con `Check-In-Front/src/pages/Mantenimiento.tsx` y `Check-In-Front/src/pages/Limpieza.tsx`.
      - Esos módulos muestran un selector "Asignar a" que espera una lista de empleados con { id, nombre, puesto }.
      - En el backend de este repo existe `/api/usuarios` (multi-hotel via `x-hotel-id`), pero no existe `/api/empleados`.
      - Para no romper la UX actual, adaptamos usuarios activos a la forma esperada por los combos.

      Nota:
      - Si a futuro se implementa una entidad `empleados` real en backend, este método puede volver a apuntar a `/empleados`.
    */
    const usuarios = await this.request<any[]>('/usuarios');
    const list = Array.isArray(usuarios) ? usuarios : [];

    // Adaptamos shape esperado por los módulos operativos.
    let empleados = list.map((u) => ({
      ...u,
      id: u.id,
      nombre: u.nombre,
      // "puesto" se usa solo para mostrar (ej: "Juan (Mantenimiento)")
      // y lo mapeamos desde `rol` cuando está disponible.
      puesto: u.puesto || u.rol || '',
    }));

    // Filtro opcional (por ejemplo `rol=Mantenimiento`) sin depender del backend.
    const filtroRol = params?.rol || params?.puesto;
    if (typeof filtroRol === 'string' && filtroRol.trim()) {
      const needle = filtroRol.trim().toLowerCase();
      empleados = empleados.filter((e) => String(e.puesto || '').toLowerCase() === needle);
    }

    return empleados;
  };

  // En este repo no existe CRUD de "empleados" como entidad persistente separada.
  // Si se intenta "crear empleado" desde los combos, mostramos un error claro para guiar al usuario.
  // Consumido por `ComboboxCreatable` en Limpieza/Mantenimiento.
  getEmpleado = async (_id: string) => {
    throw new Error('No existe endpoint /empleados en este backend. Use "Usuarios" para gestionar personal.');
  };
  createEmpleado = async (_data: any) => {
    throw new Error('Para crear personal, use el módulo "Usuarios" (Gestión de Usuarios).');
  };
  updateEmpleado = async (_id: string, _data: any) => {
    throw new Error('No existe endpoint /empleados en este backend. Use "Usuarios" para gestionar personal.');
  };
  deleteEmpleado = async (_id: string) => {
    throw new Error('No existe endpoint /empleados en este backend. Use "Usuarios" para gestionar personal.');
  };

  // Productos
  getCategorias = () => this.request<any[]>('/productos/categorias');
  createCategoria = (data: any) => this.request<any>('/productos/categorias', { method: 'POST', body: data });
  getProductos = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/productos${query}`);
  };
  getProducto = (id: string) => this.request<any>(`/productos/${id}`);
  createProducto = (data: any) => this.request<any>('/productos', { method: 'POST', body: data });
  updateProducto = (id: string, data: any) => this.request<any>(`/productos/${id}`, { method: 'PUT', body: data });
  deleteProducto = (id: string) => this.request<any>(`/productos/${id}`, { method: 'DELETE' });
  movimientoInventario = (id: string, data: any) => this.request<any>(`/productos/${id}/movimiento`, { method: 'POST', body: data });
  getMovimientosProducto = (id: string) => this.request<any[]>(`/productos/${id}/movimientos`);
  cargoHabitacion = (data: any) => this.request<any>('/cargos', { method: 'POST', body: data });
  getCargosHabitacion = (habitacionId: string) => this.request<any[]>(`/cargos/habitacion/${habitacionId}/reserva-activa`);

  // Gastos
  getGastos = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/gastos${query}`);
  };
  getGasto = (id: string) => this.request<any>(`/gastos/${id}`);
  getCategoriasGastos = () => this.request<string[]>('/gastos/categorias');
  getResumenGastos = (fechaDesde: string, fechaHasta: string) => 
    this.request<any>(`/gastos/resumen?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`);
  createGasto = (data: any) => this.request<any>('/gastos', { method: 'POST', body: data });
  updateGasto = (id: string, data: any) => this.request<any>(`/gastos/${id}`, { method: 'PUT', body: data });
  deleteGasto = (id: string) => this.request<any>(`/gastos/${id}`, { method: 'DELETE' });

  // Proveedores
  getProveedores = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/proveedores${query}`);
  };
  getProveedor = (id: string) => this.request<any>(`/proveedores/${id}`);
  createProveedor = (data: any) => this.request<any>('/proveedores', { method: 'POST', body: data });
  updateProveedor = (id: string, data: any) => this.request<any>(`/proveedores/${id}`, { method: 'PUT', body: data });
  deleteProveedor = (id: string) => this.request<any>(`/proveedores/${id}`, { method: 'DELETE' });

  // Compras
  getCompras = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/compras${query}`);
  };
  getCompra = (id: string) => this.request<any>(`/compras/${id}`);
  createCompra = (data: any) => this.request<any>('/compras', { method: 'POST', body: data });
  updateCompra = (id: string, data: any) => this.request<any>(`/compras/${id}`, { method: 'PUT', body: data });
  updateEstadoCompra = (id: string, estado: string) => this.request<any>(`/compras/${id}/estado`, { method: 'PATCH', body: { estado } });
  deleteCompra = (id: string) => this.request<any>(`/compras/${id}`, { method: 'DELETE' });

  // Ventas
  getVentas = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/ventas${query}`);
  };
  getVenta = (id: string) => this.request<any>(`/ventas/${id}`);
  createVenta = (data: any) => this.request<any>('/ventas', { method: 'POST', body: data });

  // Transacciones
  getTransacciones = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/transacciones${query}`);
  };
  getTransaccion = (id: string) => this.request<any>(`/transacciones/${id}`);

  // Hotel
  getHotel = () => this.request<any>('/hotel');
  updateHotel = (data: any) => this.request<any>('/hotel', { method: 'POST', body: data });
  
  // --- SECCIÓN SAAS (MASTER CONTROL) ---
  getCuentas = () => this.request<any[]>('/saas/cuentas');
  createCuenta = (data: any) => this.request<any>('/saas/cuentas', { method: 'POST', body: data });
  updateCuenta = (id: string, data: any) => this.request<any>(`/saas/cuentas/${id}`, { method: 'PUT', body: data });
  deleteCuenta = (id: string) => this.request<any>(`/saas/cuentas/${id}`, { method: 'DELETE' });

  getPlanes = () => this.request<any[]>('/saas/planes');
  createPlan = (data: any) => this.request<any>('/saas/planes', { method: 'POST', body: data });
  updatePlan = (id: string, data: any) => this.request<any>(`/saas/planes/${id}`, { method: 'PUT', body: data });

  getSuscripcionesGlobales = () => this.request<any[]>('/saas/suscripciones');
  createSuscripcion = (data: any) => this.request<any>('/saas/suscripciones', { method: 'POST', body: data });
  extenderSuscripcion = (id: string, dias: number = 30) => this.request<any>(`/saas/suscripciones/${id}/extender`, { method: 'POST', body: { dias } });
  eliminarSuscripcion = (id: string) => this.request<any>(`/saas/suscripciones/${id}`, { method: 'DELETE' });

  // SaaS Hoteles
  getHotelesSaas = () => this.request<any[]>('/saas/hoteles');
  createHotelSaas = (data: any) => this.request<any>('/saas/hoteles', { method: 'POST', body: data });

  registrarHotelFull = (data: any) => this.request<any>('/saas/registrar-hotel', { method: 'POST', body: data });
  asignarHotelACuenta = (data: { cuenta_id: string, hotel_id: string }) => 
    this.request<any>('/saas/asignar-hotel', { method: 'POST', body: data });

  // Usuarios
  getUsuarios = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/usuarios${query}`);
  };
  getUsuario = (id: string) => this.request<any>(`/usuarios/${id}`);
  createUsuario = (data: any) => this.request<any>('/usuarios', { method: 'POST', body: data });
  updateUsuario = (id: string, data: any) => this.request<any>(`/usuarios/${id}`, { method: 'PUT', body: data });
  deleteUsuario = (id: string) => this.request<any>(`/usuarios/${id}`, { method: 'DELETE' });
  getRoles = () => this.request<any[]>('/usuarios/roles');
}

export const api = new ApiClient();
export default api;
