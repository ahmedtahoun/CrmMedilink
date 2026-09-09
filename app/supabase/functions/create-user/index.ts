// MediLink360 — create a team login from the Team Access screen.
//
// Auth users can only be created with the service-role key, which must never
// reach the browser. This Edge Function does it server-side after checking
// the caller is a CEO or Admin.
//
// Deploy:  supabase functions deploy create-user
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Role = 'CEO' | 'Admin' | 'Sales' | 'Trainer'

// What each caller role may create. Admin is never creatable from the app.
const CREATABLE: Record<string, Role[]> = {
  Admin: ['CEO', 'Sales', 'Trainer'],
  CEO: ['Sales', 'Trainer'],
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // 1. identify the caller from their bearer token
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceKey)
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .maybeSingle()

  const callerRole = profile?.role as string | undefined
  if (!profile?.active || !callerRole || !(callerRole in CREATABLE)) {
    return json({ error: 'Only a CEO or Admin can create logins' }, 403)
  }

  // 2. validate the request
  let body: { name?: string; email?: string; password?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const role = body.role as Role

  if (!name || !email || !password) return json({ error: 'Name, email and password are required' }, 400)
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
  if (!CREATABLE[callerRole].includes(role)) {
    return json({ error: `A ${callerRole} cannot create a ${role} login` }, 403)
  }

  // 3. create the user — the handle_new_user trigger fills public.profiles
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  })
  if (error) {
    const msg = /already been registered/i.test(error.message)
      ? 'That email already has a login'
      : error.message
    return json({ error: msg }, 400)
  }

  return json({ id: data.user?.id, email, role })
})
