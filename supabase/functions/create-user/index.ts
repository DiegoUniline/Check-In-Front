import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { loadCaller, normalizeRole, roleAssignmentError } from '../_shared/userAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


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

    const caller = await loadCaller(admin, jwt);
    if (!caller) return json({ error: 'Sesión inválida' }, 401);
    if (!caller.isManager) return json({ error: 'Solo administradores pueden crear usuarios' }, 403);

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
    const rolNorm = normalizeRole(rol);
    if (!rolNorm) return json({ error: `Rol inválido: ${rol}` }, 400);
    const roleError = roleAssignmentError(caller, rolNorm);
    if (roleError) return json({ error: roleError }, 403);

    // hotel_id: SuperAdmin puede pasar cualquiera; el resto queda en su propio hotel.
    const targetHotelId = caller.isSuperAdmin
      ? (hotelIdBody === undefined ? caller.hotelId : hotelIdBody)
      : caller.hotelId;
    if (!caller.isSuperAdmin && !targetHotelId) return json({ error: 'Tu usuario no tiene hotel asignado' }, 400);

    // 1. Crear usuario en auth (email confirmado)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido_paterno, apellido_materno },
      // Evita que el trigger de registro público le cree otro hotel y rol Admin.
      app_metadata: { created_by_admin: true },
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

    // 3. Rol único: se reemplaza cualquier rol que se haya creado automáticamente.
    await admin.from('user_roles').delete().eq('user_id', newUserId);
    const { error: roleErr } = await admin
      .from('user_roles')
      .insert({ user_id: newUserId, role: rolNorm });
    if (roleErr) {
      await admin.auth.admin.deleteUser(newUserId);
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