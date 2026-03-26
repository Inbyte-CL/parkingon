// Edge Function: get-active-sessions
// Obtiene las sesiones activas del turno actual del operador
// Incluye información de duración y ocupación del parking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== get-active-sessions called ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    console.log('Auth header length:', authHeader?.length || 0)
    
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente con service_role para validar el token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    console.log('Supabase URL:', supabaseUrl ? 'present' : 'missing')
    console.log('Service role key:', serviceRoleKey ? 'present' : 'missing')
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener usuario autenticado
    console.log('Attempting to get user...')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser()
    console.log('User result:', user ? `user.id=${user.id}` : 'null')
    console.log('User error:', userError ? JSON.stringify(userError) : 'null')

    if (userError || !user) {
      console.error('Error getting user:', userError)
      console.error('Auth header present:', !!authHeader)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token', 
          details: userError?.message || 'No se pudo obtener el usuario',
          code: userError?.status || 401
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Obtener parking_id del usuario desde su membership activa
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

    // 2. Obtener TODAS las sesiones activas del parking (no solo del turno actual)
    // Esto asegura que todos los usuarios del mismo parking vean la misma información
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, plate, entry_time, session_code, status, shift_id')
      .eq('parking_id', parkingId)
      .eq('status', 'open')
      .order('entry_time', { ascending: false })

    if (sessionsError) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener sesiones', details: sessionsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Calcular duración de cada sesión
    const now = new Date()
    const sessionsWithDuration = (sessions || []).map(session => {
      const entryTime = new Date(session.entry_time)
      const durationMs = now.getTime() - entryTime.getTime()
      const durationMinutes = Math.floor(durationMs / (1000 * 60))
      
      return {
        id: session.id,
        plate: session.plate,
        entry_time: session.entry_time,
        session_code: session.session_code,
        duration_minutes: durationMinutes,
        status: session.status
      }
    })

    // 4. Obtener información de ocupación del parking
    const { data: occupancyData, error: occupancyError } = await supabaseAdmin
      .rpc('get_parking_occupancy', { p_parking_id: parkingId })

    if (occupancyError) {
      console.error('Error getting occupancy:', occupancyError)
      // No es crítico, continuamos sin esta información
    }

    const occupancy = occupancyData?.[0] || {
      total_spaces: 0,
      occupied_spaces: sessionsWithDuration.length,
      available_spaces: 0,
      occupancy_percentage: 0
    }

    // 5. Obtener tarifa activa, tope máximo y modo de tarifa del parking
    const { data: parkingData, error: parkingError } = await supabaseAdmin
      .from('parkings')
      .select('org_id, max_daily_amount, pricing_mode, segment_amount, segment_minutes')
      .eq('id', parkingId)
      .single()

    if (parkingError) {
      console.error('Error getting parking:', parkingError)
    }

    // Obtener tarifa activa usando la función RPC
    const { data: activeTariff, error: tariffError } = await supabaseAdmin
      .rpc('get_active_tariff', { 
        p_org_id: parkingData?.org_id,
        p_parking_id: parkingId,
        p_timestamp: new Date().toISOString()
      })

    if (tariffError) {
      console.error('Error getting tariff:', tariffError)
      // No es crítico, continuamos sin esta información
    }

    console.log('Tariff data:', activeTariff)
    const pricePerMinute = activeTariff?.[0]?.price_per_minute || 0
    console.log('Price per minute:', pricePerMinute)

    const pricingMode = parkingData?.pricing_mode === 'per_segment' ? 'per_segment' : 'per_minute'
    const segmentAmount = parkingData?.segment_amount != null && Number(parkingData.segment_amount) > 0
      ? parseFloat(String(parkingData.segment_amount))
      : null
    const segmentMinutes = parkingData?.segment_minutes != null && Number(parkingData.segment_minutes) > 0
      ? parseInt(String(parkingData.segment_minutes), 10)
      : null

    return new Response(
      JSON.stringify({
        success: true,
        sessions: sessionsWithDuration,
        occupancy: {
          total_spaces: occupancy.total_spaces,
          occupied_spaces: occupancy.occupied_spaces,
          available_spaces: occupancy.available_spaces,
          occupancy_percentage: occupancy.occupancy_percentage
        },
        price_per_minute: pricePerMinute,
        max_daily_amount: parkingData?.max_daily_amount != null ? parseFloat(String(parkingData.max_daily_amount)) : null,
        pricing_mode: pricingMode,
        segment_amount: segmentAmount,
        segment_minutes: segmentMinutes
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
