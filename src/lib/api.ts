const API_URL = import.meta.env.VITE_API_URL || 'https://checkinapi-5cc3a2116a1c.herokuapp.com/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getToken(): string | null {
    if (!this.token) this.token = localStorage.getItem('token');
    return this.token;
  }

  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    const { method = 'GET', body } = options;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

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

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: { email, password } });
    this.setToken(data.token);
    return data;
  }
  logout() { this.setToken(null); }

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
  getEmpleados = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/empleados${query}`);
  };
  getEmpleado = (id: string) => this.request<any>(`/empleados/${id}`);
  createEmpleado = (data: any) => this.request<any>('/empleados', { method: 'POST', body: data });
  updateEmpleado = (id: string, data: any) => this.request<any>(`/empleados/${id}`, { method: 'PUT', body: data });
  deleteEmpleado = (id: string) => this.request<any>(`/empleados/${id}`, { method: 'DELETE' });

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
  cargoHabitacion = (data: any) => this.request<any>('/productos/cargo-habitacion', { method: 'POST', body: data });

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

  // Ventas / Transacciones
  getVentas = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/ventas${query}`);
  };
  getVenta = (id: string) => this.request<any>(`/ventas/${id}`);
  createVenta = (data: any) => this.request<any>('/ventas', { method: 'POST', body: data });
  
  // Transacciones (Historial)
  getTransacciones = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/transacciones${query}`);
  };
  getTransaccion = (id: string) => this.request<any>(`/transacciones/${id}`);

  // Hotel
  getHotel = () => this.request<any>('/hotel');
  updateHotel = (data: any) => this.request<any>('/hotel', { method: 'POST', body: data });

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