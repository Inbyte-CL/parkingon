import { createSupabaseClient } from '@/lib/supabase/client'

/**
 * fetch con el JWT del usuario (sesión en localStorage).
 * Necesario para que las API routes validen superadmin en el servidor.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const supabase = createSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers = new Headers(init?.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  return fetch(input, { ...init, headers })
}
