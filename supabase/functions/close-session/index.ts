// Edge Function: close-session
// Cierra una sesión sin procesar pago (por ejemplo, si el cliente no regresó)
// Validaciones:
// - La sesión debe existir y estar abierta
// - El operador debe tener turno abierto

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { session_id, amount: clientAmount, minutes: clientMinutes } = body || {}

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

    const now = new Date()
    const exitTime = now.toISOString()

    // 4. Minutos estacionados (backend) por si el cliente no envía amount/minutes
    const entryTime = new Date(session.entry_time)
    const exitTimeDate = new Date(exitTime)
    const secondsParked = Math.max(0, Math.floor((exitTimeDate.getTime() - entryTime.getTime()) / 1000))
    const minutesChargedBackend = Math.ceil(secondsParked / 60)

    let minutesCharged = minutesChargedBackend
    let estimatedAmount = 0
    let tariffApplied = 0

    // Si la app envía el monto de la ventana de salida, usarlo tal cual (es el que debe quedar registrado)
    const hasClientAmount = typeof clientAmount === 'number' && clientAmount >= 0
    if (hasClientAmount) {
      estimatedAmount = clientAmount
      if (typeof clientMinutes === 'number' && clientMinutes >= 0) {
        minutesCharged = clientMinutes
      }
    }

    // Obtener parking (tope máximo y modo de tarifa) una sola vez
    const { data: parkingRow } = await supabase
      .from('parkings')
      .select('max_daily_amount, pricing_mode, segment_amount, segment_minutes')
      .eq('id', session.parking_id)
      .single()
    const maxDailyAmount = parkingRow?.max_daily_amount != null ? parseFloat(String(parkingRow.max_daily_amount)) : null
    const pricingMode = parkingRow?.pricing_mode ?? 'per_minute'
    const segmentAmount = parkingRow?.segment_amount != null ? parseFloat(String(parkingRow.segment_amount)) : null
    const segmentMinutes = parkingRow?.segment_minutes != null ? parseInt(String(parkingRow.segment_minutes), 10) : null

    if (!hasClientAmount) {
      try {
        let tariffData: { price_per_minute?: number }[] | null = null
        const res = await supabase.rpc('get_active_tariff', {
          p_org_id: shift.org_id,
          p_parking_id: session.parking_id,
          p_timestamp: exitTime
        })
        tariffData = res.data && res.data.length > 0 ? res.data : null
        if (!tariffData) {
          const fallback = await supabase.rpc('get_active_tariff', {
            p_org_id: shift.org_id,
            p_parking_id: null,
            p_timestamp: exitTime
          })
          if (fallback.data && fallback.data.length > 0) tariffData = fallback.data
        }

        if (tariffData && tariffData.length > 0) {
          const tariff = tariffData[0]
          tariffApplied = parseFloat(String(tariff.price_per_minute ?? 0))
          if (pricingMode === 'per_segment' && segmentAmount != null && segmentMinutes != null && segmentMinutes > 0) {
            estimatedAmount = Math.ceil(minutesCharged / segmentMinutes) * segmentAmount
          } else {
            estimatedAmount = minutesCharged * tariffApplied
          }
        }

        if (minutesCharged > 0 && estimatedAmount === 0) {
          let fallbackQuery = supabase
            .from('tariffs')
            .select('price_per_minute')
            .eq('org_id', shift.org_id)
            .lte('valid_from', exitTime)
            .order('valid_from', { ascending: false })
            .limit(1)
          if (session.parking_id) {
            fallbackQuery = fallbackQuery.or(`parking_id.eq.${session.parking_id},parking_id.is.null`)
          } else {
            fallbackQuery = fallbackQuery.is('parking_id', null)
          }
          const { data: anyTariff } = await fallbackQuery.maybeSingle()
          if (anyTariff?.price_per_minute != null) {
            tariffApplied = parseFloat(String(anyTariff.price_per_minute))
            if (pricingMode === 'per_segment' && segmentAmount != null && segmentMinutes != null && segmentMinutes > 0) {
              estimatedAmount = Math.ceil(minutesCharged / segmentMinutes) * segmentAmount
            } else {
              estimatedAmount = minutesCharged * tariffApplied
            }
          }
        }
      } catch (error) {
        console.warn('Error calculando monto estimado:', error)
      }
    }

    if (maxDailyAmount != null && estimatedAmount > maxDailyAmount) estimatedAmount = maxDailyAmount

    // 5. Crear quote temporal para el pago sin pago
    const quoteId = `no_payment_${session_id}_${Date.now()}`
    const { error: quoteError } = await supabase
      .from('payment_quotes')
      .insert({
        quote_id: quoteId,
        org_id: shift.org_id,
        session_id: session_id,
        parking_id: session.parking_id,
        created_by: user.id,
        exit_time_locked: exitTime,
        minutes_locked: minutesCharged,
        amount_locked: estimatedAmount,
        tariff_applied: tariffApplied,
        status: 'used',
        expires_at: new Date(Date.now() + 1000).toISOString() // Expira inmediatamente
      })

    if (quoteError) {
      console.warn('Error creando quote para salida sin pago:', quoteError)
    }

    // 6. Crear registro de pago (quote_id empieza con no_payment_ → en historial se muestra "Sin pago")
    // El monto es el que correspondía a la sesión (estimado por minutos × tarifa) para que aparezca en el historial
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        org_id: shift.org_id,
        session_id: session_id,
        shift_id: shift.id,
        quote_id: quoteId,
        amount: estimatedAmount,
        minutes: minutesCharged,
        exit_time_locked: exitTime,
        tariff_applied: tariffApplied,
        payment_method: 'cash', // Usamos 'cash' pero el contexto indica que fue sin pago
        status: 'completed',
        created_by: user.id
      })

    if (paymentError) {
      console.warn('Error creando pago para salida sin pago:', paymentError)
      // Continuamos aunque falle, para no bloquear el cierre de sesión
    }

    // 7. Cerrar la sesión
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'closed',
        exit_time: exitTime,
        updated_at: exitTime
      })
      .eq('id', session_id)
      .select()
      .single()

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Error al cerrar sesión', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Registrar en audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        org_id: shift.org_id,
        user_id: user.id,
        action: 'session.closed_without_payment',
        entity_type: 'session',
        entity_id: session_id,
        metadata: {
          plate: session.plate,
          entry_time: session.entry_time,
          exit_time: updatedSession.exit_time,
          reason: 'closed_by_operator',
          estimated_amount: estimatedAmount,
          minutes_charged: minutesCharged
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        session: updatedSession,
        estimated_amount: estimatedAmount,
        minutes_charged: minutesCharged,
        message: 'Sesión cerrada exitosamente'
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
