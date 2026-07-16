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
  { key: 'checkin', label: 'Check-In', group: 'Operaciones', path: '/checkin/:id' },
  { key: 'checkout', label: 'Check-Out', group: 'Operaciones', path: '/checkout/:id' },

  // Ventas
  { key: 'pos', label: 'POS', group: 'Ventas', path: '/pos' },
  { key: 'inventario', label: 'Inventario', group: 'Ventas', path: '/inventario' },
  { key: 'compras', label: 'Compras', group: 'Ventas', path: '/compras' },
  { key: 'proveedores', label: 'Proveedores', group: 'Ventas', path: '/proveedores' },
  { key: 'gastos', label: 'Gastos', group: 'Ventas', path: '/gastos' },
  { key: 'historial', label: 'Historial Ventas', group: 'Ventas', path: '/historial' },
  { key: 'historial-reservas', label: 'Historial Reservas', group: 'Ventas', path: '/historial-reservas' },
  { key: 'reportes', label: 'Reportes', group: 'Ventas', path: '/reportes' },

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
  turnos: ['Admin', 'Gerente'],
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