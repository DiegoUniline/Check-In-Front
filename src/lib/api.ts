import { supabase } from '@/integrations/supabase/client';
import { registrarAuditoria } from '@/lib/auditoria';
import { crearNotificacion } from '@/lib/notificaciones';
import { setHotelCurrency, formatCurrency } from '@/lib/currency';
import { withOfflineCache } from '@/lib/offlineCache';

const DEMO_HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';
const operationalDb = supabase as any;

export type OperationalPriority = 'critical' | 'warning' | 'info';

export type OperationalAlert = {
  id: string;
  priority: OperationalPriority;
  title: string;
  detail: string;
  count: number;
  action: string;
  actionLabel: string;
};

export type OperationalControl = {
  score: number;
  alerts: OperationalAlert[];
  criticalCount: number;
  warningCount: number;
  openShift: any | null;
  dayClosure: any | null;
  pendingLog: number;
  storageMode: 'central' | 'local';
  updatedAt: string;
};

export type NightAuditCheck = {
  id: string;
  label: string;
  detail: string;
  count: number;
  blocking: boolean;
  ok: boolean;
  action?: string;
};

export type NightAuditSnapshot = {
  date: string;
  checks: NightAuditCheck[];
  closure: any | null;
  storageMode: 'central' | 'local';
  totals: { ingresos: number; gastos: number; ventas: number; saldoPendiente: number };
};
// Zona horaria del hotel activo (cacheada). Se actualiza al cargar el hotel.
let HOTEL_TZ: string = 'America/Mexico_City';
export const setHotelTimezone = (tz?: string | null) => {
  if (tz && typeof tz === 'string') HOTEL_TZ = tz;
};
export const getHotelTimezone = () => HOTEL_TZ;

const parseCalendarParts = (ymd: string) => {
  const [year, month, day] = ymd.split('-').map(Number);
  return { year, month, day };
};

const addCalendarDays = (ymd: string, amount: number): string => {
  const { year, month, day } = parseCalendarParts(ymd);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const calendarWeekday = (ymd: string): number => {
  const { year, month, day } = parseCalendarParts(ymd);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

// Fecha "hoy" YYYY-MM-DD en la zona horaria del hotel (no en UTC ni en la del navegador).
export const todayLocal = (): string => {
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
    const hotelId = (profile as any)?.hotel_activo_id || profile?.hotel_id || null;
    this.setHotelId(hotelId);
    // Leer el rol real desde user_roles (no asumir Admin)
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .order('role', { ascending: true })
      .limit(1)
      .maybeSingle();
    const rolReal = (roleRow?.role as string) || 'Recepcion';
    return {
      token: data.session?.access_token || '',
      user: {
        id: data.user.id,
        email: data.user.email || email,
        nombre: profile?.nombre || email.split('@')[0],
        apellidoPaterno: profile?.apellido_paterno || '',
        rol: rolReal,
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
    const hotelId = (profile as any)?.hotel_activo_id || profile?.hotel_id || null;
    if (hotelId) this.setHotelId(hotelId);
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user!.id)
      .order('role', { ascending: true })
      .limit(1)
      .maybeSingle();
    const rolReal = (roleRow?.role as string) || 'Admin';
    return {
      needsConfirmation: false,
      user: {
        id: data.user!.id,
        email: data.user!.email || email,
        nombre: profile?.nombre || nombre,
        apellidoPaterno: profile?.apellido_paterno || '',
        rol: rolReal,
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

  private operationalFallbackKey(scope: string) {
    return `vulo:operaciones:${this.hid()}:${scope}`;
  }

  private readOperationalFallback<T>(scope: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.operationalFallbackKey(scope));
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private writeOperationalFallback<T>(scope: string, value: T): T {
    localStorage.setItem(this.operationalFallbackKey(scope), JSON.stringify(value));
    return value;
  }

  private legacyBitacoraKey() {
    return `vulo:bitacora:${this.hid()}`;
  }

  private readLegacyBitacora(): any[] {
    try {
      const raw = localStorage.getItem(this.legacyBitacoraKey());
      const entries = raw ? JSON.parse(raw) : [];
      return Array.isArray(entries) ? entries : [];
    } catch {
      return [];
    }
  }

  private writeLegacyBitacora(entries: any[]): any[] {
    localStorage.setItem(this.legacyBitacoraKey(), JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('vulo:bitacora-updated', { detail: { hotelId: this.hid() } }));
    return entries;
  }

  private localBitacoraToRow(entry: any): any {
    return {
      id: entry.id,
      hotel_id: entry.hotelId || this.hid(),
      turno_id: entry.turnoId || null,
      categoria: entry.categoria || 'General',
      prioridad: entry.prioridad || 'Normal',
      titulo: entry.titulo || 'Registro operativo',
      detalle: entry.detalle || null,
      estado: entry.resuelto ? 'Resuelto' : 'Abierto',
      responsable: entry.responsable || null,
      autor_id: entry.autorId || null,
      autor_nombre: entry.autor || 'Usuario',
      created_at: entry.fecha || new Date().toISOString(),
      updated_at: entry.fecha || new Date().toISOString(),
    };
  }

  private operationalId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
  }

  private isMissingOperationalTable(error: any): boolean {
    const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    return text.includes('42p01') || text.includes('pgrst205') || text.includes('could not find the table') || text.includes('does not exist');
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
    const tomorrow = addCalendarDays(today, 1);
    const { data } = await supabase.from('ventas').select('total').eq('hotel_id', this.hid()).gte('fecha', today).lt('fecha', tomorrow);
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
    const today = todayLocal();
    const { year, month } = parseCalendarParts(today);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonthDate = new Date(Date.UTC(year, month, 1));
    const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
    const { data } = await supabase.from('reservas').select('total, fecha_checkin').eq('hotel_id', this.hid()).gte('fecha_checkin', start).lt('fecha_checkin', nextMonth);
    const total = (data || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);
    return { total, count: (data || []).length };
  };

  getDashboardOcupacionSemanal = async (): Promise<any> => {
    const hotel_id = this.hid();
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = todayLocal();
    // Lunes de esta semana (semana lun-dom)
    const dow = calendarWeekday(today); // 0=Dom..6=Sab
    const offsetToMon = dow === 0 ? -6 : 1 - dow;
    const monday = addCalendarDays(today, offsetToMon);
    const sunday = addCalendarDays(monday, 6);
    const [{ data: habs }, { data: reservas }] = await Promise.all([
      supabase.from('habitaciones').select('id').eq('hotel_id', hotel_id),
      supabase
        .from('reservas')
        .select('fecha_checkin, fecha_checkout, estado')
        .eq('hotel_id', hotel_id)
        .lte('fecha_checkin', sunday)
        .gt('fecha_checkout', monday),
    ]);
    const total = (habs || []).length || 1;
    const result: { dia: string; ocupacion: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const ds = addCalendarDays(monday, i);
      const ocupadas = (reservas || []).filter((r: any) => {
        if (r.estado === 'Cancelada') return false;
        return r.fecha_checkin <= ds && r.fecha_checkout > ds;
      }).length;
      result.push({
        dia: dias[calendarWeekday(ds)],
        ocupacion: total ? Math.round((ocupadas / total) * 100) : 0,
      });
    }
    return result;
  };

  // ------- Control operativo -------
  getOperationalControl = async (): Promise<OperationalControl> => {
    const hotelId = this.hid();
    const today = todayLocal();
    const [reservasR, habitacionesR, limpiezaR, mantenimientoR, turnoR, bitacoraR, cierreR] = await Promise.all([
      supabase.from('reservas').select('id,numero_reserva,fecha_checkin,fecha_checkout,estado,origen,checkin_realizado,checkout_realizado,habitacion_id,saldo_pendiente,total,total_pagado').eq('hotel_id', hotelId),
      supabase.from('habitaciones').select('id,numero,estado_habitacion,estado_limpieza,estado_mantenimiento').eq('hotel_id', hotelId),
      supabase.from('tareas_limpieza').select('id,estado,prioridad,asignado_a,habitacion_id').eq('hotel_id', hotelId).neq('estado', 'Completada'),
      supabase.from('tareas_mantenimiento').select('id,estado,prioridad,habitacion_id,titulo').eq('hotel_id', hotelId).neq('estado', 'Completada'),
      operationalDb.from('turnos_operativos').select('*').eq('hotel_id', hotelId).eq('estado', 'Abierto').order('abierto_at', { ascending: false }).limit(1).maybeSingle(),
      operationalDb.from('bitacora_operativa').select('id,categoria,prioridad,estado').eq('hotel_id', hotelId).eq('estado', 'Abierto'),
      operationalDb.from('cierres_diarios').select('*').eq('hotel_id', hotelId).eq('fecha_operativa', today).maybeSingle(),
    ]);

    const reservas = reservasR.data || [];
    const habitaciones = habitacionesR.data || [];
    const fallbackShifts = this.readOperationalFallback<any[]>('turnos', []);
    const fallbackLog = this.readLegacyBitacora();
    const fallbackClosures = this.readOperationalFallback<any[]>('cierres', []);
    const turnoData = turnoR.data || (turnoR.error ? fallbackShifts.find((item) => item.estado === 'Abierto') : null) || null;
    const bitacoraData = bitacoraR.error ? fallbackLog.map((entry) => ({ categoria: entry.categoria, prioridad: entry.prioridad || 'Normal', estado: entry.resuelto ? 'Resuelto' : 'Abierto' })) : (bitacoraR.data || []);
    const cierreData = cierreR.data || (cierreR.error ? fallbackClosures.find((item) => item.fecha_operativa === today) : null) || null;
    const habitacionesMap = new Map(habitaciones.map((h: any) => [h.id, h]));
    const active = (r: any) => !['cancelada', 'finalizada', 'completada', 'checkout', 'check out', 'noshow', 'no show'].includes(String(r.estado || '').toLowerCase());
    const approvedForReception = (r: any) => !(r.origen === 'Web' && r.estado === 'Pendiente');
    const arrivals = reservas.filter((r: any) => r.fecha_checkin === today && active(r) && approvedForReception(r) && !r.checkin_realizado);
    const overdueArrivals = reservas.filter((r: any) => r.fecha_checkin < today && active(r) && approvedForReception(r) && !r.checkin_realizado && !r.checkout_realizado);
    const departures = reservas.filter((r: any) => r.fecha_checkout <= today && active(r) && r.checkin_realizado && !r.checkout_realizado);
    const unassigned = arrivals.filter((r: any) => !r.habitacion_id);
    const dirtyArrivals = arrivals.filter((r: any) => {
      if (!r.habitacion_id) return false;
      const room: any = habitacionesMap.get(r.habitacion_id);
      return room && String(room.estado_limpieza || '').toLowerCase() !== 'limpia';
    });
    const balances = reservas.filter((r: any) => active(r) && Number(r.saldo_pendiente || 0) > 0.01);
    const cleaning = (limpiezaR.data || []).filter((t: any) => String(t.estado || '').toLowerCase() !== 'completada');
    const cleaningUnassigned = cleaning.filter((t: any) => !t.asignado_a);
    const maintenance = (mantenimientoR.data || []).filter((t: any) => String(t.estado || '').toLowerCase() !== 'completada');
    const urgentMaintenance = maintenance.filter((t: any) => ['alta', 'urgente', 'crítica'].includes(String(t.prioridad || '').toLowerCase()));
    const pendingCategories = ['pendiente', 'incidente', 'mantenimiento', 'caja', 'entrega de turno'];
    const pendingEntries = bitacoraData.filter((e: any) => String(e.estado || '').toLowerCase() === 'abierto' && pendingCategories.includes(String(e.categoria || '').toLowerCase()));
    const pendingLog = pendingEntries.length;
    const criticalLog = pendingEntries.filter((e: any) => ['alta', 'crítica'].includes(String(e.prioridad || '').toLowerCase())).length;
    const alerts: OperationalAlert[] = [];
    const push = (alert: OperationalAlert) => { if (alert.count > 0) alerts.push(alert); };

    push({ id: 'dirty-arrivals', priority: 'critical', title: 'Llegadas con habitación no lista', detail: 'Recepción no debería entregar estas habitaciones todavía.', count: dirtyArrivals.length, action: '/limpieza', actionLabel: 'Priorizar limpieza' });
    push({ id: 'departures', priority: 'critical', title: 'Salidas pendientes o vencidas', detail: 'Revisa el folio, el saldo y confirma la salida.', count: departures.length, action: '/reservas/checkout?focus=overdue', actionLabel: 'Atender salidas' });
    push({ id: 'unassigned', priority: 'critical', title: 'Llegadas sin habitación asignada', detail: 'Asigna habitación antes de que llegue el huésped.', count: unassigned.length, action: '/reservas', actionLabel: 'Asignar ahora' });
    push({ id: 'overdue-arrivals', priority: 'critical', title: 'Llegadas anteriores sin resolver', detail: 'Confirma si llegaron, extendieron o deben marcarse como no-show.', count: overdueArrivals.length, action: '/reservas/checkin?focus=overdue', actionLabel: 'Resolver llegadas' });
    push({ id: 'balances', priority: 'warning', title: 'Reservas activas con saldo pendiente', detail: 'Hay dinero por cobrar o validar antes del check-out.', count: balances.length, action: '/reservas', actionLabel: 'Revisar saldos' });
    push({ id: 'cleaning', priority: dirtyArrivals.length ? 'critical' : 'warning', title: 'Tareas de limpieza sin responsable', detail: 'Asigna a una persona y evita habitaciones detenidas.', count: cleaningUnassigned.length, action: '/limpieza', actionLabel: 'Asignar tareas' });
    push({ id: 'maintenance', priority: 'critical', title: 'Mantenimientos prioritarios abiertos', detail: 'Pueden afectar la venta o la experiencia del huésped.', count: urgentMaintenance.length, action: '/mantenimiento', actionLabel: 'Atender mantenimiento' });
    push({ id: 'log', priority: criticalLog ? 'critical' : 'warning', title: 'Pendientes abiertos en bitácora', detail: 'El siguiente turno necesita seguimiento y responsable.', count: pendingLog, action: '/turnos', actionLabel: 'Ver bitácora' });
    if (!turnoData) {
      alerts.push({ id: 'shift', priority: 'warning', title: 'No hay turno operativo abierto', detail: 'Abre el turno para controlar caja, responsables y entrega.', count: 1, action: '/turnos', actionLabel: 'Abrir turno' });
    }

    const criticalCount = alerts.filter((a) => a.priority === 'critical').reduce((s, a) => s + a.count, 0);
    const warningCount = alerts.filter((a) => a.priority === 'warning').reduce((s, a) => s + a.count, 0);
    const score = Math.max(0, Math.min(100, 100 - criticalCount * 12 - warningCount * 4));
    return {
      score,
      alerts: alerts.sort((a, b) => ['critical', 'warning', 'info'].indexOf(a.priority) - ['critical', 'warning', 'info'].indexOf(b.priority)),
      criticalCount,
      warningCount,
      openShift: turnoData,
      dayClosure: cierreData,
      pendingLog,
      storageMode: turnoR.error || bitacoraR.error || cierreR.error ? 'local' : 'central',
      updatedAt: new Date().toISOString(),
    };
  };

  getOpenShift = async (usuarioId: string): Promise<any | null> => {
    const { data, error } = await operationalDb.from('turnos_operativos').select('*')
      .eq('hotel_id', this.hid()).eq('usuario_id', usuarioId).eq('estado', 'Abierto')
      .order('abierto_at', { ascending: false }).limit(1).maybeSingle();
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      return this.readOperationalFallback<any[]>('turnos', [])
        .filter((item) => item.usuario_id === usuarioId && item.estado === 'Abierto')
        .sort((a, b) => new Date(b.abierto_at || 0).getTime() - new Date(a.abierto_at || 0).getTime())[0] || null;
    }
    return data || null;
  };

  getShiftHistory = async (): Promise<any[]> => {
    const { data, error } = await operationalDb.from('turnos_operativos').select('*')
      .eq('hotel_id', this.hid()).order('abierto_at', { ascending: false }).limit(50);
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      return this.readOperationalFallback<any[]>('turnos', [])
        .sort((a, b) => new Date(b.abierto_at || 0).getTime() - new Date(a.abierto_at || 0).getTime())
        .slice(0, 50);
    }
    return data || [];
  };

  openShift = async (payload: { usuario_id: string; usuario_nombre: string; fondo_inicial: number }): Promise<any> => {
    const { data, error } = await operationalDb.from('turnos_operativos')
      .insert({ ...payload, hotel_id: this.hid(), estado: 'Abierto' }).select().single();
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      const shifts = this.readOperationalFallback<any[]>('turnos', []);
      const existing = shifts.find((item) => item.usuario_id === payload.usuario_id && item.estado === 'Abierto');
      if (existing) throw new Error('Ya existe un turno abierto para este usuario.');
      const now = new Date().toISOString();
      const localShift = {
        id: this.operationalId(),
        hotel_id: this.hid(),
        ...payload,
        estado: 'Abierto',
        abierto_at: now,
        cerrado_at: null,
        created_at: now,
        updated_at: now,
        _local_only: true,
      };
      this.writeOperationalFallback('turnos', [localShift, ...shifts]);
      return localShift;
    }
    return data;
  };

  getShiftFinancialSummary = async (abiertoAt: string): Promise<any> => {
    const hotelId = this.hid();
    const [{ data: pagos }, { data: gastos }] = await Promise.all([
      supabase.from('pagos').select('*').eq('hotel_id', hotelId).gte('created_at', abiertoAt),
      supabase.from('gastos').select('*').eq('hotel_id', hotelId).gte('created_at', abiertoAt),
    ]);
    const summary = { efectivo: 0, tarjeta: 0, transferencia: 0, otros: 0, egresosEfectivo: 0, movimientos: [] as any[] };
    (pagos || []).forEach((p: any) => {
      const method = String(p.metodo_pago || '').toLowerCase();
      const amount = Number(p.monto || 0);
      if (method.includes('efectivo')) summary.efectivo += amount;
      else if (method.includes('tarjeta')) summary.tarjeta += amount;
      else if (method.includes('transfer')) summary.transferencia += amount;
      else summary.otros += amount;
      summary.movimientos.push({ id: p.id, tipo: 'Ingreso', concepto: p.concepto || p.numero_pago || 'Pago de reserva', metodo: p.metodo_pago || 'Otro', monto: amount, fecha: p.created_at || p.fecha });
    });
    (gastos || []).forEach((g: any) => {
      const amount = Number(g.monto || 0);
      if (String(g.metodo_pago || '').toLowerCase().includes('efectivo')) summary.egresosEfectivo += amount;
      summary.movimientos.push({ id: g.id, tipo: 'Egreso', concepto: g.descripcion || g.categoria || 'Gasto', metodo: g.metodo_pago || 'Otro', monto: amount, fecha: g.created_at || g.fecha });
    });
    summary.movimientos.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
    return summary;
  };

  closeShift = async (id: string, payload: Record<string, unknown>): Promise<any> => {
    const { data, error } = await operationalDb.from('turnos_operativos').update({ ...payload, estado: 'Cerrado', cerrado_at: new Date().toISOString() })
      .eq('id', id).eq('hotel_id', this.hid()).select().single();
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      const shifts = this.readOperationalFallback<any[]>('turnos', []);
      const index = shifts.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('No se encontró el turno que se desea cerrar.');
      const closed = { ...shifts[index], ...payload, estado: 'Cerrado', cerrado_at: new Date().toISOString(), updated_at: new Date().toISOString(), _local_only: true };
      shifts[index] = closed;
      this.writeOperationalFallback('turnos', shifts);
      return closed;
    }
    return data;
  };

  getNightAuditSnapshot = async (date = todayLocal()): Promise<NightAuditSnapshot> => {
    const hotelId = this.hid();
    const [reservasR, habitacionesR, turnosR, bitacoraR, pagosR, gastosR, ventasR, cierreR] = await Promise.all([
      supabase.from('reservas').select('*').eq('hotel_id', hotelId),
      supabase.from('habitaciones').select('id,numero,estado_habitacion').eq('hotel_id', hotelId),
      operationalDb.from('turnos_operativos').select('id').eq('hotel_id', hotelId).eq('estado', 'Abierto'),
      operationalDb.from('bitacora_operativa').select('id,categoria,prioridad').eq('hotel_id', hotelId).eq('estado', 'Abierto'),
      supabase.from('pagos').select('monto').eq('hotel_id', hotelId).eq('fecha', date),
      supabase.from('gastos').select('monto').eq('hotel_id', hotelId).eq('fecha', date),
      supabase.from('ventas').select('total').eq('hotel_id', hotelId).eq('fecha', date),
      operationalDb.from('cierres_diarios').select('*').eq('hotel_id', hotelId).eq('fecha_operativa', date).maybeSingle(),
    ]);
    const reservas = reservasR.data || [];
    const active = (r: any) => !['cancelada', 'finalizada', 'completada', 'checkout', 'check out', 'noshow', 'no show'].includes(String(r.estado || '').toLowerCase());
    const approvedForReception = (r: any) => !(r.origen === 'Web' && r.estado === 'Pendiente');
    const arrivalsPending = reservas.filter((r: any) => r.fecha_checkin === date && active(r) && approvedForReception(r) && !r.checkin_realizado).length;
    const departuresPendingRows = reservas.filter((r: any) => r.fecha_checkout <= date && active(r) && r.checkin_realizado && !r.checkout_realizado);
    const departuresPending = departuresPendingRows.length;
    const balances = departuresPendingRows.filter((r: any) => Number(r.saldo_pendiente || 0) > 0.01);
    const activeRooms = new Set(reservas.filter((r: any) => active(r) && r.checkin_realizado && !r.checkout_realizado).map((r: any) => r.habitacion_id));
    const inconsistentRooms = (habitacionesR.data || []).filter((h: any) => String(h.estado_habitacion || '').toLowerCase() === 'ocupada' && !activeRooms.has(h.id)).length;
    const fallbackShifts = this.readOperationalFallback<any[]>('turnos', []);
    const fallbackLog = this.readLegacyBitacora().map((entry) => this.localBitacoraToRow(entry));
    const fallbackClosures = this.readOperationalFallback<any[]>('cierres', []);
    const openShifts = turnosR.error ? fallbackShifts.filter((item) => item.estado === 'Abierto') : (turnosR.data || []);
    const openLog = bitacoraR.error ? fallbackLog.filter((item) => item.estado === 'Abierto') : (bitacoraR.data || []);
    const closure = cierreR.data || (cierreR.error ? fallbackClosures.find((item) => item.fecha_operativa === date) : null) || null;
    const criticalLog = openLog.filter((e: any) => ['pendiente', 'incidente', 'mantenimiento', 'caja', 'entrega de turno'].includes(String(e.categoria || '').toLowerCase()) && ['alta', 'crítica'].includes(String(e.prioridad || '').toLowerCase())).length;
    const checks: NightAuditCheck[] = [
      { id: 'arrivals', label: 'Llegadas del día resueltas', detail: 'Check-in realizado o no-show documentado.', count: arrivalsPending, blocking: true, ok: arrivalsPending === 0, action: `/reservas/checkin?from=${date}&to=${date}` },
      { id: 'departures', label: 'Salidas atendidas', detail: 'No quedan huéspedes con salida vencida.', count: departuresPending, blocking: true, ok: departuresPending === 0, action: `/reservas/checkout?focus=overdue&to=${date}` },
      { id: 'balances', label: 'Folios de salida sin saldo', detail: 'Todos los cobros del día están conciliados.', count: balances.length, blocking: true, ok: balances.length === 0, action: `/reservas/checkout?focus=overdue&to=${date}` },
      { id: 'shifts', label: 'Turnos y cajas cerrados', detail: 'No existe una caja operativa todavía abierta.', count: openShifts.length, blocking: true, ok: openShifts.length === 0, action: '/turnos' },
      { id: 'rooms', label: 'Habitaciones consistentes', detail: 'Toda habitación ocupada tiene una estancia activa.', count: inconsistentRooms, blocking: true, ok: inconsistentRooms === 0, action: '/habitaciones' },
      { id: 'log', label: 'Incidentes prioritarios documentados', detail: 'No quedan pendientes críticos sin seguimiento.', count: criticalLog, blocking: false, ok: criticalLog === 0, action: '/turnos' },
    ];
    const sum = (rows: any[], field: string) => rows.reduce((s, row) => s + Number(row[field] || 0), 0);
    return {
      date,
      checks,
      closure,
      storageMode: turnosR.error || bitacoraR.error || cierreR.error ? 'local' : 'central',
      totals: {
        ingresos: sum(pagosR.data || [], 'monto'),
        gastos: sum(gastosR.data || [], 'monto'),
        ventas: sum(ventasR.data || [], 'total'),
        saldoPendiente: balances.reduce((s: number, r: any) => s + Number(r.saldo_pendiente || 0), 0),
      },
    };
  };

  closeOperationalDay = async (payload: { fecha_operativa: string; checklist: unknown; resumen: unknown; observaciones?: string; cerrado_por?: string; cerrado_por_nombre?: string }): Promise<any> => {
    const { data, error } = await operationalDb.from('cierres_diarios').upsert({ ...payload, hotel_id: this.hid(), estado: 'Cerrado', cerrado_at: new Date().toISOString(), reabierto_at: null, motivo_reapertura: null }, { onConflict: 'hotel_id,fecha_operativa' }).select().single();
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      const closures = this.readOperationalFallback<any[]>('cierres', []);
      const now = new Date().toISOString();
      const index = closures.findIndex((item) => item.fecha_operativa === payload.fecha_operativa);
      const localClosure = {
        ...(index >= 0 ? closures[index] : {}),
        id: index >= 0 ? closures[index].id : this.operationalId(),
        hotel_id: this.hid(),
        ...payload,
        estado: 'Cerrado',
        cerrado_at: now,
        reabierto_at: null,
        motivo_reapertura: null,
        updated_at: now,
        created_at: index >= 0 ? closures[index].created_at : now,
        _local_only: true,
      };
      if (index >= 0) closures[index] = localClosure;
      else closures.unshift(localClosure);
      this.writeOperationalFallback('cierres', closures);
      return localClosure;
    }
    return data;
  };

  reopenOperationalDay = async (id: string, payload: { reabierto_por?: string; motivo_reapertura: string }): Promise<any> => {
    const { data, error } = await operationalDb.from('cierres_diarios').update({ ...payload, estado: 'Reabierto', reabierto_at: new Date().toISOString() })
      .eq('id', id).eq('hotel_id', this.hid()).select().single();
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      const closures = this.readOperationalFallback<any[]>('cierres', []);
      const index = closures.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('No se encontró el cierre que se desea reabrir.');
      const reopened = { ...closures[index], ...payload, estado: 'Reabierto', reabierto_at: new Date().toISOString(), updated_at: new Date().toISOString(), _local_only: true };
      closures[index] = reopened;
      this.writeOperationalFallback('cierres', closures);
      return reopened;
    }
    return data;
  };

  getBitacoraOperativa = async (): Promise<any[]> => {
    const { data, error } = await operationalDb.from('bitacora_operativa').select('*').eq('hotel_id', this.hid()).order('created_at', { ascending: false }).limit(300);
    const localRows = this.readLegacyBitacora().map((entry) => this.localBitacoraToRow(entry));
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      return localRows;
    }
    const remoteRows = data || [];
    const remoteIds = new Set(remoteRows.map((entry: any) => entry.id));
    return [...remoteRows, ...localRows.filter((entry) => !remoteIds.has(entry.id))]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 300);
  };

  createBitacoraOperativa = async (payload: Record<string, unknown>): Promise<any> => {
    const { data, error } = await operationalDb.from('bitacora_operativa').insert({ ...payload, hotel_id: this.hid() }).select().single();
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      const now = new Date().toISOString();
      const row = { id: payload.id || this.operationalId(), hotel_id: this.hid(), ...payload, created_at: now, updated_at: now, _local_only: true } as any;
      const localEntry = {
        id: row.id,
        hotelId: row.hotel_id,
        fecha: row.created_at,
        autor: row.autor_nombre || 'Usuario',
        autorId: row.autor_id || 'anon',
        categoria: row.categoria || 'General',
        prioridad: row.prioridad || 'Normal',
        titulo: row.titulo || 'Registro operativo',
        detalle: row.detalle || '',
        responsable: row.responsable || undefined,
        turnoId: row.turno_id || undefined,
        resuelto: row.estado === 'Resuelto',
      };
      const entries = this.readLegacyBitacora().filter((entry) => entry.id !== row.id);
      this.writeLegacyBitacora([localEntry, ...entries]);
      return row;
    }
    return data;
  };

  updateBitacoraOperativa = async (id: string, payload: Record<string, unknown>): Promise<any> => {
    const { data, error } = await operationalDb.from('bitacora_operativa').update(payload).eq('id', id).eq('hotel_id', this.hid()).select().single();
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      let updated: any = null;
      const entries = this.readLegacyBitacora().map((entry) => {
        if (entry.id !== id) return entry;
        updated = {
          ...entry,
          categoria: payload.categoria ?? entry.categoria,
          prioridad: payload.prioridad ?? entry.prioridad,
          titulo: payload.titulo ?? entry.titulo,
          detalle: payload.detalle ?? entry.detalle,
          responsable: payload.responsable ?? entry.responsable,
          resuelto: payload.estado === undefined ? entry.resuelto : payload.estado === 'Resuelto',
        };
        return updated;
      });
      this.writeLegacyBitacora(entries);
      return updated ? this.localBitacoraToRow(updated) : null;
    }
    return data;
  };

  deleteBitacoraOperativa = async (id: string): Promise<void> => {
    const { error } = await operationalDb.from('bitacora_operativa').delete().eq('id', id).eq('hotel_id', this.hid());
    if (error) {
      if (!this.isMissingOperationalTable(error)) throw error;
      this.writeLegacyBitacora(this.readLegacyBitacora().filter((entry) => entry.id !== id));
    }
  };

  // ------- Habitaciones -------
  getHabitaciones = async (params?: Record<string, string>): Promise<any> => {
    const key = `habitaciones:${this.hid()}:${params?.estado_habitacion || 'all'}`;
    return withOfflineCache(key, async () => {
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
    });
  };
  getHabitacion = async (id: string): Promise<any> => {
    const { data, error } = await supabase.from('habitaciones').select('*, tipos_habitacion(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  };
  getHabitacionesDisponibles = async (checkin: string, checkout: string, tipoId?: string, excludeReservaId?: string): Promise<any> => {
    let q = supabase
      .from('habitaciones')
      .select('*, tipos_habitacion(*)')
      .eq('hotel_id', this.hid())
      .not('estado_habitacion', 'in', '(Mantenimiento,FueraDeServicio,Bloqueada)');
    if (tipoId) q = q.eq('tipo_habitacion_id', tipoId);
    const { data: habs, error: habError } = await q;
    if (habError) throw habError;
    let conflictsQuery = supabase
      .from('reservas')
      .select('habitacion_id')
      .eq('hotel_id', this.hid())
      .in('estado', ['Pendiente', 'Confirmada', 'CheckIn', 'Hospedado'])
      .lt('fecha_checkin', checkout)
      .gt('fecha_checkout', checkin);
    if (excludeReservaId) conflictsQuery = conflictsQuery.neq('id', excludeReservaId);
    const { data: ocupadas, error: reservationError } = await conflictsQuery;
    if (reservationError) throw reservationError;
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
    const key = `tipos_habitacion:${this.hid()}`;
    return withOfflineCache(key, async () => {
      const { data, error } = await supabase.from('tipos_habitacion').select('*').eq('hotel_id', this.hid()).order('nombre');
      if (error) throw error; return data || [];
    });
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
    // Solo cacheamos la lista completa sin filtro de búsqueda (la búsqueda
    // se evalúa local en offline filtrando el resultado cacheado).
    if (params?.search) {
      let q = supabase.from('clientes').select('*').eq('hotel_id', this.hid()).order('nombre');
      q = q.ilike('nombre', `%${params.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((c: any) => this.sanitizeClienteResponse(c));
    }
    const key = `clientes:${this.hid()}`;
    return withOfflineCache(key, async () => {
      const { data, error } = await supabase.from('clientes').select('*').eq('hotel_id', this.hid()).order('nombre');
      if (error) throw error;
      const clientes = (data || []).map((c: any) => this.sanitizeClienteResponse(c));
      // Contar estancias reales desde reservas (excluye Canceladas)
      try {
        const { data: reservas } = await supabase
          .from('reservas')
          .select('cliente_id, estado')
          .eq('hotel_id', this.hid());
        const counts = new Map<string, number>();
        (reservas || []).forEach((r: any) => {
          if (!r.cliente_id) return;
          if (r.estado === 'Cancelada') return;
          counts.set(r.cliente_id, (counts.get(r.cliente_id) || 0) + 1);
        });
        return clientes.map((c: any) => ({
          ...c,
          total_estancias: counts.get(c.id) ?? c.total_estancias ?? 0,
        }));
      } catch {
        return clientes;
      }
    });
  };
  getCliente = async (id: string): Promise<any> => {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    const cliente = this.sanitizeClienteResponse(data);
    if (cliente) {
      try {
        const { count } = await supabase
          .from('reservas')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', id)
          .neq('estado', 'Cancelada');
        cliente.total_estancias = count ?? cliente.total_estancias ?? 0;
      } catch { /* usar valor persistido */ }
    }
    return cliente;
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
    const paramsKey = params
      ? Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('|')
      : 'all';
    const key = `reservas:${this.hid()}:${paramsKey}`;
    return withOfflineCache(key, async () => {
      let q = supabase.from('reservas').select('*, clientes(*), habitaciones(numero, tipos_habitacion(nombre)), tipos_habitacion(nombre)').eq('hotel_id', this.hid()).order('fecha_checkin', { ascending: false });
      if (params?.estado) q = q.eq('estado', params.estado);
      // Excluir reservas online aún pendientes de aprobación
      q = q.or('origen.neq.Web,estado.neq.Pendiente');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        cliente_nombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido_paterno || ''}`.trim() : '',
        cliente_email: r.clientes?.email || '',
        cliente_telefono: r.clientes?.telefono || '',
        habitacion_numero: r.habitaciones?.numero,
        tipo_habitacion_nombre: r.tipos_habitacion?.nombre || r.habitaciones?.tipos_habitacion?.nombre,
      }));
    });
  };
  getReserva = async (id: string): Promise<any> => {
    const { data, error } = await supabase.from('reservas').select('*, clientes(*), habitaciones(*, tipos_habitacion(*)), tipos_habitacion(*), hotel:hotels(*)').eq('id', id).eq('hotel_id', this.hid()).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [{ data: pagos }, { data: cargos }] = await Promise.all([
      supabase.from('pagos').select('*').eq('reserva_id', id).order('fecha', { ascending: false }),
      supabase.from('cargos').select('*').eq('reserva_id', id).order('created_at', { ascending: false }),
    ]);
    return {
      ...data,
      cliente: (data as any).clientes || null,
      habitacion: (data as any).habitaciones || null,
      tipo_habitacion: (data as any).tipos_habitacion || (data as any).habitaciones?.tipos_habitacion || null,
      cliente_nombre: (data as any).clientes ? `${(data as any).clientes.nombre} ${(data as any).clientes.apellido_paterno || ''}`.trim() : '',
      cliente_email: (data as any).clientes?.email || '',
      cliente_telefono: (data as any).clientes?.telefono || '',
      apellido_paterno: (data as any).clientes?.apellido_paterno || '',
      apellido_materno: (data as any).clientes?.apellido_materno || '',
      es_vip: Boolean((data as any).clientes?.es_vip),
      total_estancias: Number((data as any).clientes?.total_estancias || 0),
      habitacion_numero: (data as any).habitaciones?.numero,
      pagos: pagos || [],
      cargos: cargos || [],
      cargos_extra: (cargos || []).map((cargo: any) => ({
        ...cargo,
        precio: Number(cargo.precio_unitario || 0),
        cantidad: Number(cargo.cantidad || 1),
        total: Number(cargo.total ?? cargo.subtotal ?? 0),
        producto_nombre: cargo.producto_nombre || cargo.concepto || 'Cargo',
      })),
    };
  };
  getCheckinsHoy = async (): Promise<any> => {
    const today = todayLocal();
    const { data } = await supabase.from('reservas').select('*, clientes(nombre, apellido_paterno), habitaciones(numero)').eq('hotel_id', this.hid()).eq('fecha_checkin', today).eq('checkin_realizado', false).not('estado', 'in', '(Cancelada,NoShow)').or('origen.neq.Web,estado.neq.Pendiente');
    return (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido_paterno || ''}`.trim() : '',
      habitacion_numero: r.habitaciones?.numero,
    }));
  };
  getCheckoutsHoy = async (): Promise<any> => {
    const today = todayLocal();
    const { data } = await supabase.from('reservas').select('*, clientes(nombre, apellido_paterno), habitaciones(numero)').eq('hotel_id', this.hid()).eq('fecha_checkout', today).eq('checkin_realizado', true).eq('checkout_realizado', false).not('estado', 'in', '(Cancelada,NoShow)').or('origen.neq.Web,estado.neq.Pendiente');
    return (data || []).map((r: any) => ({
      ...r,
      cliente_nombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido_paterno || ''}`.trim() : '',
      habitacion_numero: r.habitaciones?.numero,
    }));
  };
  createReserva = async (data: any): Promise<any> => {
    const noches = data.noches || 1;
    const tarifa = Number(data.tarifa_noche || 0);
    const personasExtra = Number(data.personas_extra || 0);
    const cargoPE = Number(data.cargo_persona_extra || 0);
    const subtotal = noches * tarifa + noches * personasExtra * cargoPE;
    // Soporte para descuento porcentaje / monto
    const descuentoValor = Number(data.descuento_valor ?? data.descuento ?? 0);
    const esPorcentaje = String(data.descuento_tipo || '').toLowerCase().startsWith('porc');
    const descuento = Math.max(
      0,
      Math.min(subtotal, esPorcentaje ? subtotal * (descuentoValor / 100) : descuentoValor),
    );
    const base = Math.max(0, subtotal - descuento);
    // Los impuestos se eligen al crear la reserva. Si no se envían, no se
    // aplica ninguna tasa automática.
    const impuestos = Math.max(0, Number(data.total_impuestos ?? data.impuestos ?? 0));
    const total = base + impuestos;
    const totalPagado = Number(data.total_pagado || 0);
    // Validación de overbooking: si se asigna habitación específica, verificar
    // que no exista otra reserva activa que solape las fechas. Los estados que
    // "bloquean" la habitación son Confirmada y CheckIn. Cancelada/NoShow/CheckOut
    // no bloquean.
    if (data.habitacion_id && data.fecha_checkin && data.fecha_checkout) {
      const { data: conflictos, error: errConf } = await supabase
        .from('reservas')
        .select('id, numero_reserva, fecha_checkin, fecha_checkout, estado')
        .eq('hotel_id', this.hid())
        .eq('habitacion_id', data.habitacion_id)
        .in('estado', ['Pendiente', 'Confirmada', 'CheckIn', 'Hospedado'])
        .lt('fecha_checkin', data.fecha_checkout)
        .gt('fecha_checkout', data.fecha_checkin);
      if (errConf) throw errConf;
      if (conflictos && conflictos.length > 0) {
        const c = conflictos[0];
        throw new Error(
          `Overbooking: la habitación ya tiene una reserva ${c.numero_reserva || ''} del ${c.fecha_checkin} al ${c.fecha_checkout} (${c.estado}).`
        );
      }
    }
    const payload = {
      ...data,
      hotel_id: this.hid(),
      subtotal_hospedaje: subtotal,
      descuento,
      total_impuestos: impuestos,
      impuesto_hospedaje_porcentaje: subtotal > 0 ? (impuestos * 100) / subtotal : 0,
      total,
      saldo_pendiente: Math.max(0, total - totalPagado),
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
  applyStayOperation = async (id: string, operation: string, payload: Record<string, any> = {}, reason = ''): Promise<any> => {
    const { data, error } = await operationalDb.rpc('vulo_apply_stay_operation', {
      p_reserva_id: id,
      p_operacion: operation,
      p_payload: payload,
      p_motivo: reason,
    });
    if (error) throw error;
    return data;
  };
  reverseStayOperation = async (movementId: string, reason: string): Promise<any> => {
    const { data, error } = await operationalDb.rpc('vulo_reverse_stay_operation', {
      p_movement_id: movementId,
      p_motivo: reason,
    });
    if (error) throw error;
    return data;
  };
  getStayMovements = async (reservaId: string): Promise<any[]> => {
    const { data, error } = await operationalDb.from('estancia_movimientos').select('*')
      .eq('reserva_id', reservaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };
  getStayGuests = async (reservaId: string): Promise<any[]> => {
    const { data, error } = await operationalDb.from('reserva_huespedes').select('*')
      .eq('reserva_id', reservaId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  };
  getStayAccounts = async (reservaId: string): Promise<any[]> => {
    const { data, error } = await operationalDb.from('cuentas_estancia').select('*')
      .eq('reserva_id', reservaId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  };
  createReservationBundle = async (input: {
    reserva: any;
    cliente?: any;
    cargos?: any[];
    pagos?: any[];
    entregables?: any[];
    checkin?: boolean;
  }): Promise<any> => {
    const { data, error } = await (supabase as any).rpc('create_reservation_bundle', {
      p_reserva: { ...input.reserva, hotel_id: this.hid() },
      p_cliente: input.cliente || null,
      p_cargos: input.cargos || [],
      p_pagos: input.pagos || [],
      p_entregables: input.entregables || [],
      p_checkin: Boolean(input.checkin),
    });
    if (error) throw error;
    void registrarAuditoria({
      accion: 'crear', entidad: 'reserva', entidad_id: data?.id,
      descripcion: `Reserva ${data?.numero_reserva || ''} (${data?.fecha_checkin} → ${data?.fecha_checkout})`,
      datos_despues: data,
    });
    return data;
  };
  completeCheckin = async (id: string, habitacionId: string, pagos: any[] = []): Promise<any> => {
    const { data, error } = await (supabase as any).rpc('complete_reservation_checkin', {
      p_reserva_id: id,
      p_habitacion_id: habitacionId,
      p_pagos: pagos,
    });
    if (error) throw error;
    return data;
  };
  checkin = async (id: string, habitacionId?: string): Promise<any> => {
    if (!habitacionId) {
      const { data: reserva, error } = await supabase.from('reservas').select('habitacion_id').eq('id', id).maybeSingle();
      if (error) throw error;
      habitacionId = reserva?.habitacion_id;
    }
    if (!habitacionId) throw new Error('Selecciona una habitación antes de hacer check-in');
    return this.completeCheckin(id, habitacionId, []);
  };
  completeCheckout = async (id: string, pago?: any): Promise<any> => {
    const { data, error } = await (supabase as any).rpc('complete_reservation_checkout', {
      p_reserva_id: id,
      p_pago: pago || null,
    });
    if (error) throw error;
    return data;
  };
  checkout = async (id: string): Promise<any> => {
    return this.completeCheckout(id);
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
  getPagos = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('pagos').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false });
    if (params?.fecha) q = q.gte('fecha', params.fecha).lt('fecha', addCalendarDays(params.fecha, 1));
    if (params?.fecha_desde) q = q.gte('fecha', params.fecha_desde);
    if (params?.fecha_hasta) q = q.lt('fecha', addCalendarDays(params.fecha_hasta, 1));
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };
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
      mensaje: `${r?.metodo_pago || 'Pago'} por ${formatCurrency(r?.monto || 0)}`,
      url: r?.reserva_id ? `/reservas` : undefined,
    });
    return r;
  };
  deletePago = async (id: string): Promise<any> => { const { error } = await supabase.from('pagos').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Cargos -------
  getCargosReserva = async (reservaId: string): Promise<any> => { const { data } = await supabase.from('cargos').select('*').eq('reserva_id', reservaId).order('fecha', { ascending: false }); return data || []; };
  createCargo = async (data: any): Promise<any> => {
    const subtotal = Number(data.cantidad || 1) * Number(data.precio_unitario || 0);
    const total = subtotal + Number(data.impuesto || 0);
    const { data: r, error } = await supabase.from('cargos').insert({ ...data, subtotal, total, hotel_id: this.hid() }).select().single();
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
    // Sincronizar: crear tareas pendientes para habitaciones sucias/en limpieza sin tarea activa
    try { await this.sincronizarTareasLimpiezaDesdeHabitaciones(); } catch { /* noop */ }
    const key = `tareas_limpieza:${this.hid()}:${params?.estado || 'all'}`;
    return withOfflineCache(key, async () => {
      let q = supabase.from('tareas_limpieza').select('*, habitaciones(numero, tipo:tipos_habitacion(nombre))').eq('hotel_id', this.hid()).order('fecha', { ascending: false });
      if (params?.estado) q = q.eq('estado', params.estado);
      const { data } = await q;
      return (data || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero }));
    });
  };
  sincronizarTareasLimpiezaDesdeHabitaciones = async (): Promise<void> => {
    const hid = this.hid();
    if (!hid) return;
    const { data: habs } = await supabase
      .from('habitaciones')
      .select('id, estado_limpieza')
      .eq('hotel_id', hid)
      .in('estado_limpieza', ['Sucia', 'EnLimpieza', 'En Limpieza']);
    if (!habs?.length) return;
    const { data: tareasActivas } = await supabase
      .from('tareas_limpieza')
      .select('habitacion_id, estado')
      .eq('hotel_id', hid)
      .in('estado', ['Pendiente', 'EnProceso', 'En Proceso', 'Completada']);
    const yaConTarea = new Set((tareasActivas || []).map((t: any) => t.habitacion_id));
    const faltantes = habs.filter((h: any) => !yaConTarea.has(h.id));
    if (!faltantes.length) return;
    const hoy = todayLocal();
    const nuevas = faltantes.map((h: any) => ({
      hotel_id: hid,
      habitacion_id: h.id,
      fecha: hoy,
      tipo: 'Limpieza',
      prioridad: 'Normal',
      estado: 'Pendiente',
    }));
    await supabase.from('tareas_limpieza').insert(nuevas);
    try {
      const prefix = 'hospedapp:cache:';
      Object.keys(localStorage).filter(k => k.startsWith(prefix) && k.includes(':tareas_limpieza:')).forEach(k => localStorage.removeItem(k));
    } catch { /* noop */ }
  };
  getTareasLimpiezaHoy = async (): Promise<any> => {
    const today = todayLocal();
    const { data } = await supabase.from('tareas_limpieza').select('*, habitaciones(numero)').eq('hotel_id', this.hid()).eq('fecha', today);
    return (data || []).map((t: any) => ({ ...t, habitacion_numero: t.habitaciones?.numero }));
  };
  createTareaLimpieza = async (data: any): Promise<any> => { const { data: r, error } = await supabase.from('tareas_limpieza').insert({ ...data, hotel_id: this.hid() }).select().single(); if (error) throw error; return r; };
  updateEstadoLimpieza = async (id: string, estado: string): Promise<any> => {
    const { data: r, error } = await supabase.from('tareas_limpieza').update({ estado }).eq('id', id).select().single();
    if (error) throw error;
    // Reflejar el estado en la habitación asociada
    try {
      if (r?.habitacion_id) {
        const { data: hab } = await supabase.from('habitaciones').select('estado_habitacion').eq('id', r.habitacion_id).maybeSingle();
        const patch: any = {};
        if (estado === 'EnProceso' || estado === 'En Proceso') {
          patch.estado_limpieza = 'EnLimpieza';
        } else if (estado === 'Completada' || estado === 'Verificada') {
          patch.estado_limpieza = 'Limpia';
          // Si la habitación no está ocupada/reservada/mantenimiento, marcarla Disponible
          if (hab && !['Ocupada', 'Reservada', 'Mantenimiento', 'FueraDeServicio'].includes(hab.estado_habitacion)) {
            patch.estado_habitacion = 'Disponible';
          }
        } else if (estado === 'Pendiente') {
          patch.estado_limpieza = 'Sucia';
        }
        if (Object.keys(patch).length) {
          await supabase.from('habitaciones').update(patch).eq('id', r.habitacion_id);
        }
      }
    } catch { /* noop */ }
    try {
      const prefix = 'hospedapp:cache:';
      Object.keys(localStorage).filter(k => k.startsWith(prefix) && (k.includes(':tareas_limpieza:') || k.includes(':habitaciones:'))).forEach(k => localStorage.removeItem(k));
    } catch { /* noop */ }
    return r;
  };
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
    const tipo = String(data.tipo || '').toLowerCase();
    const stockNuevo = tipo === 'salida' ? stockAnterior - cantidad : stockAnterior + cantidad;
    await supabase.from('productos').update({ stock_actual: stockNuevo }).eq('id', id);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: m, error } = await supabase.from('movimientos_inventario').insert({
      producto_id: id,
      ...data,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      usuario_id: user?.id ?? null,
    }).select().single();
    if (error) throw error; return m;
  };
  getMovimientosProducto = async (id: string): Promise<any> => { const { data } = await supabase.from('movimientos_inventario').select('*').eq('producto_id', id).order('created_at', { ascending: false }); return data || []; };
  // Lista todos los movimientos del hotel actual (a través de productos)
  getMovimientosInventario = async (limit = 200): Promise<any[]> => {
    const { data: prods } = await supabase.from('productos').select('id, nombre, codigo').eq('hotel_id', this.hid());
    const ids = (prods || []).map((p: any) => p.id);
    if (!ids.length) return [];
    const map: Record<string, any> = {};
    (prods || []).forEach((p: any) => { map[p.id] = p; });
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .in('producto_id', ids)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const userIds = Array.from(new Set((data || []).map((m: any) => m.usuario_id).filter(Boolean)));
    const users: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, nombre, email').in('id', userIds);
      (profs || []).forEach((p: any) => { users[p.id] = p.nombre || p.email || p.id; });
    }
    return (data || []).map((m: any) => ({
      ...m,
      producto_nombre: map[m.producto_id]?.nombre,
      producto_codigo: map[m.producto_id]?.codigo,
      usuario_nombre: m.usuario_id ? users[m.usuario_id] || m.usuario_id : null,
    }));
  };
  // Ajusta el stock a un valor absoluto y registra el movimiento
  ajustarStockAbsoluto = async (productoId: string, stockReal: number, motivo?: string): Promise<any> => {
    const { data: prod } = await supabase.from('productos').select('stock_actual').eq('id', productoId).maybeSingle();
    const anterior = Number(prod?.stock_actual || 0);
    const nuevo = Number(stockReal) || 0;
    const diff = nuevo - anterior;
    if (diff === 0) return null;
    await supabase.from('productos').update({ stock_actual: nuevo }).eq('id', productoId);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: m, error } = await supabase.from('movimientos_inventario').insert({
      producto_id: productoId,
      tipo: diff > 0 ? 'Entrada' : 'Salida',
      cantidad: Math.abs(diff),
      stock_anterior: anterior,
      stock_nuevo: nuevo,
      motivo: motivo || 'Ajuste de stock',
      usuario_id: user?.id ?? null,
    }).select().single();
    if (error) throw error;
    return m;
  };

  // ------- Gastos -------
  getGastos = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('gastos').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false });
    if (params?.categoria) q = q.eq('categoria', params.categoria);
    if (params?.fecha_desde) q = q.gte('fecha', params.fecha_desde);
    if (params?.fecha_hasta) q = q.lte('fecha', params.fecha_hasta);
    const { data, error } = await q;
    if (error) throw error;
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
  getCompras = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('compras').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false });
    if (params?.fecha_desde) q = q.gte('fecha', params.fecha_desde);
    if (params?.fecha_hasta) q = q.lte('fecha', params.fecha_hasta);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };
  getCompra = async (id: string): Promise<any> => {
    const { data } = await supabase
      .from('compras')
      .select('*, compras_detalle(*)')
      .eq('id', id)
      .maybeSingle();
    if (!data) return data;
    const detalle = (data as any).compras_detalle ?? [];
    return { ...(data as any), detalle };
  };
  createCompra = async (data: any): Promise<any> => {
    // Acepta tanto `detalles` como `detalle` para compatibilidad.
    const { detalles, detalle, ...header } = data;
    const items = (detalles ?? detalle) as any[] | undefined;
    const hotel_id = this.hid();

    // Resolver nombre del proveedor si solo viene el id
    let proveedor_nombre = header.proveedor_nombre as string | undefined;
    if (!proveedor_nombre && header.proveedor_id) {
      const { data: prov } = await supabase
        .from('proveedores')
        .select('nombre')
        .eq('id', header.proveedor_id)
        .maybeSingle();
      proveedor_nombre = prov?.nombre;
    }

    // Generar folio secuencial OC-000001 por hotel si no viene
    let numero_orden = header.numero_orden as string | undefined;
    if (!numero_orden) {
      const { data: ult } = await supabase
        .from('compras')
        .select('numero_orden')
        .eq('hotel_id', hotel_id)
        .like('numero_orden', 'OC-%')
        .order('numero_orden', { ascending: false })
        .limit(1);
      const ultimo = ult?.[0]?.numero_orden as string | undefined;
      const ultimoNum = ultimo ? parseInt(ultimo.replace(/\D/g, ''), 10) || 0 : 0;
      numero_orden = `OC-${String(ultimoNum + 1).padStart(6, '0')}`;
    }

    const { data: r, error } = await supabase
      .from('compras')
      .insert({ ...header, proveedor_nombre, numero_orden, hotel_id })
      .select()
      .single();
    if (error) throw error;
    if (Array.isArray(items) && items.length) {
      // Resolver nombres faltantes consultando productos
      const idsSinNombre = items
        .filter((d: any) => !d.producto_nombre && d.producto_id)
        .map((d: any) => d.producto_id);
      const nombresMap: Record<string, string> = {};
      if (idsSinNombre.length) {
        const { data: prods } = await supabase
          .from('productos')
          .select('id, nombre')
          .in('id', idsSinNombre);
        (prods || []).forEach((p: any) => { nombresMap[p.id] = p.nombre; });
      }
      const rows = items.map((d: any) => ({
        compra_id: r.id,
        producto_id: d.producto_id ?? null,
        producto_nombre: d.producto_nombre ?? (d.producto_id ? nombresMap[d.producto_id] : null) ?? null,
        cantidad: Number(d.cantidad) || 0,
        precio_unitario: Number(d.precio_unitario) || 0,
        total: (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0),
      }));
      await supabase.from('compras_detalle').insert(rows);
      // Incrementar stock de productos comprados y registrar movimientos
      const idsProd = items.map((d: any) => d.producto_id).filter(Boolean);
      if (idsProd.length) {
        const { data: prods } = await supabase
          .from('productos')
          .select('id, stock_actual')
          .in('id', idsProd);
        const stockMap: Record<string, number> = {};
        (prods || []).forEach((p: any) => { stockMap[p.id] = Number(p.stock_actual) || 0; });
        const movs: any[] = [];
        for (const d of items) {
          if (!d.producto_id) continue;
          const cant = Number(d.cantidad) || 0;
          if (!cant) continue;
          const anterior = stockMap[d.producto_id] ?? 0;
          const nuevo = anterior + cant;
          stockMap[d.producto_id] = nuevo;
          await supabase.from('productos').update({ stock_actual: nuevo }).eq('id', d.producto_id);
          movs.push({
            producto_id: d.producto_id,
            tipo: 'Entrada',
            cantidad: cant,
            stock_anterior: anterior,
            stock_nuevo: nuevo,
            motivo: 'Compra',
            referencia: numero_orden,
          });
        }
        if (movs.length) await supabase.from('movimientos_inventario').insert(movs);
      }
    }
    return r;
  };
  updateCompra = async (id: string, data: any): Promise<any> => { const { data: r, error } = await supabase.from('compras').update(data).eq('id', id).select().single(); if (error) throw error; return r; };
  updateEstadoCompra = async (id: string, estado: string): Promise<any> => { const { data: r, error } = await supabase.from('compras').update({ estado }).eq('id', id).select().single(); if (error) throw error; return r; };
  deleteCompra = async (id: string): Promise<any> => { const { error } = await supabase.from('compras').delete().eq('id', id); if (error) throw error; return { ok: true }; };

  // ------- Pagos a Proveedores (compras) -------
  getPagosCompra = async (compraId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('pagos_compras' as any)
      .select('*')
      .eq('compra_id', compraId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return (data as any[]) || [];
  };
  createPagoCompra = async (data: { compra_id: string; monto: number; metodo_pago?: string; referencia?: string; notas?: string; fecha?: string; }): Promise<any> => {
    const { data: r, error } = await supabase
      .from('pagos_compras' as any)
      .insert({
        hotel_id: this.hid(),
        compra_id: data.compra_id,
        monto: Number(data.monto),
        metodo_pago: data.metodo_pago || 'Efectivo',
        referencia: data.referencia || null,
        notas: data.notas || null,
        fecha: data.fecha || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return r;
  };
  deletePagoCompra = async (id: string): Promise<any> => {
    const { error } = await supabase.from('pagos_compras' as any).delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  };

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
  getTransacciones = async (params?: Record<string, string>): Promise<any> => {
    let q = supabase.from('transacciones').select('*').eq('hotel_id', this.hid()).order('fecha', { ascending: false });
    if (params?.fecha_desde) q = q.gte('fecha', params.fecha_desde);
    if (params?.fecha_hasta) q = q.lt('fecha', addCalendarDays(params.fecha_hasta, 1));
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };
  getTransaccion = async (id: string): Promise<any> => { const { data } = await supabase.from('transacciones').select('*').eq('id', id).maybeSingle(); return data; };

  // ------- Hotel -------
  getHotel = async (): Promise<any> => {
    const { data } = await supabase.from('hotels').select('*').eq('id', this.hid()).maybeSingle();
    if ((data as any)?.timezone) setHotelTimezone((data as any).timezone);
    if (data) setHotelCurrency({
      codigo: (data as any).moneda_codigo,
      simbolo: (data as any).moneda_simbolo,
      locale: (data as any).moneda_locale,
    });
    return data;
  };
  updateHotel = async (data: any): Promise<any> => {
    const { data: r, error } = await supabase.from('hotels').update(data).eq('id', this.hid()).select().single();
    if (error) throw error;
    if ((r as any)?.timezone) setHotelTimezone((r as any).timezone);
    if (r) setHotelCurrency({
      codigo: (r as any).moneda_codigo,
      simbolo: (r as any).moneda_simbolo,
      locale: (r as any).moneda_locale,
    });
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
    const todayParts = parseCalendarParts(new Intl.DateTimeFormat('en-CA').format(new Date()));
    const todayEpoch = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
    return ((subs as any[]) || []).map((s: any) => {
      const plan = ((planes as any[]) || []).find((p: any) => p.id === s.plan_id);
      const fin = parseCalendarParts(String(s.fecha_fin).slice(0, 10));
      const dias = Math.ceil((Date.UTC(fin.year, fin.month - 1, fin.day) - todayEpoch) / 86400000);
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
    const base = cur ? String((cur as any).fecha_fin).slice(0, 10) : new Intl.DateTimeFormat('en-CA').format(new Date());
    const { error } = await supabase.from('suscripciones' as any).update({ fecha_fin: addCalendarDays(base, dias) }).eq('id', id);
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
    // RPC SECURITY DEFINER — valida is_superadmin() en el backend.
    // Antes se leía la vista `v_metricas_plataforma`, que bypasseaba RLS
    // y exponía métricas globales a cualquier usuario autenticado.
    const { data, error } = await supabase.rpc('get_metricas_plataforma' as any);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row || {};
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
        // Persistimos exactamente lo que envía la UI. `canAccess()` sigue dando
        // bypass a Admin, pero no forzamos el valor en BD para evitar
        // inconsistencias entre lo mostrado y lo guardado.
        rows.push({ hotel_id: hid, rol, modulo, permitido: (roles || []).includes(rol) });
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
  getUsuarios = async (): Promise<any> => {
    const { data: profiles } = await supabase.from('profiles').select('*').eq('hotel_id', this.hid());
    const list = profiles || [];
    if (list.length === 0) return [];
    const ids = list.map((u: any) => u.id);
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role').in('user_id', ids);
    const rolesByUser: Record<string, string[]> = {};
    (rolesData || []).forEach((r: any) => {
      (rolesByUser[r.user_id] ||= []).push(r.role);
    });
    // Prioridad: SuperAdmin > Admin > Gerente > Mantenimiento > Housekeeping > Recepcion
    const prio = ['SuperAdmin', 'Admin', 'Gerente', 'Mantenimiento', 'Housekeeping', 'Recepcion'];
    return list.map((u: any) => {
      const rs = rolesByUser[u.id] || [];
      const rol = prio.find((p) => rs.includes(p)) || rs[0] || 'Recepcion';
      return { ...u, rol, roles: rs };
    });
  };
  getUsuario = async (id: string): Promise<any> => { const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle(); return data; };
  createUsuario = async (data: any): Promise<any> => {
    const { data: result, error } = await supabase.functions.invoke('create-user', { body: data });
    if (error) {
      // Intentar extraer mensaje del edge function
      let msg = error.message || 'No se pudo crear el usuario';
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) msg = body.error;
        }
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    if ((result as any)?.error) throw new Error((result as any).error);
    return result;
  };
  updateUsuario = async (id: string, data: any): Promise<any> => {
    const { data: result, error } = await supabase.functions.invoke('update-user', { body: { id, ...data } });
    if (error) {
      let msg = error.message || 'No se pudo actualizar el usuario';
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) msg = body.error;
        }
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    if ((result as any)?.error) throw new Error((result as any).error);
    return result;
  };
  deleteUsuario = async (id: string): Promise<any> => {
    const { data: result, error } = await supabase.functions.invoke('delete-user', { body: { id } });
    if (error) {
      let msg = error.message || 'No se pudo eliminar el usuario';
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) msg = body.error;
        }
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    if ((result as any)?.error) throw new Error((result as any).error);
    return result;
  };
  getRoles = async (): Promise<any> => ['Admin', 'Recepcion', 'Housekeeping', 'Mantenimiento', 'Gerente'];

  publicRequest = async <T>(_endpoint: string, _method = 'GET', _body?: any): Promise<T> => {
    throw new Error('publicRequest no soportado en modo Supabase.');
  };
}

export const api = new ApiClient();
export default api;
