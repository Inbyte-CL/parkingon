// Edge Function: create-session
// Crea una nueva sesión de estacionamiento
// Validaciones:
// - Operador debe tener turno abierto
// - No debe existir sesión abierta para la misma patente en el mismo parking
// - Normaliza la patente automáticamente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveSessionPricing } from '../_shared/pricing.ts'

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

    // Cliente con service_role para operaciones; validamos el JWT del usuario explícitamente
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Validar JWT del usuario pasando el token explícitamente (evita 401 en Edge Functions)
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: userError?.message ?? 'Token inválido o expirado. Cierra sesión y vuelve a iniciar sesión.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener datos del request
    const { plate, parking_tariff_plan_id } = await req.json()

    if (!plate) {
      return new Response(
        JSON.stringify({ error: 'plate es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Membresía y modo de operación
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id, parking_id, operation_mode')
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

    if (operationMode === 'exit_only') {
      return new Response(
        JSON.stringify({ error: 'Tu perfil solo permite registrar salidas. No puedes crear entradas.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let org_id: string
    let parking_id: string
    let shift_id: string | null = null

    if (operationMode === 'entry_only') {
      if (!membership.parking_id) {
        return new Response(
          JSON.stringify({ error: 'No tienes un parking asignado. Contacta al administrador.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      org_id = membership.org_id
      parking_id = membership.parking_id
    } else {
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle()

      if (shiftError) {
        return new Response(
          JSON.stringify({ error: 'Error al verificar turno', details: shiftError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!shift) {
        return new Response(
          JSON.stringify({ error: 'No tienes un turno abierto. Debes abrir un turno antes de crear sesiones.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      org_id = shift.org_id
      parking_id = shift.parking_id
      shift_id = shift.id
    }

    // 3. Normalizar patente
    const { data: normalizedPlate, error: normalizeError } = await supabase
      .rpc('normalize_plate', { input: plate })

    if (normalizeError) {
      return new Response(
        JSON.stringify({ error: 'Error al normalizar patente', details: normalizeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verificar que no exista sesión abierta para esta patente en este parking
    const { data: existingSession, error: existingError } = await supabase
      .from('sessions')
      .select('*')
      .eq('org_id', org_id)
      .eq('parking_id', parking_id)
      .eq('plate', normalizedPlate)
      .eq('status', 'open')
      .maybeSingle()

    if (existingError) {
      return new Response(
        JSON.stringify({ error: 'Error al verificar sesión existente', details: existingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingSession) {
      return new Response(
        JSON.stringify({ 
          error: 'Ya existe una sesión abierta para esta patente en este parking',
          existing_session: {
            id: existingSession.id,
            entry_time: existingSession.entry_time,
            plate: existingSession.plate
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4.55. Validar tarifa múltiple si aplica
    const { data: parkingConfig, error: parkingConfigError } = await supabase
      .from('parkings')
      .select('multiple_tariffs_enabled, max_daily_amount, pricing_mode, segment_amount, segment_minutes')
      .eq('id', parking_id)
      .maybeSingle()

    if (parkingConfigError) {
      return new Response(
        JSON.stringify({ error: 'Error al verificar configuración del parking', details: parkingConfigError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let parkingTariffPlanId: string | null = null
    let tariffPlanRow: {
      id: string
      name: string
      pricing_mode: string
      price_per_minute: number | null
      segment_amount: number | null
      segment_minutes: number | null
      max_daily_amount: number | null
      minimum_stay_hours: number | null
      minimum_amount: number | null
    } | null = null
    const multipleEnabled = parkingConfig?.multiple_tariffs_enabled === true

    if (multipleEnabled) {
      if (!parking_tariff_plan_id) {
        return new Response(
          JSON.stringify({ error: 'Debe seleccionar una tarifa para registrar el ingreso' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const { data: plan, error: planError } = await supabase
        .from('parking_tariff_plans')
        .select('id, name, pricing_mode, price_per_minute, segment_amount, segment_minutes, max_daily_amount, minimum_stay_hours, minimum_amount')
        .eq('id', parking_tariff_plan_id)
        .eq('parking_id', parking_id)
        .eq('org_id', org_id)
        .eq('status', 'active')
        .maybeSingle()

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: 'La tarifa seleccionada no es válida para este parking' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      parkingTariffPlanId = plan.id
      tariffPlanRow = plan
    }

    // 4.5. Verificar capacidad del parking (opcional)
    const { data: occupancyData, error: occupancyError } = await supabase
      .rpc('get_parking_occupancy', { p_parking_id: parking_id })

    if (!occupancyError && occupancyData && occupancyData.length > 0) {
      const occupancy = occupancyData[0]
      
      // Si el parking tiene capacidad definida y está lleno, rechazar
      if (occupancy.total_spaces && occupancy.available_spaces !== null && occupancy.available_spaces <= 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Parking lleno. No hay espacios disponibles.',
            occupancy: {
              total_spaces: occupancy.total_spaces,
              occupied_spaces: occupancy.occupied_spaces,
              available_spaces: occupancy.available_spaces,
              occupancy_percentage: occupancy.occupancy_percentage
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 4.6. Verificar patente en convenio (pago liberado)
    const { data: isAgreementPlate, error: agreementCheckError } = await supabase
      .rpc('is_plate_in_agreement', { p_org_id: org_id, p_plate: normalizedPlate })

    if (agreementCheckError) {
      console.warn('create-session: agreement check failed', agreementCheckError.message)
    }
    const isAgreement = isAgreementPlate === true

    // 5. Generar código de sesión único (8 dígitos = 90M códigos; reintentos si hay colisión)
    const MAX_RETRIES = 5
    let sessionCode = ''
    let session: any = null
    let sessionError: any = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      sessionCode = Math.floor(10000000 + Math.random() * 90000000).toString() // 10000000 - 99999999
      const result = await supabase
        .from('sessions')
        .insert({
          org_id: org_id,
          parking_id: parking_id,
          shift_id: shift_id,
          session_code: sessionCode,
          plate: normalizedPlate,
          entry_time: new Date().toISOString(),
          status: 'open',
          is_agreement: isAgreement,
          parking_tariff_plan_id: parkingTariffPlanId,
          created_by: user.id
        })
        .select()
        .single()

      session = result.data
      sessionError = result.error

      if (!sessionError) break
      // Código 23505 = unique_violation en PostgreSQL; reintentar con otro código
      if (sessionError.code === '23505' && attempt < MAX_RETRIES - 1) continue
      break
    }

    if (sessionError) {
      return new Response(
        JSON.stringify({
          error: 'Error al crear sesión',
          details: sessionError.code === '23505'
            ? 'No se pudo generar un código único. Intenta de nuevo.'
            : sessionError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Registrar en audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        org_id: org_id,
        user_id: user.id,
        action: 'session.created',
        entity_type: 'session',
        entity_id: session.id,
        metadata: {
          plate: normalizedPlate,
          parking_id: parking_id,
          shift_id: shift_id,
          operation_mode: operationMode,
          entry_time: session.entry_time,
          is_agreement: isAgreement,
          parking_tariff_plan_id: parkingTariffPlanId
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        session: {
          ...session,
          ...(tariffPlanRow
            ? (() => {
                const pricing = resolveSessionPricing(tariffPlanRow, parkingConfig as any, 0)
                return {
                  tariff_plan_name: pricing.tariffPlanName,
                  price_per_minute: pricing.pricePerMinute,
                  pricing_mode: pricing.pricingMode,
                  segment_amount: pricing.segmentAmount,
                  segment_minutes: pricing.segmentMinutes,
                  minimum_stay_hours: pricing.minimumStayHours,
                  minimum_amount: pricing.minimumAmount,
                }
              })()
            : {}),
        },
        is_agreement: isAgreement,
        message: 'Sesión creada exitosamente'
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
