import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export type OperatorAuth = {
  userId: string
  orgId: string
  parkingId: string | null
}

export type OperatorAuthResult = { error: NextResponse } | OperatorAuth
export type OperatorSession = { id: string; org_id: string; parking_id: string; status: string }

export function isOperatorAuth(result: OperatorAuthResult): result is OperatorAuth {
  return !('error' in result)
}

export async function requireOperator(request: Request): Promise<OperatorAuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    return { error: NextResponse.json({ error: 'Configuración de Supabase no encontrada' }, { status: 500 }) }
  }

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Bearer token requerido' }, { status: 401 }) }
  }

  const token = authorization.slice(7).trim()
  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: userError } = await authClient.auth.getUser(token)
  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 }) }
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: membership, error } = await admin
    .from('memberships')
    .select('org_id, parking_id, role')
    .eq('user_id', user.id)
    .eq('role', 'operador')
    .eq('status', 'active')
    .maybeSingle()

  if (error || !membership?.org_id) {
    return { error: NextResponse.json({ error: 'Operador activo requerido' }, { status: 403 }) }
  }

  return {
    userId: user.id,
    orgId: membership.org_id,
    parkingId: membership.parking_id ?? null,
  }
}

export async function requireOperatorSession(
  request: Request,
  sessionId: string
): Promise<{ error: NextResponse } | { auth: OperatorAuth; session: OperatorSession }> {
  const auth = await requireOperator(request)
  if (!isOperatorAuth(auth)) return auth

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data: session, error } = await admin
    .from('sessions')
    .select('id, org_id, parking_id, status')
    .eq('id', sessionId)
    .eq('org_id', auth.orgId)
    .eq('status', 'open')
    .maybeSingle()
  if (error || !session) {
    return { error: NextResponse.json({ error: 'Sesión abierta no encontrada' }, { status: 404 }) }
  }

  if (auth.parkingId && auth.parkingId !== session.parking_id) {
    return { error: NextResponse.json({ error: 'Sesión pertenece a otro parking' }, { status: 403 }) }
  }
  if (!auth.parkingId) {
    const { data: shift } = await admin
      .from('shifts')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('org_id', auth.orgId)
      .eq('parking_id', session.parking_id)
      .eq('status', 'open')
      .maybeSingle()
    if (!shift) {
      return { error: NextResponse.json({ error: 'No tienes turno abierto en este parking' }, { status: 403 }) }
    }
  }

  return { auth, session: session as OperatorSession }
}
