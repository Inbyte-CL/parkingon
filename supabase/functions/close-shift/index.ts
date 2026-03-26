// Edge Function: close-shift
// Cierra el turno actual del operador
// Validaciones:
// - El operador debe tener un turno abierto
// - Se permite cerrar con sesiones abiertas (son del parking, cualquier operador puede cerrarlas/cobrarlas)
// - Calcula automáticamente la diferencia de caja
// Auth: JWT verificado con JWKS (desplegar con --no-verify-jwt)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getUserIdFromRequest(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Falta cabecera Authorization (Bearer token)' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    ) as unknown as Response
  }
  const jwt = authHeader.slice(7)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const issuer = `${supabaseUrl}/auth/v1`
  const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`
  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl))
    const { payload } = await jwtVerify(jwt, JWKS, { issuer })
    const userId = payload.sub as string
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Token inválido (sin sub)' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ) as unknown as Response
    }
    return { userId }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid JWT'
    return new Response(
      JSON.stringify({
        error: 'Sesión expirada o token inválido. Cierra sesión y vuelve a iniciar sesión.',
        details: msg
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    ) as unknown as Response
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authResult = await getUserIdFromRequest(req)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { closing_cash, notes } = await req.json()

    if (closing_cash === undefined || closing_cash === null) {
      return new Response(
        JSON.stringify({ error: 'closing_cash es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar que closing_cash sea un número positivo o cero
    if (isNaN(closing_cash) || closing_cash < 0) {
      return new Response(
        JSON.stringify({ error: 'closing_cash debe ser un número positivo o cero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Obtener el turno abierto del operador
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .maybeSingle()

    if (shiftError) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener turno', details: shiftError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!shift) {
      return new Response(
        JSON.stringify({ error: 'No tienes un turno abierto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Opcional: contar sesiones abiertas para auditoría (no bloqueamos el cierre)
    const { data: openSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, plate, entry_time')
      .eq('shift_id', shift.id)
      .eq('status', 'open')

    const openSessionsCount = (sessionsError ? 0 : (openSessions?.length ?? 0))

    // 3. Calcular diferencia de caja
    const expectedCashDrawer = parseFloat(shift.expected_cash_drawer || shift.opening_cash)
    const difference = parseFloat(closing_cash) - expectedCashDrawer

    // 4. Cerrar el turno
    const now = new Date().toISOString()
    const { data: closedShift, error: closeError } = await supabase
      .from('shifts')
      .update({
        status: 'closed',
        closing_time: now,
        closing_cash: closing_cash,
        difference: difference,
        notes: notes || shift.notes,
        updated_at: now
      })
      .eq('id', shift.id)
      .select()
      .single()

    if (closeError) {
      return new Response(
        JSON.stringify({ error: 'Error al cerrar turno', details: closeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Obtener estadísticas del turno
    const { data: stats, error: statsError } = await supabase
      .from('payments')
      .select('payment_method, amount')
      .eq('shift_id', shift.id)
      .eq('status', 'completed')

    let totalPayments = 0
    let paymentsByMethod = {
      cash: 0,
      card: 0,
      qr: 0,
      transfer: 0
    }

    if (stats) {
      stats.forEach(payment => {
        totalPayments += parseFloat(payment.amount)
        paymentsByMethod[payment.payment_method] = 
          (paymentsByMethod[payment.payment_method] || 0) + parseFloat(payment.amount)
      })
    }

    // 6. Registrar en audit_logs (incluye closed_with_open_sessions si aplica)
    await supabase
      .from('audit_logs')
      .insert({
        org_id: shift.org_id,
        user_id: userId,
        action: 'shift.closed',
        entity_type: 'shift',
        entity_id: shift.id,
        metadata: {
          parking_id: shift.parking_id,
          opening_time: shift.opening_time,
          closing_time: now,
          opening_cash: shift.opening_cash,
          closing_cash: closing_cash,
          cash_sales: shift.cash_sales,
          expected_cash_drawer: expectedCashDrawer,
          difference: difference,
          total_payments: totalPayments,
          payments_by_method: paymentsByMethod,
          ...(openSessionsCount > 0 && { closed_with_open_sessions: openSessionsCount })
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        shift: closedShift,
        summary: {
          opening_time: shift.opening_time,
          closing_time: now,
          duration_hours: ((new Date(now).getTime() - new Date(shift.opening_time).getTime()) / (1000 * 60 * 60)).toFixed(2),
          opening_cash: shift.opening_cash,
          closing_cash: closing_cash,
          cash_sales: shift.cash_sales,
          expected_cash_drawer: expectedCashDrawer,
          difference: difference,
          difference_status: difference === 0 ? 'exact' : difference > 0 ? 'surplus' : 'shortage',
          total_payments: totalPayments,
          payments_by_method: paymentsByMethod,
          total_sessions: stats ? stats.length : 0
        },
        message: 'Turno cerrado exitosamente'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
