import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Sesión inválida' }, 401);
    const caller = userData.user;

    const { data: callerRoles } = await admin
      .from('user_roles').select('role').eq('user_id', caller.id);
    const roles = (callerRoles || []).map((r: any) => r.role);
    const isSuperAdmin = roles.includes('SuperAdmin') || caller.email === 'diego.leon@uniline.mx';
    const isAdmin = roles.includes('Admin') || roles.includes('Gerente') || isSuperAdmin;
    if (!isAdmin) return json({ error: 'Solo administradores pueden eliminar usuarios' }, 403);

    const body = await req.json();
    const { id } = body || {};
    if (!id) return json({ error: 'Falta id de usuario' }, 400);
    if (id === caller.id) return json({ error: 'No puedes eliminar tu propio usuario' }, 400);

    // No permitir eliminar a un SuperAdmin salvo que el caller también lo sea
    const { data: targetRoles } = await admin
      .from('user_roles').select('role').eq('user_id', id);
    const targetIsSuper = (targetRoles || []).some((r: any) => r.role === 'SuperAdmin');
    if (targetIsSuper && !isSuperAdmin) {
      return json({ error: 'No puedes eliminar a un SuperAdmin' }, 403);
    }

    // Borrar user_roles y profile primero (por FKs), luego auth.users
    await admin.from('user_roles').delete().eq('user_id', id);
    await admin.from('profiles').delete().eq('id', id);
    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) return json({ error: `Auth: ${authErr.message}` }, 400);

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