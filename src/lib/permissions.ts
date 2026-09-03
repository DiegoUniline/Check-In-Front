export type RoleId = 'Admin' | 'Gerente' | 'Recepcion' | 'Housekeeping' | 'Mantenimiento';

export const ROLES: { id: RoleId; nombre: string; color: string }[] = [
  { id: 'Admin', nombre: 'Administrador', color: 'bg-red-500' },
  { id: 'Gerente', nombre: 'Gerente', color: 'bg-blue-500' },
  { id: 'Recepcion', nombre: 'Recepción', color: 'bg-green-500' },
  { id: 'Housekeeping', nombre: 'Limpieza', color: 'bg-yellow-500' },
  { id: 'Mantenimiento', nombre: 'Mantenimiento', color: 'bg-orange-500' },
];

export type ViewDef = {
  key: string;          // unique permission key
  label: string;        // display
  group: string;        // section
  path?: string;        // route (for top-level views)
  parent?: string;      // parent view key (for tabs)
};

/** Catálogo completo de vistas y tabs del sistema */
export const VIEWS: ViewDef[] = [
  // Principal
  { key: 'dashboard', label: 'Dashboard', group: 'Principal', path: '/dashboard' },
  { key: 'reservas', label: 'Reservas', group: 'Principal', path: '/reservas' },
  { key: 'habitaciones', label: 'Habitaciones', group: 'Principal', path: '/habitaciones' },
  { key: 'clientes', label: 'Clientes', group: 'Principal', path: '/clientes' },
  { key: 'chats', label: 'WhatsApp / Chats', group: 'Principal', path: '/chats' },

  // Operaciones
  { key: 'limpieza', label: 'Limpieza', group: 'Operaciones', path: '/limpieza' },
  { key: 'mantenimiento', label: 'Mantenimiento', group: 'Operaciones', path: '/mantenimiento' },
  { key: 'cierre-dia', label: 'Cierre del día', group: 'Operaciones', path: '/cierre-dia' },
  { key: 'checkin', label: 'Check-In', group: 'Operaciones', path: '/checkin/:id' },
  { key: 'checkout', label: 'Check-Out', group: 'Operaciones', path: '/checkout/:id' },

  // Ventas
  { key: 'pos', label: 'POS', group: 'Ventas', path: '/pos' },
  { key: 'historial', label: 'Historial Ventas', group: 'Ventas', path: '/historial' },
  { key: 'reportes', label: 'Reportes', group: 'Ventas', path: '/reportes' },

  // Inventarios
  { key: 'inventario', label: 'Inventario', group: 'Inventarios', path: '/inventario' },

  // Compras
  { key: 'compras', label: 'Compras', group: 'Compras', path: '/compras' },
  { key: 'proveedores', label: 'Proveedores', group: 'Compras', path: '/proveedores' },
  { key: 'gastos', label: 'Gastos', group: 'Compras', path: '/gastos' },

  // Reservas
  { key: 'historial-reservas', label: 'Histórico Entradas', group: 'Principal', path: '/historial-reservas' },

  // Sistema
  { key: 'usuarios', label: 'Usuarios', group: 'Sistema', path: '/usuarios' },
  { key: 'turnos', label: 'Turnos', group: 'Sistema', path: '/turnos' },
  { key: 'catalogos', label: 'Catálogos', group: 'Sistema', path: '/catalogos' },
  { key: 'configuracion', label: 'Configuración', group: 'Sistema', path: '/configuracion' },
  { key: 'permisos', label: 'Permisos', group: 'Sistema', path: '/permisos' },
  { key: 'auditoria', label: 'Auditoría', group: 'Sistema', path: '/auditoria' },

  // Tabs de Catálogos
  { key: 'catalogos.conceptos', label: 'Conceptos de cargo', group: 'Tabs · Catálogos', parent: 'catalogos' },
  { key: 'catalogos.categorias', label: 'Categorías de producto', group: 'Tabs · Catálogos', parent: 'catalogos' },
  { key: 'catalogos.entregables', label: 'Entregables', group: 'Tabs · Catálogos', parent: 'catalogos' },
  { key: 'catalogos.metodos', label: 'Métodos de pago', group: 'Tabs · Catálogos', parent: 'catalogos' },
  { key: 'catalogos.proveedores', label: 'Proveedores', group: 'Tabs · Catálogos', parent: 'catalogos' },
  { key: 'catalogos.tipos-habitacion', label: 'Tipos de habitación', group: 'Tabs · Catálogos', parent: 'catalogos' },

  // Tabs de Configuración
  { key: 'config.hotel', label: 'Datos del Hotel', group: 'Tabs · Configuración', parent: 'configuracion' },
  { key: 'config.usuarios', label: 'Usuarios y Roles', group: 'Tabs · Configuración', parent: 'configuracion' },
  { key: 'config.pagos', label: 'Pagos / Facturación', group: 'Tabs · Configuración', parent: 'configuracion' },
  { key: 'config.notificaciones', label: 'Notificaciones', group: 'Tabs · Configuración', parent: 'configuracion' },
  { key: 'config.apariencia', label: 'Apariencia', group: 'Tabs · Configuración', parent: 'configuracion' },

  // Tabs de Reportes
  { key: 'reportes.ocupacion', label: 'Ocupación', group: 'Tabs · Reportes', parent: 'reportes' },
  { key: 'reportes.ingresos', label: 'Ingresos', group: 'Tabs · Reportes', parent: 'reportes' },
  { key: 'reportes.ventas', label: 'Ventas POS', group: 'Tabs · Reportes', parent: 'reportes' },
  { key: 'reportes.huespedes', label: 'Huéspedes', group: 'Tabs · Reportes', parent: 'reportes' },

  // Acciones sensibles dentro de la estancia. Estas llaves también son
  // verificadas en base de datos; ocultar un botón nunca sustituye el permiso.
  { key: 'reservas.operacion.extend_stay', label: 'Extender estancia', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.early_departure', label: 'Salida anticipada', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.modify_dates', label: 'Modificar fechas', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.room_change', label: 'Cambiar habitación', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.category_change', label: 'Upgrade / downgrade', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.late_checkout', label: 'Late check-out', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.early_checkin', label: 'Early check-in', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.add_guest', label: 'Agregar huésped', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.remove_guest', label: 'Retirar huésped', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.room_out_of_service', label: 'Sacar habitación de servicio', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.rate_change', label: 'Modificar tarifa', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.discount_change', label: 'Descuento / cortesía', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.add_charge', label: 'Agregar cargos', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.update_charge', label: 'Corregir cargos', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.cancel_charge', label: 'Cancelar cargos', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.restore_charge', label: 'Restaurar cargos', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.transfer_charge', label: 'Trasladar cargos', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.partial_payment', label: 'Registrar pagos parciales', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.payment_method_change', label: 'Corregir forma de pago', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.cancel_payment', label: 'Cancelar pago', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.restore_payment', label: 'Restaurar pago', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.split_account', label: 'Dividir cuenta', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.move_to_account', label: 'Mover entre subcuentas', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.no_show', label: 'Marcar no-show', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.cancel_reservation', label: 'Cancelar reservación', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.reopen_checkout', label: 'Reabrir check-out', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.consecutive_reservation', label: 'Enlazar reserva consecutiva', group: 'Acciones · Estancias', parent: 'reservas' },
  { key: 'reservas.operacion.correction_note', label: 'Registrar corrección operativa', group: 'Acciones · Estancias', parent: 'reservas' },
];

export type PermissionMatrix = Record<string, RoleId[]>;

/** Permisos por defecto razonables */
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  dashboard: ['Admin', 'Gerente', 'Recepcion'],
  reservas: ['Admin', 'Gerente', 'Recepcion'],
  habitaciones: ['Admin', 'Gerente', 'Recepcion', 'Housekeeping', 'Mantenimiento'],
  clientes: ['Admin', 'Gerente', 'Recepcion'],
  chats: ['Admin', 'Gerente', 'Recepcion'],

  limpieza: ['Admin', 'Gerente', 'Housekeeping'],
  mantenimiento: ['Admin', 'Gerente', 'Mantenimiento'],
  'cierre-dia': ['Admin', 'Gerente'],
  checkin: ['Admin', 'Gerente', 'Recepcion'],
  checkout: ['Admin', 'Gerente', 'Recepcion'],

  pos: ['Admin', 'Gerente', 'Recepcion'],
  inventario: ['Admin', 'Gerente'],
  compras: ['Admin', 'Gerente'],
  proveedores: ['Admin', 'Gerente'],
  gastos: ['Admin', 'Gerente'],
  historial: ['Admin', 'Gerente'],
  'historial-reservas': ['Admin', 'Gerente', 'Recepcion'],
  reportes: ['Admin', 'Gerente'],

  usuarios: ['Admin'],
  turnos: ['Admin', 'Gerente', 'Recepcion'],
  catalogos: ['Admin', 'Gerente'],
  configuracion: ['Admin'],
  permisos: ['Admin'],
  auditoria: ['Admin', 'Gerente'],

  'catalogos.conceptos': ['Admin', 'Gerente'],
  'catalogos.categorias': ['Admin', 'Gerente'],
  'catalogos.entregables': ['Admin', 'Gerente'],
  'catalogos.metodos': ['Admin', 'Gerente'],
  'catalogos.proveedores': ['Admin', 'Gerente'],
  'catalogos.tipos-habitacion': ['Admin', 'Gerente'],

  'config.hotel': ['Admin'],
  'config.usuarios': ['Admin'],
  'config.pagos': ['Admin'],
  'config.notificaciones': ['Admin', 'Gerente'],
  'config.apariencia': ['Admin', 'Gerente', 'Recepcion'],

  'reportes.ocupacion': ['Admin', 'Gerente'],
  'reportes.ingresos': ['Admin', 'Gerente'],
  'reportes.ventas': ['Admin', 'Gerente'],
  'reportes.huespedes': ['Admin', 'Gerente'],

  'reservas.operacion.extend_stay': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.early_departure': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.modify_dates': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.room_change': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.category_change': ['Admin', 'Gerente'],
  'reservas.operacion.late_checkout': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.early_checkin': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.add_guest': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.remove_guest': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.room_out_of_service': ['Admin', 'Gerente'],
  'reservas.operacion.rate_change': ['Admin', 'Gerente'],
  'reservas.operacion.discount_change': ['Admin', 'Gerente'],
  'reservas.operacion.add_charge': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.update_charge': ['Admin', 'Gerente'],
  'reservas.operacion.cancel_charge': ['Admin', 'Gerente'],
  'reservas.operacion.restore_charge': ['Admin', 'Gerente'],
  'reservas.operacion.transfer_charge': ['Admin', 'Gerente'],
  'reservas.operacion.partial_payment': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.payment_method_change': ['Admin', 'Gerente'],
  'reservas.operacion.cancel_payment': ['Admin', 'Gerente'],
  'reservas.operacion.restore_payment': ['Admin', 'Gerente'],
  'reservas.operacion.split_account': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.move_to_account': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.no_show': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.cancel_reservation': ['Admin', 'Gerente'],
  'reservas.operacion.reopen_checkout': ['Admin', 'Gerente'],
  'reservas.operacion.consecutive_reservation': ['Admin', 'Gerente', 'Recepcion'],
  'reservas.operacion.correction_note': ['Admin', 'Gerente', 'Recepcion'],
};

const STORAGE_KEY = 'permisos_matrix';

export function loadPermissions(): PermissionMatrix {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PERMISSIONS };
    const parsed = JSON.parse(raw) as PermissionMatrix;
    return { ...DEFAULT_PERMISSIONS, ...parsed };
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

export function savePermissions(matrix: PermissionMatrix): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
}

export function resetPermissions(): PermissionMatrix {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PERMISSIONS };
}

export function canAccess(viewKey: string, role: string | undefined): boolean {
  if (!role) return false;
  if (role === 'Admin' || role === 'SuperAdmin') return true;
  const matrix = loadPermissions();
  const allowed = matrix[viewKey];
  // Cierre por defecto: si la vista no está en la matriz, denegar.
  // Solo Admin/SuperAdmin (arriba) pasan sin estar declarados.
  if (!allowed) return false;
  return allowed.includes(role as RoleId);
}
