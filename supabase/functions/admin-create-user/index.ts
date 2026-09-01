// Edge function: admin-create-user
// Allows admin (verified via JWT + DB role check) to create or update other users
import { createClient, corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0";

interface CreateBody {
  action: 'create' | 'update_role' | 'delete' | 'reset_password';
  email?: string;
  password?: string;
  full_name?: string;
  role?: 'admin' | 'lawyer' | 'assistant' | 'viewer';
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth' }, 401);

  // Identify caller
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

  // Verify caller is admin via DB function
  const admin = createClient(url, service);
  const { data: isAdminData } = await admin.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
  if (!isAdminData) return json({ error: 'Forbidden — admin only' }, 403);

  let body: CreateBody;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  try {
    if (body.action === 'create') {
      if (!body.email || !body.password || !body.role) return json({ error: 'email, password, role required' }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: body.full_name ?? body.email },
      });
      if (error) return json({ error: error.message }, 400);

      // Replace default 'viewer' role with chosen role
      await admin.from('user_roles').delete().eq('user_id', data.user.id);
      const { error: rErr } = await admin.from('user_roles').insert({ user_id: data.user.id, role: body.role });
      if (rErr) return json({ error: rErr.message }, 400);
      return json({ user_id: data.user.id });
    }

    if (body.action === 'update_role') {
      if (!body.user_id || !body.role) return json({ error: 'user_id, role required' }, 400);
      await admin.from('user_roles').delete().eq('user_id', body.user_id);
      const { error } = await admin.from('user_roles').insert({ user_id: body.user_id, role: body.role });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === 'reset_password') {
      if (!body.user_id || !body.password) return json({ error: 'user_id, password required' }, 400);
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === 'delete') {
      if (!body.user_id) return json({ error: 'user_id required' }, 400);
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
