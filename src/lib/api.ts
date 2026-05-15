import { supabase } from '@/integrations/supabase/client';
import { registrarAuditoria } from '@/lib/auditoria';
import { crearNotificacion } from '@/lib/notificaciones';

const DEMO_HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';
const IVA_RATE = 0.16;

// Zona horaria del hotel activo (cacheada). Se actualiza al cargar el hotel.
let HOTEL_TZ: string = 'America/Mexico_City';
export const setHotelTimezone = (tz?: string | null) => {
  if (tz && typeof tz === 'string') HOTEL_TZ = tz;
};
export const getHotelTimezone = () => HOTEL_TZ;

// Fecha "hoy" YYYY-MM-DD en la zona horaria del hotel (no en UTC ni en la del navegador).
const todayLocal = (): string => {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: HOTEL_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return fmt.format(new Date()); // en-CA -> YYYY-MM-DD
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

class ApiClient {
  private hotelId: string | null = null;
  private _demoMode = false;

  get isDemoMode() { return this._demoMode; }
  setDemoMode(v: boolean) {
    this._demoMode = v;
    if (v) this.setHotelId(DEMO_HOTEL_ID);
  }

  setToken(_token: string | null) { /* legacy noop */ }
  getToken(): string | null { return null; }

  setHotelId(hotelId: string | null) {
    this.hotelId = hotelId;
    if (hotelId) localStorage.setItem('hotel_id', hotelId);
    else localStorage.removeItem('hotel_id');
  }

  getHotelId(): string | null {
    if (!this.hotelId) {
      const stored = localStorage.getItem('hotel_id');
      // Solo caer al hotel demo si estamos explícitamente en modo demo
      this.hotelId = stored || (this._demoMode ? DEMO_HOTEL_ID : null);
    }
    return this.hotelId;
  }

  // ------- Sanitización clientes (mantener compat) -------
  private sanitizeClientePayload(data: any) {
    if (!data || typeof data !== 'object') return data;
    const esVip = data.es_vip === true || data.es_vip === 1 || data.es_vip === '1';
    if (esVip) return data;
    const sanitize = (v: any) => {
      if (v === 0) return '';
      if (typeof v !== 'string') return v;
      return v.replace(/0[\s\u200B\uFEFF]*$/u, '').trim();
    };
    return {
      ...data,
      apellido_paterno: sanitize(data.apellido_paterno),
      apellido_materno: sanitize(data.apellido_materno),
    };
  }

  private sanitizeClienteResponse(c: any) {
    if (!c || typeof c !== 'object') return c;
    const esVip = c.es_vip === true || c.es_vip === 1 || c.es_vip === '1';
    if (esVip) return { ...c, es_vip: true };
    const sanitize = (v: any) => {
      if (v === 0) return '';
      if (typeof v !== 'string') return v;
      return v.replace(/0[\s\u200B\uFEFF]*$/u, '').trim();
    };
    return {
      ...c,
      es_vip: false,
      apellido_paterno: sanitize(c.apellido_paterno),
      apellido_materno: sanitize(c.apellido_materno),
    };
  }

  // ------- Auth -------
  async login(email: string, password: string) {
    // Demo login fijo
    if (email === 'admin@hotel.com' && password === 'Admin123!') {
      this.setDemoMode(true);
      const { data: hotel } = await supabase.from('hotels').select('nombre').eq('id', DEMO_HOTEL_ID).maybeSingle();
      return {
        token: 'demo-token',
        user: {
          id: 'demo-001',
          email,
          nombre: 'Admin Demo',
          apellidoPaterno: 'Hotel',
          rol: 'Admin',
          hotelNombre: hotel?.nombre || 'Hotel Vista Mar',
          hotel_id: DEMO_HOTEL_ID,
        },
      };
    }
    // Auth real con Supabase
    this.setDemoMode(false);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const { data: profile } = await supabase.from('profiles').select('*, hotels(nombre)').eq('id', data.user.id).maybeSingle();
    const hotelId = profile?.hotel_id || null;
    this.setHotelId(hotelId);
    return {
      token: data.session?.access_token || '',
      user: {
        id: data.user.id,
        email: data.user.email || email,
        nombre: profile?.nombre || email.split('@')[0],
        apellidoPaterno: profile?.apellido_paterno || '',
        rol: 'Admin',
        hotelNombre: (profile as any)?.hotels?.nombre || (data.user.user_metadata?.hotel_nombre as string) || 'Hotel',
        hotel_id: hotelId,
      },
    };
  }

  async logout() {
    await supabase.auth.signOut().catch(() => {});
    this.setHotelId(null);
    this._demoMode = false;
  }

  async signup(params: { email: string; password: string; nombre: string; apellido_paterno?: string; hotel_nombre: string }) {
    const { email, password, nombre, apellido_paterno, hotel_nombre } = params;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nombre, apellido_paterno: apellido_paterno || '', hotel_nombre },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      // Si no hay sesión (verificación pendiente), el caller debe redirigir a login
      return { needsConfirmation: true, user: null };
    }
    // Sesión activa: leer profile creado por el trigger
    const { data: profile } = await supabase.from('profiles').select('*, hotels(nombre)').eq('id', data.user!.id).maybeSingle();
    const hotelId = profile?.hotel_id || null;
    if (hotelId) this.setHotelId(hotelId);
    return {
      needsConfirmation: false,
      user: {
        id: data.user!.id,
        email: data.user!.email || email,
        nombre: profile?.nombre || nombre,
        apellidoPaterno: profile?.apellido_paterno || '',
        rol: 'Admin',
        hotelNombre: (profile as any)?.hotels?.nombre || hotel_nombre,
        hotel_id: hotelId,
      },
    };
  }

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  // ------- Helpers -------
  private hid() {
    const id = this.getHotelId();
    // Si no hay hotel_id real (usuario sin profile), devolvemos un UUID
    // imposible para que las queries no caigan al hotel demo accidentalmente.
    return id || '00000000-0000-0000-0000-000000000000';
  }

  // ------- Dashboard -------
  getDashboardStats = async (): Promise<any> => {
    const hotel_id = this.hid();
    const [habs, reservas] = await Promise.all([
      supabase.from('habitaciones').select('estado_habitacion').eq('hotel_id', hotel_id),
      supabase.from('reservas').select('total, estado, fecha_checkin').eq('hotel_id', hotel_id),
    ]);
    const habList = habs.data || [];
    const total = habList.length;
    const ocupadas = habList.filter((h: any) => h.estado_habitacion === 'Ocupada').length;
    const disponibles = habList.filter((h: any) => h.estado_habitacion === 'Disponible').length;
    const mantenimiento = habList.filter((h: any) => h.estado_habitacion === 'Mantenimiento').length;
    const today = todayLocal();
    const reservasHoy = (reservas.data || []).filter((r: any) => r.fecha_checkin === today).length;
    const ingresosHoy = (reservas.data || []).filter((r: any) => r.fecha_checkin === today).reduce((s: number, r: any) => s + Number(r.total || 0), 0);
    return {
      ocupacion: total ? Math.round((ocupadas / total) * 100) : 0,
      habitaciones_total: total,
      habitaciones_ocupadas: ocupadas,
      habitaciones_disponibles: disponibles,
      habitaciones_mantenimiento: mantenimiento,
      reservas_hoy: reservasHoy,
      ingresos_hoy: ingresosHoy,
    };
  };
  getDashboardCheckinsHoy = () => this.getCheckinsHoy();
  getDashboardCheckoutsHoy = () => this.getCheckoutsHoy();
  getDashboardVentasHoy = async (): Promise<any> => {
    const today = todayLocal();
    const { data } = await supabase.from('ventas').select('total').eq('hotel_id', this.hid()).gte('fecha', today);
    const total = (data || []).reduce((s: number, v: any) => s + Number(v.total || 0), 0);
    return { total, count: (data || []).length };
  };
  getDashboardTareasCriticas = async (): Promise<any> => {
    const { data } = await supabase.from('tareas_limpieza').select('*').eq('hotel_id', this.hid()).in('prioridad', ['Alta', 'Urgente']).neq('estado', 'Completada').limit(5);
    return data || [];
  };
  getDashboardOcupacionTipo = async (): Promise<any> => {
    const { data } = await supabase.from('habitaciones').select('estado_habitacion, tipos_habitacion(nombre)').eq('hotel_id', this.hid());
    const map: Record<string, { tipo: string; total: number; ocupadas: number }> = {};
    (data || []).forEach((h: any) => {
      const tipo = h.tipos_habitacion?.nombre || 'Sin tipo';
      if (!map[tipo]) map[tipo] = { tipo, total: 0, ocupadas: 0 };
      map[tipo].total++;
      if (h.estado_habitacion === 'Ocupada') map[tipo].ocupadas++;
    });
    return Object.values(map);
  };
  getDashboardIngresosMes = async (): Promise<any> => {
    const start = new Date(); start.setDate(1);
    const { data } = await supabase.from('reservas').select('total, fecha_checkin').eq('hotel_id', this.hid()).gte('fecha_checkin', start.toISOString().slice(0, 10));
    const total = (data || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);
    return { total, count: (data || []).length };
  };

  // ------- Habitaciones -------
  getHabitaciones = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('habitaciones').select('*, tipos_habitacion(*)').eq('hotel_id', this.hid()).order('numero');
    if (params?.estado_habitacion) q = q.eq('estado_habitacion', params.estado_habitacion);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((h: any) => ({
      ...h,
      tipo: h.tipos_habitacion?.nombre,
      tipo_nombre: h.tipos_habitacion?.nombre,
      tipo_codigo: h.tipos_habitacion?.codigo,
      precio_base: h.tipos_habitacion?.precio_base,
    }));
  };
  getHabitacion = async (id: string): Promise<any> => {
    const { data, error } = await supabase.from('habitaciones').select('*, tipos_habitacion(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  };
  getHabitacionesDisponibles = async (checkin: string, checkout: string, tipoId?: string): Promise<any> => {
    let q = supabase.from('habitaciones').select('*, tipos_habitacion(*)').eq('hotel_id', this.hid()).eq('estado_habitacion', 'Disponible');
    if (tipoId) q = q.eq('tipo_habitacion_id', tipoId);
    const { data: habs } = await q;
    const { data: ocupadas } = await supabase.from('reservas').select('habitacion_id').eq('hotel_id', this.hid()).in('estado', ['Confirmada', 'CheckIn']).lte('fecha_checkin', checkout).gte('fecha_checkout', checkin);
    const ocupadasIds = new Set((ocupadas || []).map((r: any) => r.habitacion_id));
    return (habs || []).filter((h: any) => !ocupadasIds.has(h.id));
  };
  createHabitacion = async (data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('habitaciones').insert({ ...data, hotel_id: this.hid() }).select().single();
    if (error) throw error; return r;
  };
  updateHabitacion = async (id: string, data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('habitaciones').update(data).eq('id', id).select().single();
    if (error) throw error; return r;
  };
  updateEstadoHabitacion = (id: string, data: any) => this.updateHabitacion(id, data);
  deleteHabitacion = async (id: string): Promise<any> => {
    const { error } = await supabase.from('habitaciones').delete().eq('id', id);
    if (error) throw error; return { ok: true };
  };

  // ------- Tipos Habitación -------
  getTiposHabitacion = async (): Promise<any> => {
    const { data, error } = await supabase.from('tipos_habitacion').select('*').eq('hotel_id', this.hid()).order('nombre');
    if (error) throw error; return data || [];
  };
  createTipoHabitacion = async (data: any): Promise<any> => {
    const codigo =
      data.codigo ||
      (data.nombre
        ? data.nombre
            .toString()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6) || `TH${Date.now().toString().slice(-5)}`
        : `TH${Date.now().toString().slice(-5)}`);
    const { data: r, error } = await supabase
      .from('tipos_habitacion')
      .insert({ ...data, codigo, hotel_id: this.hid() })
      .select()
      .single();
    if (error) throw error; return r;
  };
  updateTipoHabitacion = async (id: string, data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('tipos_habitacion').update(data).eq('id', id).select().single();
    if (error) throw error; return r;
  };
  deleteTipoHabitacion = async (id: string): Promise<any> => {
    const { error } = await supabase.from('tipos_habitacion').delete().eq('id', id);
    if (error) throw error; return { ok: true };
  };

  // ------- Clientes -------
  getClientes = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('clientes').select('*').eq('hotel_id', this.hid()).order('nombre');
    if (params?.search) q = q.ilike('nombre', `%${params.search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((c: any) => this.sanitizeClienteResponse(c));
  };
  getCliente = async (id: string): Promise<any> => {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return this.sanitizeClienteResponse(data);
  };
  getClienteReservas = async (id: string): Promise<any> => {
    const { data } = await supabase.from('reservas').select('*').eq('cliente_id', id).order('fecha_checkin', { ascending: false });
    return data || [];
  };
  createCliente = async (data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('clientes').insert({ ...this.sanitizeClientePayload(data), hotel_id: this.hid() }).select().single();
    if (error) throw error; return r;
  };
  updateCliente = async (id: string, data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('clientes').update(this.sanitizeClientePayload(data)).eq('id', id).select().single();
    if (error) throw error; return r;
  };
  deleteCliente = async (id: string): Promise<any> => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error; return { ok: true };
  };

  // ------- Reservas -------
  getReservas = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('reservas').select('*, clientes(*), habitaciones(numero, tipos_habitacion(nombre)), tipos_habitacion(nombre)').eq('hotel_id', this.hid()).order('fecha_checkin', { ascending: false });
    if (params?.estado) q = q.eq('estado', params.estado);
    // Excluir reservas online aún pendientes de aprobación
    q = q.or('origen.neq.Web,estado.neq.Pendiente');
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido_paterno || ''}`.trim() : '',
      habitacion_numero: r.habitaciones?.numero,
      tipo_habitacion_nombre: r.tipos_habitacion?.nombre || r.habitaciones?.tipos_habitacion?.nombre,
    }));
  };
  getReserva = async (id: string): Promise<any> => {
    const { data, error } = await supabase.from('reservas').select('*, clientes(*), habitaciones(*, tipos_habitacion(*)), tipos_habitacion(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      cliente_nombre: (data as any).clientes ? `${(data as any).clientes.nombre} ${(data as any).clientes.apellido_paterno || ''}`.trim() : '',
      habitacion_numero: (data as any).habitaciones?.numero,
    };
  };
  getCheckinsHoy = async (): Promise<any> => {
    const today = todayLocal();
    const { data } = await supabase.from('reservas').select('*, clientes(nombre, apellido_paterno), habitaciones(numero)').eq('hotel_id', this.hid()).eq('fecha_checkin', today).eq('checkin_realizado', false).or('origen.neq.Web,estado.neq.Pendiente');
    return (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido_paterno || ''}`.trim() : '',
      habitacion_numero: r.habitaciones?.numero,
    }));
  };
  getCheckoutsHoy = async (): Promise<any> => {
    const today = todayLocal();
    const { data } = await supabase.from('reservas').select('*, clientes(nombre, apellido_paterno), habitaciones(numero)').eq('hotel_id', this.hid()).eq('fecha_checkout', today).eq('checkin_realizado', true).eq('checkout_realizado', false).or('origen.neq.Web,estado.neq.Pendiente');
    return (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido_paterno || ''}`.trim() : '',
      habitacion_numero: r.habitaciones?.numero,
    }));
  };
  createReserva = async (data: any): Promise<any> => {
    const noches = data.noches || 1;
    const tarifa = Number(data.tarifa_noche || 0);
    const subtotal = noches * tarifa;
    const descuento = Number(data.descuento || 0);
    const base = subtotal - descuento;
    const impuestos = base * IVA_RATE;
    const total = base + impuestos;
    const payload = {
      ...data,
      hotel_id: this.hid(),
      subtotal_hospedaje: subtotal,
      total_impuestos: impuestos,
      total,
      saldo_pendiente: total,
      estado: data.estado || 'Confirmada',
    };
    const { data: r, error } = await supabase.from('reservas').insert(payload).select().single();
    if (error) throw error;
    void registrarAuditoria({
      accion: 'crear', entidad: 'reserva', entidad_id: r?.id,
      descripcion: `Reserva ${r?.numero_reserva || ''} (${r?.fecha_checkin} → ${r?.fecha_checkout})`,
      datos_despues: r,
    });
    if (r?.origen === 'Web') {
      void crearNotificacion({
        tipo: 'reserva_online',
        titulo: 'Nueva reserva online',
        mensaje: `Reserva ${r.numero_reserva || ''} pendiente de revisar`,
        url: '/reservas-online',
        metadata: { reserva_id: r.id },
      });
    }
    return r;
  };
  updateReserva = async (id: string, data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('reservas').update(data).eq('id', id).select().single();
    if (error) throw error; return r;
  };
  checkin = async (id: string, habitacionId?: string): Promise<any> => {
    const upd: any = { checkin_realizado: true, estado: 'CheckIn' };
    if (habitacionId) upd.habitacion_id = habitacionId;
    const { data: r, error } = await supabase.from('reservas').update(upd).eq('id', id).select().single();
    if (error) throw error;
    if (r?.habitacion_id) {
      await supabase.from('habitaciones').update({ estado_habitacion: 'Ocupada' }).eq('id', r.habitacion_id);
    }
    return r;
  };
  checkout = async (id: string): Promise<any> => {
    const { data: r, error } = await supabase.from('reservas').update({ checkout_realizado: true, estado: 'CheckOut' }).eq('id', id).select().single();
    if (error) throw error;
    if (r?.habitacion_id) {
      await supabase.from('habitaciones').update({ estado_habitacion: 'Disponible', estado_limpieza: 'Sucia' }).eq('id', r.habitacion_id);
    }
    return r;
  };
  cancelarReserva = async (id: string, motivo?: string): Promise<any> => {
    const { data: r, error } = await supabase.from('reservas').update({ estado: 'Cancelada', notas: motivo }).eq('id', id).select().single();
    if (error) throw error;
    void registrarAuditoria({
      accion: 'actualizar', entidad: 'reserva', entidad_id: id,
      descripcion: `Reserva cancelada${motivo ? ': ' + motivo : ''}`,
    });
    return r;
  };
  confirmarReserva = async (id: string): Promise<any> => {
    const { data: r, error } = await supabase.from('reservas').update({ estado: 'Confirmada' }).eq('id', id).select().single();
    if (error) throw error; return r;
  };

  // ------- Pagos -------
  getPagos = async (_params?: any): Promise<any> => { const { data } = await supabase.from('pagos').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false }); return data || []; };
  getPagosReserva = async (reservaId: string): Promise<any> => { const { data } = await supabase.from('pagos').select('*').eq('reserva_id', reservaId).order('fecha', { ascending: false }); return data || []; };
  createPago = async (data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('pagos').insert({ ...data, hotel_id: this.hid() }).select().single();
    if (error) throw error;
    if (r?.reserva_id) {
      const { data: pagos } = await supabase.from('pagos').select('monto').eq('reserva_id', r.reserva_id);
      const totalPagado = (pagos || []).reduce((s: number, p: any) => s + Number(p.monto || 0), 0);
      const { data: reserva } = await supabase.from('reservas').select('total').eq('id', r.reserva_id).maybeSingle();
      const total = Number(reserva?.total || 0);
      await supabase.from('reservas').update({ total_pagado: totalPagado, saldo_pendiente: Math.max(0, total - totalPagado) }).eq('id', r.reserva_id);
    }
    void crearNotificacion({
      tipo: 'pago',
      titulo: 'Pago registrado',
      mensaje: `${r?.metodo_pago || 'Pago'} por $${Number(r?.monto || 0).toLocaleString()}`,
      url: r?.reserva_id ? `/reservas` : undefined,
    });
    return r;
  };
  deletePago = async (id: string): Promise<any> => { const { error } = await supabase.from('pagos').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Cargos -------
  getCargosReserva = async (reservaId: string): Promise<any> => { const { data } = await supabase.from('cargos').select('*').eq('reserva_id', reservaId).order('fecha', { ascending: false }); return data || []; };
  createCargo = async (data: any): Promise<any> => {
    const total = Number(data.cantidad || 1) * Number(data.precio_unitario || 0);
    const { data: r, error } = await supabase.from('cargos').insert({ ...data, total, hotel_id: this.hid() }).select().single();
    if (error) throw error; return r;
  };
  deleteCargo = async (id: string): Promise<any> => { const { error } = await supabase.from('cargos').delete().eq('id', id); if (error) throw error; return { ok: true }; };
  cargoHabitacion = (data: any) => this.createCargo(data);
  getCargosHabitacion = async (habitacionId: string): Promise<any> => {
    const { data } = await supabase.from('cargos').select('*').eq('habitacion_id', habitacionId);
    return data || [];
  };

  // ------- Conceptos Cargo -------
  getConceptosCargo = async (): Promise<any> => { const { data } = await supabase.from('conceptos_cargo').select('*').eq('hotel_id', this.hid()).order('nombre'); return data || []; };
  createConceptoCargo = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('conceptos_cargo').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };

  // ------- Métodos de Pago -------
  getMetodosPago = async (params?: { soloActivos?: boolean }): Promise<any> => {
    let q = (supabase as any).from('metodos_pago').select('*').eq('hotel_id', this.hid()).order('orden').order('nombre');
    if (params?.soloActivos) q = q.eq('activo', true);
    const { data } = await q;
    return data || [];
  };
  createMetodoPago = async (data: any): Promise<any> => {
    const { data: r, error } = await (supabase as any).from('metodos_pago').insert({ ...data, hotel_id: this.hid() }).select().single();
    if (error) throw error; return r;
  };
  updateMetodoPago = async (id: string, data: any): Promise<any> => {
    const { data: r, error } = await (supabase as any).from('metodos_pago').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error; return r;
  };
  deleteMetodoPago = async (id: string): Promise<any> => {
    const { error } = await (supabase as any).from('metodos_pago').delete().eq('id', id);
    if (error) throw error; return { ok: true };
  };

  // ------- Checklist Items (Check-in / Check-out) -------
  getChecklistItems = async (params?: { tipo?: 'checkin' | 'checkout'; soloActivos?: boolean }): Promise<any[]> => {
    let q = (supabase as any).from('checklist_items').select('*').eq('hotel_id', this.hid()).order('orden').order('created_at');
    if (params?.tipo) q = q.eq('tipo', params.tipo);
    if (params?.soloActivos) q = q.eq('activo', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };
  createChecklistItem = async (data: any): Promise<any> => {
    const { data: r, error } = await (supabase as any).from('checklist_items').insert({ ...data, hotel_id: this.hid() }).select().single();
    if (error) throw error; return r;
  };
  updateChecklistItem = async (id: string, data: any): Promise<any> => {
    const { data: r, error } = await (supabase as any).from('checklist_items').update(data).eq('id', id).select().single();
    if (error) throw error; return r;
  };
  deleteChecklistItem = async (id: string): Promise<any> => {
    const { error } = await (supabase as any).from('checklist_items').delete().eq('id', id);
    if (error) throw error; return { ok: true };
  };

  // ------- Entregables -------
  getEntregables = async (): Promise<any> => { const { data } = await supabase.from('entregables').select('*').eq('hotel_id', this.hid()).order('nombre'); return data || []; };
  createEntregable = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('entregables').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  updateEntregable = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('entregables').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteEntregable = async (id: string): Promise<any> => { const { error } = await supabase.from('entregables').delete().eq('id', id); if (error) throw error; return { ok: true }; };
  getEntregablesReserva = async (reservaId: string): Promise<any> => { const { data } = await supabase.from('entregables_reserva').select('*, entregables(*)').eq('reserva_id', reservaId); return (data || []).map((e: any) => ({ ...e, nombre: e.entregables?.nombre, costo_reposicion: e.entregables?.costo_reposicion })); };
  asignarEntregable = async (reservaId: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('entregables_reserva').insert({ ...data, reserva_id: reservaId }).select().single(); if (error) throw error; return r; };
  devolverEntregable = async (id: string, data?: any): Promise<any> => { const { data: r, error } = await supabase.from('entregables_reserva').update({ devuelto: true, fecha_devolucion: new Date().toISOString(), ...(data || {}) }).eq('id', id).select().single(); if (error) throw error; return r; };

  // ------- Limpieza -------
  getTareasLimpieza = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('tareas_limpieza').select('*, habitaciones(numero)').eq('hotel_id', this.hid()).order('fecha', { ascending: false });
    if (params?.estado) q = q.eq('estado', params.estado);
    const { data } = await q;
    return (data || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero }));
  };
  getTareasLimpiezaHoy = async (): Promise<any> => {
    const today = todayLocal();
    const { data } = await supabase.from('tareas_limpieza').select('*, habitaciones(numero)').eq('hotel_id', this.hid()).eq('fecha', today);
    return (data || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero }));
  };
  createTareaLimpieza = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('tareas_limpieza').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  updateEstadoLimpieza = async (id: string, estado: string): Promise<any> => { const { data: r, error } = await supabase.from('tareas_limpieza').update({ estado }).eq('id', id).select().single(); if (error) throw error; return r; };
  asignarLimpieza = async (id: string, asignadoA: string, asignadoNombre: string): Promise<any> => { const { data: r, error } = await supabase.from('tareas_limpieza').update({ asignado_a: asignadoA, asignado_nombre: asignadoNombre }).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteTareaLimpieza = async (id: string): Promise<any> => { const { error } = await supabase.from('tareas_limpieza').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Mantenimiento -------
  getTareasMantenimiento = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('tareas_mantenimiento').select('*, habitaciones(numero)').eq('hotel_id', this.hid()).order('fecha_reporte', { ascending: false });
    if (params?.estado) q = q.eq('estado', params.estado);
    const { data } = await q;
    return (data || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero }));
  };
  getTareasMantenimientoPendientes = async (): Promise<any> => {
    const { data } = await supabase.from('tareas_mantenimiento').select('*, habitaciones(numero)').eq('hotel_id', this.hid()).neq('estado', 'Completada');
    return (data || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero }));
  };
  createTareaMantenimiento = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('tareas_mantenimiento').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  updateTareaMantenimiento = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('tareas_mantenimiento').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  updateEstadoMantenimiento = async (id: string, estado: string, costoReal?: number): Promise<any> => { const upd: any = { estado }; if (costoReal !== undefined) upd.costo_real = costoReal; const { data: r, error } = await supabase.from('tareas_mantenimiento').update(upd).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteTareaMantenimiento = async (id: string): Promise<any> => { const { error } = await supabase.from('tareas_mantenimiento').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Empleados (compat -> profiles) -------
  getEmpleados = async (params?: Record<string, string>): Promise<any> => {
    const { data } = await supabase.from('profiles').select('*').eq('hotel_id', this.hid());
    let list = (data || []).map((u: any) => ({ ...u, puesto: 'Personal' }));
    if (params?.rol || params?.puesto) {
      const needle = (params.rol || params.puesto).toLowerCase();
      list = list.filter((e) => String(e.puesto).toLowerCase() === needle);
    }
    return list;
  };
  getEmpleado = async (_id: string): Promise<any> => { throw new Error('Use el módulo "Usuarios".'); };
  createEmpleado = async (_data: any): Promise<any> => { throw new Error('Use el módulo "Usuarios".'); };
  updateEmpleado = async (_id: string, _data: any): Promise<any> => { throw new Error('Use el módulo "Usuarios".'); };
  deleteEmpleado = async (_id: string): Promise<any> => { throw new Error('Use el módulo "Usuarios".'); };

  // ------- Productos -------
  getCategorias = async (): Promise<any> => { const { data } = await supabase.from('categorias_producto').select('*').eq('hotel_id', this.hid()).order('nombre'); return data || []; };
  createCategoria = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('categorias_producto').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  getProductos = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('productos').select('*').eq('hotel_id', this.hid()).order('nombre');
    if (params?.categoria) q = q.eq('categoria', params.categoria);
    const { data } = await q;
    return data || [];
  };
  getProducto = async (id: string): Promise<any> => { const { data } = await supabase.from('productos').select('*').eq('id', id).maybeSingle(); return data; };
  createProducto = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('productos').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  updateProducto = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('productos').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteProducto = async (id: string): Promise<any> => { const { error } = await supabase.from('productos').delete().eq('id', id); if (error) throw error; return { ok: true }; };
  movimientoInventario = async (id: string, data: any): Promise<any> => {
    const { data: prod } = await supabase.from('productos').select('stock_actual').eq('id', id).maybeSingle();
    const stockAnterior = Number(prod?.stock_actual || 0);
    const cantidad = Number(data.cantidad || 0);
    const stockNuevo = data.tipo === 'Salida' ? stockAnterior - cantidad : stockAnterior + cantidad;
    await supabase.from('productos').update({ stock_actual: stockNuevo }).eq('id', id);
    const { data: m, error } = await supabase.from('movimientos_inventario').insert({ producto_id: id, ...data, stock_anterior: stockAnterior, stock_nuevo: stockNuevo }).select().single();
    if (error) throw error; return m;
  };
  getMovimientosProducto = async (id: string): Promise<any> => { const { data } = await supabase.from('movimientos_inventario').select('*').eq('producto_id', id).order('created_at', { ascending: false }); return data || []; };

  // ------- Gastos -------
  getGastos = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('gastos').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false });
    if (params?.categoria) q = q.eq('categoria', params.categoria);
    const { data } = await q;
    return data || [];
  };
  getGasto = async (id: string): Promise<any> => { const { data } = await supabase.from('gastos').select('*').eq('id', id).maybeSingle(); return data; };
  getCategoriasGastos = async (): Promise<any> => ['Servicios', 'Suministros', 'Mantenimiento', 'Salarios', 'Marketing', 'Otros'];
  getResumenGastos = async (fechaDesde: string, fechaHasta: string): Promise<any> => {
    const { data } = await supabase.from('gastos').select('monto, categoria').eq('hotel_id', this.hid()).gte('fecha', fechaDesde).lte('fecha', fechaHasta);
    const total = (data || []).reduce((s: number, g: any) => s + Number(g.monto || 0), 0);
    const porCategoria: Record<string, number> = {};
    (data || []).forEach((g: any) => { porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.monto || 0); });
    return { total, por_categoria: porCategoria };
  };
  createGasto = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('gastos').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  updateGasto = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('gastos').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteGasto = async (id: string): Promise<any> => { const { error } = await supabase.from('gastos').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Proveedores -------
  getProveedores = async (_params?: any): Promise<any> => { const { data } = await supabase.from('proveedores').select('*').eq('hotel_id', this.hid()).order('nombre'); return data || []; };
  getProveedor = async (id: string): Promise<any> => { const { data } = await supabase.from('proveedores').select('*').eq('id', id).maybeSingle(); return data; };
  createProveedor = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('proveedores').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  updateProveedor = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('proveedores').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteProveedor = async (id: string): Promise<any> => { const { error } = await supabase.from('proveedores').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Compras -------
  getCompras = async (_params?: any): Promise<any> => { const { data } = await supabase.from('compras').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false }); return data || []; };
  getCompra = async (id: string): Promise<any> => { const { data } = await supabase.from('compras').select('*, compras_detalle(*)').eq('id', id).maybeSingle(); return data; };
  createCompra = async (data: any): Promise<any> => { const { detalles, ...header } = data; const { data: r, error } = await supabase.from('compras').insert({ ...header, hotel_id: this.hid() }).select().single(); if (error) throw error; if (Array.isArray(detalles) && detalles.length) { await supabase.from('compras_detalle').insert(detalles.map((d: any) => ({ ...d, compra_id: r.id }))); } return r; };
  updateCompra = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('compras').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  updateEstadoCompra = async (id: string, estado: string): Promise<any> => { const { data: r, error } = await supabase.from('compras').update({ estado }).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteCompra = async (id: string): Promise<any> => { const { error } = await supabase.from('compras').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Ventas -------
  getVentas = async (_params?: any): Promise<any> => { const { data } = await supabase.from('ventas').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false }); return data || []; };
  getVenta = async (id: string): Promise<any> => { const { data } = await supabase.from('ventas').select('*, ventas_detalle(*)').eq('id', id).maybeSingle(); return data; };
  createVenta = async (data: any): Promise<any> => {
    const { detalles, ...header } = data;
    const { data: r, error } = await supabase.from('ventas').insert({ ...header, hotel_id: this.hid() }).select().single();
    if (error) throw error;
    if (Array.isArray(detalles) && detalles.length) {
      await supabase.from('ventas_detalle').insert(detalles.map((d: any) => ({ ...d, venta_id: r.id })));
    }
    return r;
  };

  // ------- Transacciones -------
  getTransacciones = async (_params?: any): Promise<any> => { const { data } = await supabase.from('transacciones').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false }); return data || []; };
  getTransaccion = async (id: string): Promise<any> => { const { data } = await supabase.from('transacciones').select('*').eq('id', id).maybeSingle(); return data; };

  // ------- Hotel -------
  getHotel = async (): Promise<any> => {
    const { data } = await supabase.from('hotels').select('*').eq('id', this.hid()).maybeSingle();
    if ((data as any)?.timezone) setHotelTimezone((data as any).timezone);
    return data;
  };
  updateHotel = async (data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('hotels').update(data).eq('id', this.hid()).select().single();
    if (error) throw error;
    if ((r as any)?.timezone) setHotelTimezone((r as any).timezone);
    return r;
  };

  // ------- SAAS -------
  getCuentas = async (): Promise<any> => {
    const { data: hotels } = await supabase.from('hotels').select('*').order('created_at', { ascending: false });
    const { data: profiles } = await supabase.from('profiles').select('*');
    return (hotels || []).map((h: any) => {
      const admin: any = (profiles || []).find((p: any) => p.hotel_id === h.id) || {};
      return {
        id: h.id,
        razon_social: h.razon_social || h.nombre,
        nombre_administrador: [admin.nombre, admin.apellido_paterno].filter(Boolean).join(' ') || '—',
        email_acceso: admin.email || h.email || '—',
        telefono: admin.telefono || h.telefono || '',
        activo: true,
        created_at: h.created_at,
      };
    });
  };
  createCuenta = async (_data: any): Promise<any> => ({});
  updateCuenta = async (_id: string, _data: any): Promise<any> => ({});
  deleteCuenta = async (_id: string): Promise<any> => ({});
  getPlanes = async (): Promise<any> => {
    const { data } = await supabase.from('planes' as any).select('*').order('orden', { ascending: true });
    return data || [];
  };
  createPlan = async (data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('planes' as any).insert(data).select().single();
    if (error) throw error; return r;
  };
  updatePlan = async (id: string, data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('planes' as any).update(data).eq('id', id).select().single();
    if (error) throw error; return r;
  };
  deletePlan = async (id: string): Promise<any> => {
    const { error } = await supabase.from('planes' as any).delete().eq('id', id);
    if (error) throw error; return {};
  };
  getSuscripcionesGlobales = async (): Promise<any> => {
    const [{ data: subs }, { data: planes }] = await Promise.all([
      supabase.from('suscripciones' as any).select('*'),
      supabase.from('planes' as any).select('id,nombre'),
    ]);
    const today = new Date();
    return ((subs as any[]) || []).map((s: any) => {
      const plan = ((planes as any[]) || []).find((p: any) => p.id === s.plan_id);
      const fin = new Date(s.fecha_fin);
      const dias = Math.ceil((fin.getTime() - today.getTime()) / 86400000);
      return { ...s, plan_nombre: plan?.nombre || '—', dias_restantes: dias };
    });
  };
  createSuscripcion = async (data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('suscripciones' as any).insert({
      hotel_id: data.hotel_id, plan_id: data.plan_id,
      fecha_inicio: data.fecha_inicio, fecha_fin: data.fecha_fin,
    }).select().single();
    if (error) throw error; return r;
  };
  extenderSuscripcion = async (id: string, dias = 30): Promise<any> => {
    const { data: cur } = await supabase.from('suscripciones' as any).select('fecha_fin').eq('id', id).maybeSingle();
    const base = cur ? new Date((cur as any).fecha_fin) : new Date();
    base.setDate(base.getDate() + dias);
    const { error } = await supabase.from('suscripciones' as any).update({ fecha_fin: base.toISOString().slice(0,10) }).eq('id', id);
    if (error) throw error; return {};
  };
  eliminarSuscripcion = async (id: string): Promise<any> => {
    const { error } = await supabase.from('suscripciones' as any).delete().eq('id', id);
    if (error) throw error; return {};
  };
  getHotelesSaas = async (): Promise<any> => {
    const { data } = await supabase.from('hotels').select('*');
    // Cada hotel pertenece a su propia "cuenta" (relación 1:1 en este modelo)
    return (data || []).map((h: any) => ({ ...h, cuenta_id: h.id }));
  };
  createHotelSaas = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('hotels').insert(data).select().single(); if (error) throw error; return r; };
  registrarHotelFull = async (_data: any): Promise<any> => ({});
  asignarHotelACuenta = async (_data: any): Promise<any> => ({});
  getMiSuscripcion = async (_params?: any): Promise<any> => ({ activa: true, plan: 'Demo', vence: '2099-12-31' });

  // ------- Reservas Online (web pública) -------
  getReservasOnlinePendientes = async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*, cliente:clientes(nombre, apellido_paterno, email, telefono), tipo:tipos_habitacion(nombre)')
      .eq('hotel_id', this.hid())
      .eq('origen', 'Web')
      .eq('estado', 'Pendiente')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: [r.cliente?.nombre, r.cliente?.apellido_paterno].filter(Boolean).join(' '),
      cliente_email: r.cliente?.email,
      cliente_telefono: r.cliente?.telefono,
      tipo_nombre: r.tipo?.nombre,
    }));
  };
  contarReservasOnlinePendientes = async (): Promise<number> => {
    const { count } = await supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', this.hid())
      .eq('origen', 'Web')
      .eq('estado', 'Pendiente');
    return count || 0;
  };
  confirmarReservaOnline = async (id: string): Promise<any> => {
    const { error } = await supabase
      .from('reservas')
      .update({ estado: 'Confirmada', revisada_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) throw error;
    return {};
  };
  rechazarReservaOnline = async (id: string, motivo?: string): Promise<any> => {
    const { error } = await supabase
      .from('reservas')
      .update({ estado: 'Cancelada', revisada_at: new Date().toISOString(), notas_internas: motivo || 'Rechazada por hotel' } as any)
      .eq('id', id);
    if (error) throw error;
    return {};
  };

  // ------- Métricas plataforma (SuperAdmin) -------
  getMetricasPlataforma = async (): Promise<any> => {
    const { data, error } = await supabase.from('v_metricas_plataforma' as any).select('*').maybeSingle();
    if (error) throw error;
    return data || {};
  };

  // ------- Suspender/reactivar hotel -------
  suspenderHotel = async (id: string, motivo?: string): Promise<any> => {
    const { error } = await supabase
      .from('hotels')
      .update({ activo_plataforma: false, suspendido_motivo: motivo || null, suspendido_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) throw error;
    void registrarAuditoria({
      accion: 'actualizar', entidad: 'hotel', entidad_id: id,
      descripcion: `Hotel suspendido${motivo ? ': ' + motivo : ''}`,
    });
    return {};
  };
  reactivarHotel = async (id: string): Promise<any> => {
    const { error } = await supabase
      .from('hotels')
      .update({ activo_plataforma: true, suspendido_motivo: null, suspendido_at: null } as any)
      .eq('id', id);
    if (error) throw error;
    void registrarAuditoria({
      accion: 'actualizar', entidad: 'hotel', entidad_id: id,
      descripcion: 'Hotel reactivado',
    });
    return {};
  };

  // ------- Selector de hotel para SuperAdmin -------
  setHotelActivo = async (hotelId: string | null): Promise<any> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { error } = await supabase
      .from('profiles')
      .update({ hotel_activo_id: hotelId } as any)
      .eq('id', user.id);
    if (error) throw error;
    this.setHotelId(hotelId);
    return {};
  };

  // ------- Permisos por hotel (en BD) -------
  getPermisosHotel = async (hotelId?: string): Promise<Record<string, string[]>> => {
    const hid = hotelId || this.hid();
    if (!hid) return {};
    const { data, error } = await supabase
      .from('permisos_hotel' as any)
      .select('rol, modulo, permitido')
      .eq('hotel_id', hid);
    if (error) throw error;
    const matrix: Record<string, string[]> = {};
    for (const r of (data as any[]) || []) {
      if (!r.permitido) continue;
      if (!matrix[r.modulo]) matrix[r.modulo] = [];
      if (!matrix[r.modulo].includes(r.rol)) matrix[r.modulo].push(r.rol);
    }
    return matrix;
  };
  savePermisosHotel = async (matrix: Record<string, string[]>, hotelId?: string): Promise<any> => {
    const hid = hotelId || this.hid();
    if (!hid) throw new Error('Hotel no definido');
    const rows: any[] = [];
    const todosRoles = ['Admin', 'Gerente', 'Recepcion', 'Housekeeping', 'Mantenimiento'];
    for (const [modulo, roles] of Object.entries(matrix)) {
      for (const rol of todosRoles) {
        rows.push({ hotel_id: hid, rol, modulo, permitido: rol === 'Admin' || (roles || []).includes(rol) });
      }
    }
    // upsert por (hotel_id, rol, modulo)
    const { error } = await supabase
      .from('permisos_hotel' as any)
      .upsert(rows, { onConflict: 'hotel_id,rol,modulo' });
    if (error) throw error;
    void registrarAuditoria({
      accion: 'actualizar', entidad: 'permisos',
      descripcion: `Matriz de permisos actualizada (${Object.keys(matrix).length} módulos)`,
      datos_despues: matrix,
    });
    return {};
  };

  // ------- Usuarios -------
  getUsuarios = async (): Promise<any> => { const { data } = await supabase.from('profiles').select('*').eq('hotel_id', this.hid()); return (data || []).map((u: any) => ({ ...u, rol: 'Recepcion' })); };
  getUsuario = async (id: string): Promise<any> => { const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle(); return data; };
  createUsuario = async (_data: any): Promise<any> => { throw new Error('La creación de usuarios se hace desde Configuración / Auth.'); };
  updateUsuario = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('profiles').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteUsuario = async (_id: string): Promise<any> => { throw new Error('Eliminación de usuarios deshabilitada en demo.'); };
  getRoles = async (): Promise<any> => ['Admin', 'Recepcion', 'Housekeeping', 'Mantenimiento', 'Gerente'];

  publicRequest = async <T>(_endpoint: string, _method = 'GET', _body?: any): Promise<T> => {
    throw new Error('publicRequest no soportado en modo Supabase.');
  };
}

export const api = new ApiClient();
export default api;
