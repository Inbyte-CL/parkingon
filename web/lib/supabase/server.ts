import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Cliente de Supabase para server-side (Server Components)
 * Lee las cookies correctamente para mantener la sesión
 */
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const cookieStore = await cookies()
  
  // Supabase guarda las cookies con este formato: sb-<project-ref>-auth-token
  const projectRef = supabaseUrl.split('//')[1].split('.')[0]
  const authCookieName = `sb-${projectRef}-auth-token`
  
  // Obtener todas las cookies relacionadas con Supabase
  const allCookies = cookieStore.getAll()
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('sb-') || cookie.name.includes('supabase')
  )
  
  // Construir el header de cookies
  const cookieHeader = supabaseCookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ')

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: cookieHeader ? {
        Cookie: cookieHeader,
      } : {},
    },
  })
}
