// Hotel mock data for development
// This will be replaced with Supabase calls later

export interface Hotel {
  id: string;
  nombre: string;
  razonSocial: string;
  rfc: string;
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  telefono: string;
  email: string;
  horaCheckin: string;
  horaCheckout: string;
  estrellas: number;
}

export interface TipoHabitacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  capacidadAdultos: number;
  capacidadNinos: number;
  capacidadMaxima: number;
  precioBase: number;
  precioPersonaExtra: number;
  amenidades: string[];
}

export interface Habitacion {
  id: string;
  tipoId: string;
  tipo: TipoHabitacion;
  numero: string;
  piso: number;
  estadoHabitacion: 'Disponible' | 'Ocupada' | 'Reservada' | 'Bloqueada';
  estadoLimpieza: 'Limpia' | 'Sucia' | 'EnProceso' | 'Inspeccion';
  estadoMantenimiento: 'OK' | 'Pendiente' | 'EnProceso' | 'FueraServicio';
}

export interface Cliente {
  id: string;
  tipoCliente: 'Persona' | 'Empresa';
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  email: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nacionalidad: string;
  esVip: boolean;
  nivelLealtad: 'Bronce' | 'Plata' | 'Oro' | 'Platino' | 'Diamante';
  totalEstancias: number;
  createdAt: Date;
}

export interface Reserva {
  id: string;
  numeroReserva: string;
  clienteId: string;
  cliente: Cliente;
  habitacionId?: string;
  habitacion?: Habitacion;
  tipoHabitacionId: string;
  tipoHabitacion: TipoHabitacion;
  fechaCheckin: Date;
  fechaCheckout: Date;
  horaLlegada?: string;
  adultos: number;
  ninos: number;
  noches: number;
  tarifaNoche: number;
  subtotalHospedaje: number;
  totalImpuestos: number;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: 'Pendiente' | 'Confirmada' | 'CheckIn' | 'CheckOut' | 'Cancelada' | 'NoShow';
  checkinRealizado: boolean;
  checkoutRealizado: boolean;
  solicitudesEspeciales?: string;
  createdAt: Date;
}

export interface Pago {
  id: string;
  reservaId: string;
  numeroPago: string;
  fecha: Date;
  monto: number;
  metodoPago: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Deposito';
  referencia?: string;
  tipo: 'Anticipo' | 'Abono' | 'Liquidacion' | 'Reembolso';
  notas?: string;
}

export interface TareaLimpieza {
  id: string;
  habitacionId: string;
  habitacion: Habitacion;
  fecha: Date;
  tipo: 'Checkout' | 'Ocupada' | 'Profunda' | 'Inspeccion';
  prioridad: 'Baja' | 'Normal' | 'Alta' | 'Urgente';
  estado: 'Pendiente' | 'EnProceso' | 'Completada' | 'Verificada';
  asignadoA?: string;
  asignadoNombre?: string;
  horaInicio?: Date;
  horaFin?: Date;
  notas?: string;
}

export interface Producto {
  id: string;
  categoria: string;
  codigo: string;
  nombre: string;
  precioVenta: number;
  stockActual: number;
  imagen?: string;
}

// Mock hotel
export const mockHotel: Hotel = {
  id: 'htl-001',
  nombre: 'Hotel Vista Mar',
  razonSocial: 'Hotelera Vista Mar S.A. de C.V.',
  rfc: 'HVM120315XY9',
  direccion: 'Av. Costera Miguel Alemán 123',
  ciudad: 'Acapulco',
  estado: 'Guerrero',
  pais: 'México',
  telefono: '+52 744 123 4567',
  email: 'reservas@hotelvistamar.com',
  horaCheckin: '15:00',
  horaCheckout: '12:00',
  estrellas: 4,
};

// Mock room types
export const mockTiposHabitacion: TipoHabitacion[] = [
  {
    id: 'tipo-001',
    codigo: 'STD',
    nombre: 'Estándar',
    descripcion: 'Habitación estándar con cama matrimonial',
    capacidadAdultos: 2,
    capacidadNinos: 1,
    capacidadMaxima: 3,
    precioBase: 1200,
    precioPersonaExtra: 300,
    amenidades: ['WiFi', 'TV', 'A/C', 'Baño privado'],
  },
  {
    id: 'tipo-002',
    codigo: 'SUP',
    nombre: 'Superior',
    descripcion: 'Habitación superior con vista parcial al mar',
    capacidadAdultos: 2,
    capacidadNinos: 2,
    capacidadMaxima: 4,
    precioBase: 1800,
    precioPersonaExtra: 400,
    amenidades: ['WiFi', 'TV', 'A/C', 'Baño privado', 'Minibar', 'Vista al mar'],
  },
  {
    id: 'tipo-003',
    codigo: 'DLX',
    nombre: 'Deluxe',
    descripcion: 'Habitación deluxe con balcón y vista al mar',
    capacidadAdultos: 2,
    capacidadNinos: 2,
    capacidadMaxima: 4,
    precioBase: 2500,
    precioPersonaExtra: 500,
    amenidades: ['WiFi', 'TV', 'A/C', 'Baño privado', 'Minibar', 'Vista al mar', 'Balcón', 'Jacuzzi'],
  },
  {
    id: 'tipo-004',
    codigo: 'STE',
    nombre: 'Suite',
    descripcion: 'Suite con sala de estar y terraza privada',
    capacidadAdultos: 2,
    capacidadNinos: 2,
    capacidadMaxima: 4,
    precioBase: 4000,
    precioPersonaExtra: 600,
    amenidades: ['WiFi', 'TV', 'A/C', 'Baño privado', 'Minibar', 'Vista al mar', 'Terraza', 'Jacuzzi', 'Sala de estar'],
  },
  {
    id: 'tipo-005',
    codigo: 'FAM',
    nombre: 'Familiar',
    descripcion: 'Habitación familiar con dos camas dobles',
    capacidadAdultos: 4,
    capacidadNinos: 2,
    capacidadMaxima: 6,
    precioBase: 2800,
    precioPersonaExtra: 350,
    amenidades: ['WiFi', 'TV', 'A/C', 'Baño privado', 'Minibar', '2 camas dobles'],
  },
];

// Generate mock rooms
export const mockHabitaciones: Habitacion[] = [];
const estadosHabitacion: Habitacion['estadoHabitacion'][] = ['Disponible', 'Ocupada', 'Reservada', 'Disponible', 'Ocupada'];
const estadosLimpieza: Habitacion['estadoLimpieza'][] = ['Limpia', 'Limpia', 'Sucia', 'Limpia', 'EnProceso'];
const estadosMant: Habitacion['estadoMantenimiento'][] = ['OK', 'OK', 'OK', 'Pendiente', 'OK'];

for (let piso = 1; piso <= 5; piso++) {
  for (let num = 1; num <= 10; num++) {
    const numero = `${piso}${num.toString().padStart(2, '0')}`;
    const tipoIndex = (piso - 1) % mockTiposHabitacion.length;
    const randomIndex = Math.floor(Math.random() * 5);
    
    mockHabitaciones.push({
      id: `hab-${numero}`,
      tipoId: mockTiposHabitacion[tipoIndex].id,
      tipo: mockTiposHabitacion[tipoIndex],
      numero,
      piso,
      estadoHabitacion: estadosHabitacion[randomIndex],
      estadoLimpieza: estadosLimpieza[randomIndex],
      estadoMantenimiento: estadosMant[randomIndex],
    });
  }
}

// Generate mock clients
const nombres = ['Carlos', 'María', 'José', 'Ana', 'Luis', 'Carmen', 'Miguel', 'Laura', 'Jorge', 'Patricia'];
const apellidos = ['García', 'Hernández', 'López', 'Martínez', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];

export const mockClientes: Cliente[] = [];
for (let i = 0; i < 100; i++) {
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellidoP = apellidos[Math.floor(Math.random() * apellidos.length)];
  const apellidoM = apellidos[Math.floor(Math.random() * apellidos.length)];
  const estancias = Math.floor(Math.random() * 20);
  
  mockClientes.push({
    id: `cli-${(i + 1).toString().padStart(3, '0')}`,
    tipoCliente: Math.random() > 0.9 ? 'Empresa' : 'Persona',
    nombre,
    apellidoPaterno: apellidoP,
    apellidoMaterno: apellidoM,
    email: `${nombre.toLowerCase()}.${apellidoP.toLowerCase()}@email.com`,
    telefono: `+52 55 ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}`,
    tipoDocumento: 'INE',
    numeroDocumento: `${Math.floor(Math.random() * 900000000 + 100000000)}`,
    nacionalidad: 'Mexicana',
    esVip: estancias > 10,
    nivelLealtad: estancias > 15 ? 'Diamante' : estancias > 10 ? 'Platino' : estancias > 5 ? 'Oro' : estancias > 2 ? 'Plata' : 'Bronce',
    totalEstancias: estancias,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  });
}

// Generate mock reservations
export const mockReservas: Reserva[] = [];
const hoy = new Date();
const estados: Reserva['estado'][] = ['Confirmada', 'CheckIn', 'Pendiente', 'Confirmada'];

for (let i = 0; i < 200; i++) {
  const cliente = mockClientes[Math.floor(Math.random() * mockClientes.length)];
  const tipoHab = mockTiposHabitacion[Math.floor(Math.random() * mockTiposHabitacion.length)];
  const diasOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
  const checkin = new Date(hoy);
  checkin.setDate(checkin.getDate() + diasOffset);
  const noches = Math.floor(Math.random() * 5) + 1;
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + noches);
  
  const subtotal = tipoHab.precioBase * noches;
  const impuestos = subtotal * 0.16;
  const total = subtotal + impuestos;
  
  let estado: Reserva['estado'] = estados[Math.floor(Math.random() * estados.length)];
  if (diasOffset < 0) estado = 'CheckOut';
  if (diasOffset === 0) estado = Math.random() > 0.5 ? 'CheckIn' : 'Confirmada';
  
  const habitacionesDisponibles = mockHabitaciones.filter(h => h.tipoId === tipoHab.id);
  const habitacion = habitacionesDisponibles[Math.floor(Math.random() * habitacionesDisponibles.length)];
  
  const pagado = estado === 'CheckOut' ? total : estado === 'CheckIn' ? total * 0.5 : total * 0.3;
  
  mockReservas.push({
    id: `res-${(i + 1).toString().padStart(4, '0')}`,
    numeroReserva: `RES-${new Date().getFullYear()}-${(i + 1).toString().padStart(4, '0')}`,
    clienteId: cliente.id,
    cliente,
    habitacionId: habitacion?.id,
    habitacion,
    tipoHabitacionId: tipoHab.id,
    tipoHabitacion: tipoHab,
    fechaCheckin: checkin,
    fechaCheckout: checkout,
    horaLlegada: `${Math.floor(Math.random() * 8) + 14}:${Math.random() > 0.5 ? '00' : '30'}`,
    adultos: Math.floor(Math.random() * 2) + 1,
    ninos: Math.floor(Math.random() * 3),
    noches,
    tarifaNoche: tipoHab.precioBase,
    subtotalHospedaje: subtotal,
    totalImpuestos: impuestos,
    total,
    totalPagado: Math.round(pagado * 100) / 100,
    saldoPendiente: Math.round((total - pagado) * 100) / 100,
    estado,
    checkinRealizado: estado === 'CheckIn' || estado === 'CheckOut',
    checkoutRealizado: estado === 'CheckOut',
    solicitudesEspeciales: Math.random() > 0.7 ? 'Cama extra para niño' : undefined,
    createdAt: new Date(checkin.getTime() - 7 * 24 * 60 * 60 * 1000),
  });
}

// Mock products for POS
export const mockProductos: Producto[] = [
  { id: 'prod-001', categoria: 'Bebidas', codigo: 'BEB001', nombre: 'Agua Mineral 500ml', precioVenta: 25, stockActual: 100 },
  { id: 'prod-002', categoria: 'Bebidas', codigo: 'BEB002', nombre: 'Refresco Lata', precioVenta: 35, stockActual: 80 },
  { id: 'prod-003', categoria: 'Bebidas', codigo: 'BEB003', nombre: 'Cerveza Nacional', precioVenta: 55, stockActual: 120 },
  { id: 'prod-004', categoria: 'Bebidas', codigo: 'BEB004', nombre: 'Cerveza Importada', precioVenta: 85, stockActual: 60 },
  { id: 'prod-005', categoria: 'Bebidas', codigo: 'BEB005', nombre: 'Jugo Natural', precioVenta: 45, stockActual: 40 },
  { id: 'prod-006', categoria: 'Snacks', codigo: 'SNK001', nombre: 'Papas Fritas', precioVenta: 40, stockActual: 50 },
  { id: 'prod-007', categoria: 'Snacks', codigo: 'SNK002', nombre: 'Cacahuates', precioVenta: 35, stockActual: 60 },
  { id: 'prod-008', categoria: 'Snacks', codigo: 'SNK003', nombre: 'Barra de Chocolate', precioVenta: 30, stockActual: 45 },
  { id: 'prod-009', categoria: 'Alimentos', codigo: 'ALI001', nombre: 'Sandwich Club', precioVenta: 120, stockActual: 20 },
  { id: 'prod-010', categoria: 'Alimentos', codigo: 'ALI002', nombre: 'Ensalada César', precioVenta: 95, stockActual: 15 },
  { id: 'prod-011', categoria: 'Alimentos', codigo: 'ALI003', nombre: 'Hamburguesa', precioVenta: 140, stockActual: 25 },
  { id: 'prod-012', categoria: 'Servicios', codigo: 'SRV001', nombre: 'Lavandería Express', precioVenta: 150, stockActual: 999 },
  { id: 'prod-013', categoria: 'Servicios', codigo: 'SRV002', nombre: 'Planchado', precioVenta: 80, stockActual: 999 },
  { id: 'prod-014', categoria: 'Servicios', codigo: 'SRV003', nombre: 'Room Service', precioVenta: 50, stockActual: 999 },
  { id: 'prod-015', categoria: 'Minibar', codigo: 'MIN001', nombre: 'Whisky 50ml', precioVenta: 120, stockActual: 30 },
  { id: 'prod-016', categoria: 'Minibar', codigo: 'MIN002', nombre: 'Vodka 50ml', precioVenta: 100, stockActual: 35 },
];

// Mock cleaning tasks
export const mockTareasLimpieza: TareaLimpieza[] = mockHabitaciones
  .filter(h => h.estadoLimpieza !== 'Limpia')
  .map((hab, i) => ({
    id: `tarea-${(i + 1).toString().padStart(3, '0')}`,
    habitacionId: hab.id,
    habitacion: hab,
    fecha: new Date(),
    tipo: hab.estadoHabitacion === 'Disponible' ? 'Checkout' : 'Ocupada',
    prioridad: Math.random() > 0.7 ? 'Alta' : Math.random() > 0.5 ? 'Normal' : 'Urgente',
    estado: hab.estadoLimpieza === 'EnProceso' ? 'EnProceso' : 'Pendiente',
    asignadoA: 'usr-003',
    asignadoNombre: 'María López',
    notas: Math.random() > 0.8 ? 'Huésped solicitó toallas extra' : undefined,
  }));

// Dashboard stats helpers
export function getDashboardStats() {
  const ocupadas = mockHabitaciones.filter(h => h.estadoHabitacion === 'Ocupada').length;
  const disponibles = mockHabitaciones.filter(h => h.estadoHabitacion === 'Disponible').length;
  const limpieza = mockHabitaciones.filter(h => h.estadoLimpieza !== 'Limpia').length;
  const mantenimiento = mockHabitaciones.filter(h => h.estadoMantenimiento !== 'OK').length;
  
  return {
    ocupadas,
    disponibles,
    limpieza,
    mantenimiento,
    total: mockHabitaciones.length,
    ocupacionPorcentaje: Math.round((ocupadas / mockHabitaciones.length) * 100),
  };
}

export function getCheckinsHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  return mockReservas.filter(r => {
    const checkin = new Date(r.fechaCheckin);
    checkin.setHours(0, 0, 0, 0);
    return checkin.getTime() === hoy.getTime() && r.estado === 'Confirmada';
  }).slice(0, 5);
}

export function getCheckoutsHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  return mockReservas.filter(r => {
    const checkout = new Date(r.fechaCheckout);
    checkout.setHours(0, 0, 0, 0);
    return checkout.getTime() === hoy.getTime() && r.estado === 'CheckIn';
  }).slice(0, 5);
}

export function getVentasHoy() {
  return {
    total: 48750,
    alojamiento: 32500,
    alimentos: 8400,
    servicios: 7850,
  };
}

export function getTareasCriticas() {
  return mockTareasLimpieza.filter(t => t.prioridad === 'Urgente' || t.prioridad === 'Alta').slice(0, 4);
}