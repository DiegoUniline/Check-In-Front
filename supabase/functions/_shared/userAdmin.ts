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

function decodePayload(jwt: string): any | null {
  try {
    const part = jwt.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    return JSON.parse(json);
  } catch { return null; }
}

/**
 * Valida el token contra la base de datos (la API de datos verifica la firma del token).
 * No depende del servicio de inicio de sesión, que puede tener cortes momentáneos.
 */
async function verifyViaDatabase(jwt: string): Promise<{ id: string; email?: string } | null> {
  const payload = decodePayload(jwt);
  if (!payload?.sub || payload.role !== 'authenticated') return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_ANON_KEY') || '';
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=id&id=eq.${payload.sub}`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: key },
    });
    if (!res.ok) {
      console.error('verifyViaDatabase:', res.status);
      return null;
    }
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]?.id === payload.sub) return { id: payload.sub, email: payload.email };
  } catch (e) {
    console.error('verifyViaDatabase exception:', (e as Error).message);
  }
  return null;
}

export async function loadCaller(admin: any, jwt: string): Promise<Caller | null> {
  let user: any = await verifyViaDatabase(jwt);
  // Respaldo: servicio de auth, con reintentos ante cortes momentáneos.
  for (let i = 0; !user && i < 3; i++) {
    const { data: userData, error } = await admin.auth.getUser(jwt).catch((e: Error) => ({ data: null, error: e }));
    if (userData?.user) user = userData.user;
    else {
      console.error(`loadCaller getUser intento ${i + 1}:`, (error as any)?.message);
      const status = (error as any)?.status;
      if (status && status < 500) break; // token realmente inválido
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  if (!user?.id) return null;
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
