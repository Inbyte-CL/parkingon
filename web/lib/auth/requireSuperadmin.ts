import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireSuperadmin(request?: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
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

  if (!(user.user_metadata?.is_superadmin as boolean)) {
    return {
      error: NextResponse.json(
        { error: 'Solo los superadmins pueden realizar esta acción' },
        { status: 403 }
      ),
    }
  }

  return { user }
}
