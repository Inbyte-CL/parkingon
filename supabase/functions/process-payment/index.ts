// Edge Function: process-payment
// Procesa un pago usando una quote activa
// Validaciones:
// - Debe existir una quote activa y no expirada
// - El monto del cliente debe coincidir con el monto de la quote
// - Actualiza cash_sales del turno si el pago es en efectivo
// - Cierra la sesión automáticamente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Empty token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Validar JWT del usuario pasando el token explícitamente (mismo patrón que create-quote)
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { quote_id, payment_method, klap_code } = await req.json()

    if (!quote_id || !payment_method) {
      return new Response(
        JSON.stringify({ error: 'quote_id y payment_method son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar payment_method
    const validMethods = ['cash', 'card', 'qr', 'transfer']
    if (!validMethods.includes(payment_method)) {
      return new Response(
        JSON.stringify({ error: `payment_method debe ser uno de: ${validMethods.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Código Klap (MC_CODE) solo aplica a pagos con tarjeta aprobados.
    // Para efectivo/otros, o si no viene, se guarda '0' (N/A).
    const klapCodeToStore =
      payment_method === 'card'
        ? (typeof klap_code === 'string'
            ? (klap_code.trim().length > 0 ? klap_code.trim() : '0')
            : (klap_code != null ? String(klap_code).trim() || '0' : '0'))
        : '0'

    // 1. Validar que el operador tenga turno abierto
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle()

    if (shiftError || !shift) {
      return new Response(
        JSON.stringify({ error: 'No tienes un turno abierto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Obtener la quote
    const { data: quote, error: quoteError } = await supabase
      .from('payment_quotes')
      .select('*')
      .eq('quote_id', quote_id)
      .eq('org_id', shift.org_id)
      .single()

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: 'Cotización no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validar que la quote esté activa
    if (quote.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `La cotización ya está ${quote.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Validar que la quote no haya expirado
    const now = new Date()
    const expiresAt = new Date(quote.expires_at)
    if (now > expiresAt) {
      // Marcar quote como expirada
      await supabase
        .from('payment_quotes')
        .update({ status: 'expired' })
        .eq('quote_id', quote_id)

      return new Response(
        JSON.stringify({ 
          error: 'La cotización ha expirado. Por favor, genera una nueva cotización.',
          expired_at: quote.expires_at
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Obtener la sesión
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', quote.session_id)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Sesión no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Validar que la sesión esté abierta
    if (session.status !== 'open') {
      return new Response(
        JSON.stringify({ error: `La sesión ya está ${session.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Crear el pago
    const insertBase = {
      org_id: shift.org_id,
      session_id: quote.session_id,
      shift_id: shift.id,
      quote_id: quote_id,
      amount: quote.amount_locked,
      minutes: quote.minutes_locked,
      exit_time_locked: quote.exit_time_locked,
      tariff_applied: quote.tariff_applied,
      payment_method: payment_method,
      status: 'completed',
      created_by: user.id
    }

    // Intentar guardar klap_code si existe la columna. Si la BD aún no fue migrada,
    // reintentar sin el campo para no bloquear el cierre de sesión.
    let payment: any = null
    const withKlap = { ...insertBase, klap_code: klapCodeToStore }
    const firstTry = await supabase.from('payments').insert(withKlap).select().single()
    if (!firstTry.error) {
      payment = firstTry.data
    } else {
      const msg = firstTry.error.message ?? ''
      const looksLikeMissingColumn =
        msg.includes('klap_code') && (msg.includes('Could not find') || msg.includes('column') || msg.includes('schema cache'))
      if (!looksLikeMissingColumn) {
        return new Response(
          JSON.stringify({ error: 'Error al crear pago', details: msg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.warn('payments.klap_code no existe aún; reintentando insert sin klap_code')
      const retry = await supabase.from('payments').insert(insertBase).select().single()
      if (retry.error) {
        return new Response(
          JSON.stringify({ error: 'Error al crear pago', details: retry.error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      payment = retry.data
    }

    // 8. Marcar quote como usada
    await supabase
      .from('payment_quotes')
      .update({ status: 'used' })
      .eq('quote_id', quote_id)

    // 9. Cerrar la sesión
    const { error: sessionUpdateError } = await supabase
      .from('sessions')
      .update({
        status: 'closed',
        exit_time: now.toISOString()
      })
      .eq('id', quote.session_id)

    if (sessionUpdateError) {
      console.error('Error al actualizar sesión:', sessionUpdateError)
      // Continuar de todas formas, el pago ya está registrado
    }

    // 10. Si el pago es en efectivo, actualizar cash_sales del turno
    if (payment_method === 'cash') {
      const currentCashSales = shift.cash_sales || 0
      const newCashSales = parseFloat(currentCashSales) + parseFloat(quote.amount_locked)

      await supabase
        .from('shifts')
        .update({
          cash_sales: newCashSales,
          expected_cash_drawer: parseFloat(shift.opening_cash) + newCashSales
        })
        .eq('id', shift.id)
    }

    // 11. Registrar en audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        org_id: shift.org_id,
        user_id: user.id,
        action: 'payment.completed',
        entity_type: 'payment',
        entity_id: payment.id,
        metadata: {
          session_id: quote.session_id,
          quote_id: quote_id,
          plate: session.plate,
          amount: quote.amount_locked,
          payment_method: payment_method,
          shift_id: shift.id
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        payment: payment,
        session: {
          id: session.id,
          plate: session.plate,
          entry_time: session.entry_time,
          exit_time: now.toISOString(),
          status: 'paid'
        },
        message: 'Pago procesado exitosamente'
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
