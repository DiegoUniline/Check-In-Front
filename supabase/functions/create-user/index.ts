import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_ROLES = ['Admin', 'Recepcion', 'Housekeeping', 'Mantenimiento', 'Gerente', 'SuperAdmin'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return json({ error: 'No autenticado' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validar quién es el caller
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Sesión inválida' }, 401);
    const caller = userData.user;

    // Perfil + rol del caller
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('hotel_id, hotel_activo_id')
      .eq('id', caller.id)
      .maybeSingle();
    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);
    const roles = (callerRoles || []).map((r: any) => r.role);
    const isSuperAdmin = roles.includes('SuperAdmin') || caller.email === 'diego.leon@uniline.mx';
    const isAdmin = roles.includes('Admin') || roles.includes('Gerente') || isSuperAdmin;
    if (!isAdmin) return json({ error: 'Solo administradores pueden crear usuarios' }, 403);

    const body = await req.json();
    const {
      email,
      password,
      nombre,
      apellido_paterno,
      apellido_materno,
      telefono,
      rol,
      activo = true,
      hotel_id: hotelIdBody,
    } = body || {};

    if (!email || !password || !nombre || !rol) {
      return json({ error: 'Faltan campos requeridos (email, password, nombre, rol)' }, 400);
    }

    // Normalizar rol (case-insensitive → enum exacto)
    const rolNorm = ALLOWED_ROLES.find((r) => r.toLowerCase() === String(rol).toLowerCase());
    if (!rolNorm) return json({ error: `Rol inválido: ${rol}` }, 400);

    // hotel_id: SuperAdmin puede pasar cualquiera (o null); resto queda al del caller
    const targetHotelId = isSuperAdmin
      ? (hotelIdBody === undefined ? callerProfile?.hotel_id ?? null : hotelIdBody)
      : (callerProfile?.hotel_activo_id || callerProfile?.hotel_id || null);

    // 1. Crear usuario en auth (email confirmado)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido_paterno, apellido_materno },
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message || 'No se pudo crear el usuario' }, 400);
    }
    const newUserId = created.user.id;

    // 2. Upsert profile
    const { error: profErr } = await admin
      .from('profiles')
      .upsert({
        id: newUserId,
        hotel_id: targetHotelId,
        nombre,
        apellido_paterno: apellido_paterno || null,
        apellido_materno: apellido_materno || null,
        email,
        telefono: telefono || null,
        activo,
      });
    if (profErr) {
      // Rollback auth user si falla el profile
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: `Perfil: ${profErr.message}` }, 400);
    }

    // 3. Insertar rol
    const { error: roleErr } = await admin
      .from('user_roles')
      .insert({ user_id: newUserId, role: rolNorm });
    if (roleErr && !String(roleErr.message).includes('duplicate')) {
      return json({ error: `Rol: ${roleErr.message}` }, 400);
    }

    return json({ id: newUserId, email, rol: rolNorm });
  } catch (e: any) {
    return json({ error: e?.message || 'Error interno' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}