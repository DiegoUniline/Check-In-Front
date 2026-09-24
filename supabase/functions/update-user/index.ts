import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { loadCaller, normalizeRole, roleAssignmentError, targetAccessError } from '../_shared/userAdmin.ts';

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
    if (!caller.isManager) return json({ error: 'Solo administradores pueden editar usuarios' }, 403);

    const body = await req.json();
    const {
      id,
      email,
      password,
      nombre,
      apellido_paterno,
      apellido_materno,
      telefono,
      rol,
      activo,
    } = body || {};

    if (!id) return json({ error: 'Falta id de usuario' }, 400);
    if (id !== caller.id) {
      const accessError = await targetAccessError(admin, caller, id);
      if (accessError) return json({ error: accessError }, 403);
    }
    const requestedRole = rol ? normalizeRole(rol) : null;
    if (id === caller.id && requestedRole && !caller.roles.includes(requestedRole)) {
      return json({ error: 'No puedes cambiar tu propio rol' }, 403);
    }
    if (id === caller.id && activo === false) return json({ error: 'No puedes desactivar tu propio usuario' }, 400);

    // 1. Actualizar profile
    const profileUpdate: Record<string, unknown> = {};
    if (email !== undefined) profileUpdate.email = email;
    if (nombre !== undefined) profileUpdate.nombre = nombre;
    if (apellido_paterno !== undefined) profileUpdate.apellido_paterno = apellido_paterno;
    if (apellido_materno !== undefined) profileUpdate.apellido_materno = apellido_materno;
    if (telefono !== undefined) profileUpdate.telefono = telefono;
    if (activo !== undefined) profileUpdate.activo = activo;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profErr } = await admin.from('profiles').update(profileUpdate).eq('id', id);
      if (profErr) return json({ error: `Perfil: ${profErr.message}` }, 400);
    }

    // 2. Actualizar auth (email/password) si se envían
    const authUpdate: Record<string, unknown> = {};
    if (email) authUpdate.email = email;
    if (password) authUpdate.password = password;
    // Un usuario desactivado ya no puede iniciar sesión.
    if (activo === false) authUpdate.ban_duration = '876000h';
    if (activo === true) authUpdate.ban_duration = 'none';
    if (Object.keys(authUpdate).length > 0) {
      const { error: authErr } = await admin.auth.admin.updateUserById(id, authUpdate);
      if (authErr) return json({ error: `Auth: ${authErr.message}` }, 400);
    }

    // 3. Actualizar rol si se envía
    if (rol && !(id === caller.id && requestedRole && caller.roles.includes(requestedRole))) {
      const rolNorm = normalizeRole(rol);
      if (!rolNorm) return json({ error: `Rol inválido: ${rol}` }, 400);
      const roleError = roleAssignmentError(caller, rolNorm);
      if (roleError) return json({ error: roleError }, 403);
      // Reemplazar roles del usuario
      await admin.from('user_roles').delete().eq('user_id', id);
      const { error: roleErr } = await admin.from('user_roles').insert({ user_id: id, role: rolNorm });
      if (roleErr) return json({ error: `Rol: ${roleErr.message}` }, 400);
    }

    return json({ id, ok: true });
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