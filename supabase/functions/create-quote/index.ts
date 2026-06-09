// Edge Function: create-quote
// Crea una cotización (quote) que "congela" el monto a pagar por 120-180 segundos
// Esto evita disputas por recálculos en tiempo real
// Usa ceil() para cobrar por minuto iniciado (desde el segundo 1)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { computeParkingAmount, resolveSessionPricing } from '../_shared/pricing.ts'

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

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('operation_mode')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'No se encontró membresía activa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const operationMode = membership.operation_mode ?? 'both'
    if (operationMode === 'entry_only') {
      return new Response(
        JSON.stringify({ error: 'Tu perfil solo permite registrar entradas.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          is_agreement: session.is_agreement === true,
          message: 'Ya existe una cotización activa para esta sesión'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAgreementSession = session.is_agreement === true

    // Patente en convenio: monto cero, sin tarifa
    if (isAgreementSession) {
      const entryTime = new Date(session.entry_time)
      const exitTime = new Date()
      const secondsParked = Math.floor((exitTime.getTime() - entryTime.getTime()) / 1000)
      const minutesCharged = Math.ceil(secondsParked / 60)
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + QUOTE_TTL_SECONDS)

      const { data: quote, error: createQuoteError } = await supabase
        .from('payment_quotes')
        .insert({
          org_id: shift.org_id,
          session_id: session_id,
          parking_id: session.parking_id,
          created_by: user.id,
          exit_time_locked: exitTime.toISOString(),
          minutes_locked: minutesCharged,
          tariff_applied: 0,
          amount_locked: 0,
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

      return new Response(
        JSON.stringify({
          success: true,
          quote,
          is_agreement: true,
          calculation: {
            plate: session.plate,
            entry_time: session.entry_time,
            exit_time: exitTime.toISOString(),
            seconds_parked: secondsParked,
            minutes_parked: minutesCharged,
            tariff_per_minute: 0,
            amount: 0,
            expires_at: expiresAt.toISOString(),
            ttl_seconds: QUOTE_TTL_SECONDS
          },
          message: 'Cotización de convenio (pago liberado)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5b. Obtener configuración del parking y plan de tarifa de la sesión
    const parkingId = session.parking_id || shift.parking_id
    let parkingRow: {
      max_daily_amount?: unknown
      pricing_mode?: string
      segment_amount?: unknown
      segment_minutes?: unknown
    } | null = null
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
    }

    let tariffPlan: Record<string, unknown> | null = null
    if (session.parking_tariff_plan_id) {
      const { data: planRow, error: planError } = await supabase
        .from('parking_tariff_plans')
        .select('*')
        .eq('id', session.parking_tariff_plan_id)
        .eq('status', 'active')
        .maybeSingle()
      if (planError) {
        console.warn('create-quote: error fetching tariff plan', planError.message)
      }
      tariffPlan = planRow
    }

    let pricePerMinute = 0
    if (!tariffPlan) {
      const { data: tariffData, error: tariffError } = await supabase.rpc('get_active_tariff', {
        p_org_id: shift.org_id,
        p_parking_id: parkingId,
      })
      if (tariffError || !tariffData || tariffData.length === 0) {
        const pricingModeDefault = parkingRow?.pricing_mode === 'per_segment' ? 'per_segment' : 'per_minute'
        if (pricingModeDefault === 'per_minute') {
          return new Response(
            JSON.stringify({ error: 'No se encontró tarifa activa para este parking' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        pricePerMinute = parseFloat(tariffData[0].price_per_minute)
      }
    }

    const pricing = resolveSessionPricing(
      tariffPlan as any,
      parkingRow as any,
      pricePerMinute
    )

    // 6. Consultar deuda previa activa de esta patente
    let debtAmount = 0
    let debtIds: string[] = []
    let debtDetails: Array<{ id: string; amount_owed: number; tariff_plan_name: string | null; abandoned_at: string }> = []
    const { data: debtRows } = await supabase
      .from('debtor_sessions')
      .select('id, amount_owed, tariff_plan_name, abandoned_at')
      .eq('org_id', shift.org_id)
      .eq('plate', session.plate)
      .eq('status', 'active')
    for (const d of (debtRows || [])) {
      debtAmount += parseFloat(String(d.amount_owed))
      debtIds.push(d.id)
      debtDetails.push({
        id: d.id,
        amount_owed: parseFloat(String(d.amount_owed)),
        tariff_plan_name: d.tariff_plan_name,
        abandoned_at: d.abandoned_at,
      })
    }

    // 7. Calcular monto de la sesión actual (por minuto o por tramo, con estadía mínima si aplica)
    const entryTime = new Date(session.entry_time)
    const exitTime = new Date()
    const secondsParked = Math.floor((exitTime.getTime() - entryTime.getTime()) / 1000)
    const minutesCharged = Math.ceil(secondsParked / 60)
    const sessionAmount = computeParkingAmount({
      minutesCharged,
      pricingMode: pricing.pricingMode,
      pricePerMinute: pricing.pricePerMinute,
      segmentAmount: pricing.segmentAmount,
      segmentMinutes: pricing.segmentMinutes,
      maxDailyAmount: pricing.maxDailyAmount,
      minimumStayHours: pricing.minimumStayHours,
      minimumAmount: pricing.minimumAmount,
    })
    pricePerMinute = pricing.pricePerMinute

    const totalAmount = sessionAmount + debtAmount

    // 7. Calcular expires_at (TTL de 150 segundos)
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + QUOTE_TTL_SECONDS)

    // 8. Crear la quote con monto total (sesión + deuda)
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
        amount_locked: totalAmount,
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
        is_agreement: false,
        has_debt: debtAmount > 0,
        debt_amount: debtAmount,
        debt_details: debtDetails,
        session_amount: sessionAmount,
        calculation: {
          plate: session.plate,
          entry_time: session.entry_time,
          exit_time: exitTime.toISOString(),
          seconds_parked: secondsParked,
          minutes_parked: minutesCharged,
          tariff_per_minute: pricePerMinute,
          session_amount: sessionAmount,
          debt_amount: debtAmount,
          amount: totalAmount,
          expires_at: expiresAt.toISOString(),
          ttl_seconds: QUOTE_TTL_SECONDS
        },
        message: debtAmount > 0
          ? `Cotización creada — incluye deuda previa de ${debtAmount}`
          : 'Cotización creada exitosamente'
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
