// Edge Function: create-session
// Crea una nueva sesión de estacionamiento
// Validaciones:
// - Operador debe tener turno abierto
// - No debe existir sesión abierta para la misma patente en el mismo parking
// - Normaliza la patente automáticamente

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
    const { plate } = await req.json()

    if (!plate) {
      return new Response(
        JSON.stringify({ error: 'plate es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Validar que el operador tenga un turno abierto
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

    // 2. Obtener parking_id del turno activo
    const parking_id = shift.parking_id

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
      .eq('org_id', shift.org_id)
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
          org_id: shift.org_id,
          parking_id: parking_id,
          shift_id: shift.id,
          session_code: sessionCode,
          plate: normalizedPlate,
          entry_time: new Date().toISOString(),
          status: 'open',
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
        org_id: shift.org_id,
        user_id: user.id,
        action: 'session.created',
        entity_type: 'session',
        entity_id: session.id,
        metadata: {
          plate: normalizedPlate,
          parking_id: parking_id,
          shift_id: shift.id,
          entry_time: session.entry_time
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        session: session,
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
