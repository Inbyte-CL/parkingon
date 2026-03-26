import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton del cliente para evitar crear múltiples instancias
let supabaseClient: SupabaseClient | null = null

/**
 * Cliente de Supabase para uso en componentes del cliente
 */
export const createSupabaseClient = (): SupabaseClient => {
  // Si ya existe, retornarlo
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Verifica .env.local')
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
    }
  })

  return supabaseClient
}

/**
 * Cliente de Supabase con service role (solo para server-side)
 * Usar con precaución - tiene acceso completo a la base de datos
 */
export const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Cliente de Supabase para server-side con el token del usuario
 */
export const createSupabaseServerClient = (accessToken?: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`
      } : {}
    }
  })

  return client
}
