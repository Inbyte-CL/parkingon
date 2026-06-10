import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type OrgAdminAuth = {
  user: { id: string; email?: string }
  role: 'superadmin' | 'admin_empresa'
  orgId: string | null
  parkingId: string | null
}

export type OrgAdminAuthResult = { error: NextResponse } | OrgAdminAuth

export function isOrgAdminAuth(result: OrgAdminAuthResult): result is OrgAdminAuth {
  return !('error' in result)
}

export async function requireOrgAdmin(request?: Request): Promise<OrgAdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return {
      error: NextResponse.json(
        { error: 'Configuración de Supabase no encontrada' },
        { status: 500 }
      ),
    }
  }

  let user = null
  let authError: Error | null = null

  const authHeader = request?.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7).trim()
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getUser(jwt)
    user = data.user
    authError = error
  } else {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser()
    user = data.user
    authError = error
  }

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  if (user.user_metadata?.is_superadmin as boolean) {
    return { user: { id: user.id, email: user.email }, role: 'superadmin', orgId: null, parkingId: null }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: membership, error: membershipError } = await adminClient
    .from('memberships')
    .select('org_id, parking_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('role', 'admin_empresa')
    .maybeSingle()

  if (membershipError || !membership) {
    return {
      error: NextResponse.json(
        { error: 'Solo administradores pueden realizar esta acción' },
        { status: 403 }
      ),
    }
  }

  return {
    user: { id: user.id, email: user.email },
    role: 'admin_empresa',
    orgId: membership.org_id,
    parkingId: membership.parking_id ?? null,
  }
}
