// Edge Function: create-quote
// Crea una cotización (quote) que "congela" el monto a pagar por 120-180 segundos
// Esto evita disputas por recálculos en tiempo real
// Usa ceil() para cobrar por minuto iniciado (desde el segundo 1)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TTL aumentado para permitir el flujo de pago con tarjeta (el intent puede demorar).
// La quote igual queda "locked" y se valida al procesar el pago.
const QUOTE_TTL_SECONDS = 600 // 10 minutos

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Validar JWT del usuario pasando el token explícitamente (evita 401 en Edge Functions)
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { session_id } = await req.json()

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // 2. Obtener la sesión
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .eq('org_id', shift.org_id)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Sesión no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validar que la sesión esté abierta
    if (session.status !== 'open') {
      return new Response(
        JSON.stringify({ error: `La sesión ya está ${session.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verificar que no exista una quote activa para esta sesión
    const { data: existingQuote, error: quoteCheckError } = await supabase
      .from('payment_quotes')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'active')
      .maybeSingle()

    if (quoteCheckError) {
      return new Response(
        JSON.stringify({ error: 'Error al verificar quote existente', details: quoteCheckError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingQuote) {
      // Ya existe una quote activa, devolverla
      return new Response(
        JSON.stringify({ 
          success: true,
          quote: existingQuote,
          message: 'Ya existe una cotización activa para esta sesión'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5b. Obtener tope máximo y modo de tarifa del parking (usar parking_id de sesión o del turno)
    const parkingId = session.parking_id || shift.parking_id
    let parkingRow: { max_daily_amount?: unknown; pricing_mode?: string; segment_amount?: unknown; segment_minutes?: unknown } | null = null
    if (parkingId) {
      const res = await supabase
        .from('parkings')
        .select('max_daily_amount, pricing_mode, segment_amount, segment_minutes')
        .eq('id', parkingId)
        .maybeSingle()
      parkingRow = res.data
      if (res.error) {
        console.warn('create-quote: error fetching parking', res.error.message, 'parkingId=', parkingId)
      }
      if (!parkingRow) {
        console.warn('create-quote: no parking row for parkingId=', parkingId, '- using per_minute')
      }
    }
    const maxDailyAmount = parkingRow?.max_daily_amount != null ? parseFloat(String(parkingRow.max_daily_amount)) : null
    const pricingMode = (parkingRow?.pricing_mode === 'per_segment' ? 'per_segment' : 'per_minute') as string
    const segmentAmount = parkingRow?.segment_amount != null && Number(parkingRow.segment_amount) > 0 ? parseFloat(String(parkingRow.segment_amount)) : null
    const segmentMinutes = parkingRow?.segment_minutes != null && Number(parkingRow.segment_minutes) > 0 ? parseInt(String(parkingRow.segment_minutes), 10) : null

    // 5c. Obtener tarifa activa solo si es necesaria (modo por minuto)
    let pricePerMinute = 0
    if (pricingMode === 'per_minute') {
      const { data: tariffData, error: tariffError } = await supabase
        .rpc('get_active_tariff', { 
          p_org_id: shift.org_id, 
          p_parking_id: parkingId 
        })
      if (tariffError || !tariffData || tariffData.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No se encontró tarifa activa para este parking' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      pricePerMinute = parseFloat(tariffData[0].price_per_minute)
    }

    // 6. Calcular monto (por minuto o por tramo)
    const entryTime = new Date(session.entry_time)
    const exitTime = new Date()
    const secondsParked = Math.floor((exitTime.getTime() - entryTime.getTime()) / 1000)
    const minutesCharged = Math.ceil(secondsParked / 60)
    let amount: number
    if (pricingMode === 'per_segment' && segmentAmount != null && segmentMinutes != null && segmentMinutes > 0) {
      amount = Math.ceil(minutesCharged / segmentMinutes) * segmentAmount
    } else {
      amount = minutesCharged * pricePerMinute
    }
    if (maxDailyAmount != null) amount = Math.min(amount, maxDailyAmount)

    // 7. Calcular expires_at (TTL de 150 segundos)
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + QUOTE_TTL_SECONDS)

    // 8. Crear la quote
    const { data: quote, error: createQuoteError } = await supabase
      .from('payment_quotes')
      .insert({
        org_id: shift.org_id,
        session_id: session_id,
        parking_id: session.parking_id,
        created_by: user.id,
        exit_time_locked: exitTime.toISOString(),
        minutes_locked: minutesCharged,
        tariff_applied: pricePerMinute,
        amount_locked: amount,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      })
      .select()
      .single()

    if (createQuoteError) {
      return new Response(
        JSON.stringify({ error: 'Error al crear cotización', details: createQuoteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Registrar en audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        org_id: shift.org_id,
        user_id: user.id,
        action: 'quote.created',
        entity_type: 'payment_quote',
        entity_id: quote.quote_id,
        metadata: {
          session_id: session_id,
          plate: session.plate,
          amount: amount,
          minutes_charged: minutesCharged,
          seconds_parked: secondsParked,
          ttl_seconds: QUOTE_TTL_SECONDS
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        quote: quote,
        calculation: {
          plate: session.plate,
          entry_time: session.entry_time,
          exit_time: exitTime.toISOString(),
          seconds_parked: secondsParked,
          minutes_parked: minutesCharged,
          tariff_per_minute: pricePerMinute,
          amount: amount,
          expires_at: expiresAt.toISOString(),
          ttl_seconds: QUOTE_TTL_SECONDS
        },
        message: 'Cotización creada exitosamente'
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
