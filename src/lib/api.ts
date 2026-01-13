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

  // Habitaciones
  getHabitaciones = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/habitaciones${query}`);
  };
  getHabitacion = (id: string) => this.request<any>(`/habitaciones/${id}`);
  updateEstadoHabitacion = (id: string, data: any) => this.request<any>(`/habitaciones/${id}/estado`, { method: 'PATCH', body: data });

  // Clientes
  getClientes = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/clientes${query}`);
  };
  getCliente = (id: string) => this.request<any>(`/clientes/${id}`);
  createCliente = (data: any) => this.request<any>('/clientes', { method: 'POST', body: data });
  updateCliente = (id: string, data: any) => this.request<any>(`/clientes/${id}`, { method: 'PUT', body: data });

  // Reservas
  getReservas = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/reservas${query}`);
  };
  getReserva = (id: string) => this.request<any>(`/reservas/${id}`);
  createReserva = (data: any) => this.request<any>('/reservas', { method: 'POST', body: data });
  updateReserva = (id: string, data: any) => this.request<any>(`/reservas/${id}`, { method: 'PUT', body: data });
  checkin = (id: string, habitacionId?: string) => this.request<any>(`/reservas/${id}/checkin`, { method: 'POST', body: { habitacion_id: habitacionId } });
  checkout = (id: string) => this.request<any>(`/reservas/${id}/checkout`, { method: 'POST' });
  cancelarReserva = (id: string, motivo?: string) => this.request<any>(`/reservas/${id}/cancelar`, { method: 'POST', body: { motivo } });

  // Pagos
  getPagosReserva = (reservaId: string) => this.request<any[]>(`/pagos/reserva/${reservaId}`);
  createPago = (data: any) => this.request<any>('/pagos', { method: 'POST', body: data });

  // Tipos Habitación
  getTiposHabitacion = () => this.request<any[]>('/tipos-habitacion');

  // Limpieza
  getTareasLimpiezaHoy = () => this.request<any[]>('/limpieza/hoy');
  updateEstadoLimpieza = (id: string, estado: string) => this.request<any>(`/limpieza/${id}/estado`, { method: 'PATCH', body: { estado } });

  // Mantenimiento
  getTareasMantenimientoPendientes = () => this.request<any[]>('/mantenimiento/pendientes');
  updateEstadoMantenimiento = (id: string, estado: string) => this.request<any>(`/mantenimiento/${id}/estado`, { method: 'PATCH', body: { estado } });

  // Productos
  getProductos = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/productos${query}`);
  };
  createProducto = (data: any) => this.request<any>('/productos', { method: 'POST', body: data });
  cargoHabitacion = (data: any) => this.request<any>('/productos/cargo-habitacion', { method: 'POST', body: data });

  // Gastos
  getGastos = (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/gastos${query}`);
  };
  createGasto = (data: any) => this.request<any>('/gastos', { method: 'POST', body: data });

  // Hotel
  getHotel = () => this.request<any>('/hotel');
  updateHotel = (data: any) => this.request<any>('/hotel', { method: 'POST', body: data });
}

export const api = new ApiClient();
export default api;
