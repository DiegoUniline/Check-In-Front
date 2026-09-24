import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { loadCaller, targetAccessError } from '../_shared/userAdmin.ts';

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
    if (!caller.isManager) return json({ error: 'Solo administradores pueden eliminar usuarios' }, 403);

    const body = await req.json();
    const { id } = body || {};
    if (!id) return json({ error: 'Falta id de usuario' }, 400);
    if (id === caller.id) return json({ error: 'No puedes eliminar tu propio usuario' }, 400);
    const accessError = await targetAccessError(admin, caller, id);
    if (accessError) return json({ error: accessError }, 403);

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