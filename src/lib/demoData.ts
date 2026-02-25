/**
 * Demo data provider - returns mock data when backend is unavailable.
 * Maps API endpoints to realistic sample data.
 */

import { mockHabitaciones, mockTiposHabitacion, mockClientes, mockReservas, mockProductos, mockTareasLimpieza, getDashboardStats, getCheckinsHoy, getCheckoutsHoy, getVentasHoy, getTareasCriticas } from '@/data/mockData';

// Convert mock habitaciones to API format
function habitacionesToApi() {
  return mockHabitaciones.map(h => ({
    id: h.id,
    tipo_id: h.tipoId,
    tipo_nombre: h.tipo.nombre,
    tipo_codigo: h.tipo.codigo,
    numero: h.numero,
    piso: h.piso,
    estado_habitacion: h.estadoHabitacion,
    estado_limpieza: h.estadoLimpieza,
    estado_mantenimiento: h.estadoMantenimiento,
    precio_base: h.tipo.precioBase,
    capacidad_maxima: h.tipo.capacidadMaxima,
  }));
}

function tiposToApi() {
  return mockTiposHabitacion.map(t => ({
    id: t.id,
    codigo: t.codigo,
    nombre: t.nombre,
    descripcion: t.descripcion,
    capacidad_adultos: t.capacidadAdultos,
    capacidad_ninos: t.capacidadNinos,
    capacidad_maxima: t.capacidadMaxima,
    precio_base: t.precioBase,
    precio_persona_extra: t.precioPersonaExtra,
    amenidades: t.amenidades,
  }));
}

function clientesToApi() {
  return mockClientes.slice(0, 50).map(c => ({
    id: c.id,
    tipo_cliente: c.tipoCliente,
    nombre: c.nombre,
    apellido_paterno: c.apellidoPaterno,
    apellido_materno: c.apellidoMaterno || '',
    email: c.email,
    telefono: c.telefono,
    tipo_documento: c.tipoDocumento,
    numero_documento: c.numeroDocumento,
    nacionalidad: c.nacionalidad,
    es_vip: c.esVip,
    nivel_lealtad: c.nivelLealtad,
    total_estancias: c.totalEstancias,
    created_at: c.createdAt.toISOString(),
  }));
}

function reservasToApi() {
  return mockReservas.slice(0, 50).map(r => ({
    id: r.id,
    numero_reserva: r.numeroReserva,
    cliente_id: r.clienteId,
    cliente_nombre: `${r.cliente.nombre} ${r.cliente.apellidoPaterno}`,
    habitacion_id: r.habitacionId,
    habitacion_numero: r.habitacion?.numero || '',
    tipo_habitacion_id: r.tipoHabitacionId,
    tipo_habitacion_nombre: r.tipoHabitacion.nombre,
    fecha_checkin: r.fechaCheckin.toISOString(),
    fecha_checkout: r.fechaCheckout.toISOString(),
    adultos: r.adultos,
    ninos: r.ninos,
    noches: r.noches,
    tarifa_noche: r.tarifaNoche,
    subtotal: r.subtotalHospedaje,
    impuestos: r.totalImpuestos,
    total: r.total,
    total_pagado: r.totalPagado,
    saldo_pendiente: r.saldoPendiente,
    estado: r.estado,
    created_at: r.createdAt.toISOString(),
  }));
}

function dashboardStatsToApi() {
  const s = getDashboardStats();
  return {
    ocupadas: s.ocupadas,
    disponibles: s.disponibles,
    pendientes_limpieza: s.limpieza,
    pendientes_mantenimiento: s.mantenimiento,
    total_habitaciones: s.total,
    ocupacion_porcentaje: s.ocupacionPorcentaje,
  };
}

function checkinsHoyToApi() {
  return getCheckinsHoy().map(r => ({
    id: r.id,
    numero_reserva: r.numeroReserva,
    cliente_nombre: `${r.cliente.nombre} ${r.cliente.apellidoPaterno}`,
    habitacion_numero: r.habitacion?.numero || 'Por asignar',
    tipo_habitacion: r.tipoHabitacion.nombre,
    hora_llegada: r.horaLlegada || '15:00',
    estado: r.estado,
  }));
}

function checkoutsHoyToApi() {
  return getCheckoutsHoy().map(r => ({
    id: r.id,
    numero_reserva: r.numeroReserva,
    cliente_nombre: `${r.cliente.nombre} ${r.cliente.apellidoPaterno}`,
    habitacion_numero: r.habitacion?.numero || '',
    saldo_pendiente: r.saldoPendiente,
    estado: r.estado,
  }));
}

/**
 * Matches an endpoint pattern and returns mock data, or null if no match.
 */
export function getDemoResponse(endpoint: string): any | null {
  // Dashboard
  if (endpoint === '/dashboard/stats') return dashboardStatsToApi();
  if (endpoint === '/dashboard/checkins-hoy') return checkinsHoyToApi();
  if (endpoint === '/dashboard/checkouts-hoy') return checkoutsHoyToApi();
  if (endpoint === '/dashboard/ventas-hoy') return getVentasHoy();
  if (endpoint === '/dashboard/tareas-criticas') {
    const tareas = getTareasCriticas();
    return { limpieza: tareas.map(t => ({ id: t.id, habitacion_numero: t.habitacion.numero, tipo: t.tipo, prioridad: t.prioridad, estado: t.estado, asignado_nombre: t.asignadoNombre })), mantenimiento: [] };
  }
  if (endpoint === '/dashboard/ocupacion-tipo') {
    return mockTiposHabitacion.map(t => ({ tipo: t.nombre, ocupadas: Math.floor(Math.random() * 8), total: 10 }));
  }
  if (endpoint === '/dashboard/ingresos-mes') {
    return { total: 485000, hospedaje: 320000, alimentos: 95000, servicios: 70000 };
  }

  // Habitaciones
  if (endpoint.startsWith('/habitaciones/disponibles')) return habitacionesToApi().filter(h => h.estado_habitacion === 'Disponible');
  if (endpoint === '/habitaciones' || endpoint.startsWith('/habitaciones?')) return habitacionesToApi();
  if (endpoint.match(/^\/habitaciones\/[\w-]+$/)) return habitacionesToApi()[0];

  // Tipos habitación
  if (endpoint === '/tipos-habitacion') return tiposToApi();

  // Clientes
  if (endpoint === '/clientes' || endpoint.startsWith('/clientes?')) return clientesToApi();
  if (endpoint.match(/^\/clientes\/[\w-]+\/reservas$/)) return reservasToApi().slice(0, 3);
  if (endpoint.match(/^\/clientes\/[\w-]+$/)) return clientesToApi()[0];

  // Reservas
  if (endpoint === '/reservas/checkins-hoy') return checkinsHoyToApi();
  if (endpoint === '/reservas/checkouts-hoy') return checkoutsHoyToApi();
  if (endpoint === '/reservas' || endpoint.startsWith('/reservas?')) return reservasToApi();
  if (endpoint.match(/^\/reservas\/[\w-]+$/)) return reservasToApi()[0];

  // Pagos
  if (endpoint === '/pagos' || endpoint.startsWith('/pagos?')) return [];
  if (endpoint.match(/^\/pagos\/reserva\//)) return [];

  // Cargos
  if (endpoint.match(/^\/cargos\/reserva\//)) return [];
  if (endpoint.match(/^\/cargos\/habitacion\//)) return [];

  // Conceptos cargo
  if (endpoint === '/conceptos-cargo') return [{ id: '1', nombre: 'Room Service', precio: 50 }, { id: '2', nombre: 'Minibar', precio: 0 }];

  // Entregables
  if (endpoint === '/entregables' || endpoint.startsWith('/entregables/reserva/')) return [];

  // Limpieza
  if (endpoint === '/limpieza' || endpoint.startsWith('/limpieza?') || endpoint === '/limpieza/hoy') {
    return mockTareasLimpieza.map(t => ({
      id: t.id,
      habitacion_id: t.habitacionId,
      habitacion_numero: t.habitacion.numero,
      fecha: t.fecha.toISOString(),
      tipo: t.tipo,
      prioridad: t.prioridad,
      estado: t.estado,
      asignado_a: t.asignadoA,
      asignado_nombre: t.asignadoNombre,
      notas: t.notas,
    }));
  }

  // Mantenimiento
  if (endpoint === '/mantenimiento' || endpoint.startsWith('/mantenimiento?') || endpoint === '/mantenimiento/pendientes') return [];

  // Productos
  if (endpoint === '/productos' || endpoint.startsWith('/productos?')) {
    return mockProductos.map(p => ({ ...p, precio_venta: p.precioVenta, stock_actual: p.stockActual }));
  }
  if (endpoint === '/productos/categorias') {
    return [...new Set(mockProductos.map(p => p.categoria))].map(c => ({ id: c, nombre: c }));
  }

  // Usuarios
  if (endpoint === '/usuarios') return [
    { id: 'demo-001', nombre: 'Admin Demo', email: 'admin@hotel.com', rol: 'Admin', activo: true },
    { id: 'demo-002', nombre: 'María López', email: 'maria@hotel.com', rol: 'Recepcionista', activo: true },
    { id: 'demo-003', nombre: 'Juan Pérez', email: 'juan@hotel.com', rol: 'Mantenimiento', activo: true },
  ];

  // Gastos
  if (endpoint === '/gastos' || endpoint.startsWith('/gastos?')) return [];
  if (endpoint === '/gastos/categorias') return ['Operación', 'Nómina', 'Servicios', 'Insumos'];
  if (endpoint.startsWith('/gastos/resumen')) return { total: 0, por_categoria: {} };

  // Proveedores
  if (endpoint === '/proveedores' || endpoint.startsWith('/proveedores?')) return [];

  // Suscripción - return "no subscription" marker
  if (endpoint.startsWith('/saas/mi-suscripcion')) return { dias_restantes: -999 };

  return null;
}
