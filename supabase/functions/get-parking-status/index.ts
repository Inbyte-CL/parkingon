// Edge Function: get-parking-status
// Obtiene el estado de ocupación de uno o todos los parkings
// Parámetros opcionales:
// - parking_id: UUID del parking específico (opcional)
// Si no se proporciona parking_id, retorna todos los parkings de la org del usuario

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

    // Obtener org_id del usuario
    const { data: orgId, error: orgError } = await supabase
      .rpc('get_user_org_id', { p_user_id: user.id })

    if (orgError || !orgId) {
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener la organización del usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener parking_id del query string o body
    const url = new URL(req.url)
    const parkingIdParam = url.searchParams.get('parking_id')
    
    let parkingId = parkingIdParam
    if (!parkingId && req.method === 'POST') {
      const body = await req.json()
      parkingId = body.parking_id
    }

    // Si se proporciona parking_id específico
    if (parkingId) {
      const { data: occupancy, error: occupancyError } = await supabase
        .rpc('get_parking_occupancy', { p_parking_id: parkingId })

      if (occupancyError) {
        return new Response(
          JSON.stringify({ error: 'Error al obtener ocupación', details: occupancyError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!occupancy || occupancy.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Parking no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          parking: occupancy[0]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si no se proporciona parking_id, retornar todos los parkings de la org
    const { data: allOccupancy, error: allOccupancyError } = await supabase
      .rpc('get_org_parkings_occupancy', { p_org_id: orgId })

    if (allOccupancyError) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener ocupación', details: allOccupancyError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        parkings: allOccupancy,
        summary: {
          total_parkings: allOccupancy.length,
          total_spaces: allOccupancy.reduce((sum: number, p: any) => sum + (p.total_spaces || 0), 0),
          total_occupied: allOccupancy.reduce((sum: number, p: any) => sum + (p.occupied_spaces || 0), 0),
          total_available: allOccupancy.reduce((sum: number, p: any) => sum + (p.available_spaces || 0), 0)
        }
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
