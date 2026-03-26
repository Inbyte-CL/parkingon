// Edge Function: open-shift
// Abre un nuevo turno para un operador
// Validaciones:
// - El operador no debe tener otro turno abierto
// - Debe especificar el parking y la caja inicial
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { parking_id, opening_cash, notes } = await req.json()

    if (!parking_id || opening_cash === undefined || opening_cash === null) {
      return new Response(
        JSON.stringify({ error: 'parking_id y opening_cash son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar que opening_cash sea un número positivo
    if (isNaN(opening_cash) || opening_cash < 0) {
      return new Response(
        JSON.stringify({ error: 'opening_cash debe ser un número positivo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Obtener org_id del usuario
    const { data: orgId, error: orgError } = await supabaseAdmin
      .rpc('get_user_org_id', { p_user_id: userId })

    if (orgError || !orgId) {
      return new Response(
        JSON.stringify({ 
          error: 'No se pudo obtener la organización del usuario',
          details: { user_id: userId, orgError: orgError?.message, orgId: orgId }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validar que el parking exista y pertenezca a la organización
    const { data: parking, error: parkingError } = await supabaseAdmin
      .from('parkings')
      .select('*')
      .eq('id', parking_id)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .maybeSingle()

    if (parkingError || !parking) {
      return new Response(
        JSON.stringify({ 
          error: 'Parking no encontrado o inactivo',
          details: {
            parking_id: parking_id,
            org_id: orgId,
            parkingError: parkingError?.message,
            parking: parking
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verificar que el operador no tenga otro turno abierto
    // Usar service_role para evitar problemas de RLS cuando el usuario cambió de organización
    const { data: existingShifts, error: shiftCheckError } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')

    if (shiftCheckError) {
      return new Response(
        JSON.stringify({ error: 'Error al verificar turno existente', details: shiftCheckError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si hay turnos abiertos, verificar si son de la misma organización
    if (existingShifts && existingShifts.length > 0) {
      const sameOrgShift = existingShifts.find(s => s.org_id === orgId)
      
      if (sameOrgShift) {
        // Turno abierto en la misma organización - no permitir
        return new Response(
          JSON.stringify({ 
            error: 'Ya tienes un turno abierto. Debes cerrarlo antes de abrir uno nuevo.',
            existing_shift: {
              id: sameOrgShift.id,
              parking_id: sameOrgShift.parking_id,
              opening_time: sameOrgShift.opening_time,
              opening_cash: sameOrgShift.opening_cash
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Turnos abiertos en otra organización - cerrarlos automáticamente
        for (const oldShift of existingShifts) {
          // Calcular cash_sales del turno
          const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('amount')
            .eq('shift_id', oldShift.id)
            .eq('status', 'completed')
            .eq('payment_method', 'cash')
          
          const cashSales = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0
          const expectedCash = Number(oldShift.opening_cash || 0) + cashSales
          const closingCash = expectedCash // Asumir que la caja coincide
          
          // Cerrar el turno antiguo
          await supabaseAdmin
            .from('shifts')
            .update({
              status: 'closed',
              closing_time: new Date().toISOString(),
              closing_cash: closingCash,
              cash_sales: cashSales,
              expected_cash_drawer: expectedCash,
              difference: 0,
              notes: (oldShift.notes || '') + ' [Cerrado automáticamente: usuario cambió de organización/parking]'
            })
            .eq('id', oldShift.id)
        }
      }
    }

    // 4. Crear el turno
    const now = new Date().toISOString()
    let shift: any = null
    
    const { data: newShift, error: createError } = await supabaseAdmin
      .from('shifts')
      .insert({
        org_id: orgId,
        user_id: userId,
        parking_id: parking_id,
        status: 'open',
        opening_time: now,
        opening_cash: opening_cash,
        cash_sales: 0,
        expected_cash_drawer: opening_cash,
        notes: notes || null
      })
      .select()
      .single()

    if (createError) {
      // Si el error es de constraint único, intentar cerrar turnos abiertos y reintentar
      if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique constraint')) {
        // Buscar y cerrar cualquier turno abierto restante
        const { data: remainingShifts } = await supabaseAdmin
          .from('shifts')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'open')
        
        if (remainingShifts && remainingShifts.length > 0) {
          for (const oldShift of remainingShifts) {
            const { data: payments } = await supabaseAdmin
              .from('payments')
              .select('amount')
              .eq('shift_id', oldShift.id)
              .eq('status', 'completed')
              .eq('payment_method', 'cash')
            
            const cashSales = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0
            const expectedCash = Number(oldShift.opening_cash || 0) + cashSales
            
            await supabaseAdmin
              .from('shifts')
              .update({
                status: 'closed',
                closing_time: new Date().toISOString(),
                closing_cash: expectedCash,
                cash_sales: cashSales,
                expected_cash_drawer: expectedCash,
                difference: 0,
                notes: (oldShift.notes || '') + ' [Cerrado automáticamente: conflicto al abrir nuevo turno]'
              })
              .eq('id', oldShift.id)
          }
          
          // Reintentar crear el turno
          const { data: retryShift, error: retryError } = await supabaseAdmin
            .from('shifts')
            .insert({
              org_id: orgId,
              user_id: userId,
              parking_id: parking_id,
              status: 'open',
              opening_time: now,
              opening_cash: opening_cash,
              cash_sales: 0,
              expected_cash_drawer: opening_cash,
              notes: notes || null
            })
            .select()
            .single()
          
          if (retryError) {
            return new Response(
              JSON.stringify({ error: 'Error al crear turno después de cerrar turnos anteriores', details: retryError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          shift = retryShift
        } else {
          return new Response(
            JSON.stringify({ error: 'Error al crear turno', details: createError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Error al crear turno', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      shift = newShift
    }

    // 5. Registrar en audit_logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        org_id: orgId,
        user_id: userId,
        action: 'shift.opened',
        entity_type: 'shift',
        entity_id: shift.id,
        metadata: {
          parking_id: parking_id,
          parking_name: parking.name,
          opening_cash: opening_cash,
          opening_time: now
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        shift: shift,
        parking: {
          id: parking.id,
          name: parking.name,
          address: parking.address
        },
        message: 'Turno abierto exitosamente'
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
