// Autorización común para crear, editar y eliminar usuarios del hotel.
// Reglas:
//  * Sólo Admin, Gerente o SuperAdmin administran usuarios.
//  * Fuera de SuperAdmin, sólo se administran usuarios del mismo hotel.
//  * Sólo SuperAdmin asigna o modifica SuperAdmin.
//  * Gerente no asigna Admin ni modifica a un Admin.
//  * Nadie cambia su propio rol.

export const ALLOWED_ROLES = ['Admin', 'Recepcion', 'Housekeeping', 'Mantenimiento', 'Gerente', 'SuperAdmin'];

export type Caller = {
  id: string;
  hotelId: string | null;
  roles: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
};

export async function loadCaller(admin: any, jwt: string): Promise<Caller | null> {
  const { data: userData, error } = await admin.auth.getUser(jwt);
  if (error || !userData?.user) return null;
  const user = userData.user;
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    admin.from('profiles').select('hotel_id').eq('id', user.id).maybeSingle(),
    admin.from('user_roles').select('role').eq('user_id', user.id),
  ]);
  const roles = (roleRows || []).map((r: any) => String(r.role));
  // Se conserva el acceso del propietario de la plataforma.
  const isSuperAdmin = roles.includes('SuperAdmin') || user.email === 'diego.leon@uniline.mx';
  const isAdmin = isSuperAdmin || roles.includes('Admin');
  return {
    id: user.id,
    hotelId: profile?.hotel_id ?? null,
    roles,
    isSuperAdmin,
    isAdmin,
    isManager: isAdmin || roles.includes('Gerente'),
  };
}

export function normalizeRole(rol: unknown): string | null {
  return ALLOWED_ROLES.find((r) => r.toLowerCase() === String(rol ?? '').toLowerCase()) || null;
}

/** Devuelve un mensaje de error si el caller no puede asignar ese rol. */
export function roleAssignmentError(caller: Caller, role: string): string | null {
  if (role === 'SuperAdmin' && !caller.isSuperAdmin) return 'Solo un SuperAdmin puede asignar ese rol';
  if (role === 'Admin' && !caller.isAdmin) return 'Solo un Administrador puede asignar el rol Admin';
  return null;
}

/** Valida que el caller pueda administrar al usuario destino. */
export async function targetAccessError(admin: any, caller: Caller, targetId: string): Promise<string | null> {
  const [{ data: target }, { data: targetRoleRows }] = await Promise.all([
    admin.from('profiles').select('hotel_id').eq('id', targetId).maybeSingle(),
    admin.from('user_roles').select('role').eq('user_id', targetId),
  ]);
  const targetRoles = (targetRoleRows || []).map((r: any) => String(r.role));
  if (targetRoles.includes('SuperAdmin') && !caller.isSuperAdmin) return 'No puedes modificar a un SuperAdmin';
  if (caller.isSuperAdmin) return null;
  if (!target || !caller.hotelId || target.hotel_id !== caller.hotelId) {
    return 'El usuario no pertenece a tu hotel';
  }
  if (targetRoles.includes('Admin') && !caller.isAdmin) return 'Solo un Administrador puede modificar a otro Administrador';
  return null;
}
