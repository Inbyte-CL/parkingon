// Edge Function: get-active-sessions
// Obtiene las sesiones activas del turno actual del operador
// Incluye información de duración y ocupación del parking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveSessionPricing } from '../_shared/pricing.ts'
import { syncAbandonedSessions } from '../_shared/debtors.ts'

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: userError?.message || 'No se pudo obtener el usuario',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('parking_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (membershipError) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener parking', details: membershipError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!membership || !membership.parking_id) {
      return new Response(
        JSON.stringify({ error: 'No tienes un parking asignado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parkingId = membership.parking_id
    const now = new Date()

    // Cerrar sesiones de días anteriores → deudores (estacionamiento del día = solo hoy)
    await syncAbandonedSessions(supabaseAdmin)

    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, plate, entry_time, session_code, status, shift_id, is_agreement, parking_tariff_plan_id')
      .eq('parking_id', parkingId)
      .eq('status', 'open')
      .order('entry_time', { ascending: false })

    if (sessionsError) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener sesiones', details: sessionsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: parkingData, error: parkingError } = await supabaseAdmin
      .from('parkings')
      .select('org_id, max_daily_amount, pricing_mode, segment_amount, segment_minutes, multiple_tariffs_enabled')
      .eq('id', parkingId)
      .single()

    if (parkingError) {
      console.error('Error getting parking:', parkingError)
    }

    const { data: tariffPlans } = await supabaseAdmin
      .from('parking_tariff_plans')
      .select('*')
      .eq('parking_id', parkingId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })

    const planById = new Map((tariffPlans || []).map((p) => [p.id, p]))

    const { data: activeTariff, error: tariffError } = await supabaseAdmin.rpc('get_active_tariff', {
      p_org_id: parkingData?.org_id,
      p_parking_id: parkingId,
      p_timestamp: now.toISOString(),
    })

    if (tariffError) {
      console.error('Error getting tariff:', tariffError)
    }

    const defaultPricePerMinute = activeTariff?.[0]?.price_per_minute || 0
    const defaultPricing = resolveSessionPricing(null, parkingData as any, defaultPricePerMinute)

    // Consultar deudas activas de todas las patentes en sesión de una sola vez
    const allPlates = [...new Set((sessions || []).map((s) => s.plate))]
    let debtByPlate: Map<string, { total: number; debts: any[] }> = new Map()
    if (allPlates.length > 0) {
      const { data: debtRows } = await supabaseAdmin
        .from('debtor_sessions')
        .select('plate, amount_owed, tariff_plan_name, abandoned_at, id')
        .eq('org_id', parkingData?.org_id)
        .eq('status', 'active')
        .in('plate', allPlates)
      for (const row of (debtRows || [])) {
        const existing = debtByPlate.get(row.plate) ?? { total: 0, debts: [] }
        existing.total += parseFloat(String(row.amount_owed))
        existing.debts.push({
          id: row.id,
          amount_owed: parseFloat(String(row.amount_owed)),
          tariff_plan_name: row.tariff_plan_name,
          abandoned_at: row.abandoned_at,
        })
        debtByPlate.set(row.plate, existing)
      }
    }

    const sessionsWithDuration = (sessions || []).map((session) => {
      const entryTime = new Date(session.entry_time)
      const durationMinutes = Math.floor((now.getTime() - entryTime.getTime()) / (1000 * 60))
      const plan = session.parking_tariff_plan_id
        ? planById.get(session.parking_tariff_plan_id) ?? null
        : null
      const sessionPricing = resolveSessionPricing(plan as any, parkingData as any, defaultPricePerMinute)
      const debtInfo = debtByPlate.get(session.plate)

      return {
        id: session.id,
        plate: session.plate,
        entry_time: session.entry_time,
        session_code: session.session_code,
        duration_minutes: durationMinutes,
        status: session.status,
        is_agreement: session.is_agreement === true,
        parking_tariff_plan_id: session.parking_tariff_plan_id ?? null,
        tariff_plan_name: sessionPricing.tariffPlanName,
        price_per_minute: sessionPricing.pricePerMinute,
        max_daily_amount: sessionPricing.maxDailyAmount,
        pricing_mode: sessionPricing.pricingMode,
        segment_amount: sessionPricing.segmentAmount,
        segment_minutes: sessionPricing.segmentMinutes,
        minimum_stay_hours: sessionPricing.minimumStayHours,
        minimum_amount: sessionPricing.minimumAmount,
        // Deuda previa
        has_debt: (debtInfo?.total ?? 0) > 0,
        debt_amount: debtInfo?.total ?? 0,
        debt_details: debtInfo?.debts ?? [],
      }
    })

    const { data: occupancyData, error: occupancyError } = await supabaseAdmin.rpc(
      'get_parking_occupancy',
      { p_parking_id: parkingId }
    )

    if (occupancyError) {
      console.error('Error getting occupancy:', occupancyError)
    }

    const occupancy = occupancyData?.[0] || {
      total_spaces: 0,
      occupied_spaces: sessionsWithDuration.length,
      available_spaces: 0,
      occupancy_percentage: 0,
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessions: sessionsWithDuration,
        occupancy: {
          total_spaces: occupancy.total_spaces,
          occupied_spaces: occupancy.occupied_spaces,
          available_spaces: occupancy.available_spaces,
          occupancy_percentage: occupancy.occupancy_percentage,
        },
        multiple_tariffs_enabled: parkingData?.multiple_tariffs_enabled === true,
        tariff_plans: (tariffPlans || []).map((p) => ({
          id: p.id,
          name: p.name,
          pricing_mode: p.pricing_mode,
          price_per_minute: p.price_per_minute,
          segment_amount: p.segment_amount,
          segment_minutes: p.segment_minutes,
          max_daily_amount: p.max_daily_amount,
          minimum_stay_hours: p.minimum_stay_hours,
          minimum_amount: p.minimum_amount,
        })),
        price_per_minute: defaultPricing.pricePerMinute,
        max_daily_amount: defaultPricing.maxDailyAmount,
        pricing_mode: defaultPricing.pricingMode,
        segment_amount: defaultPricing.segmentAmount,
        segment_minutes: defaultPricing.segmentMinutes,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
