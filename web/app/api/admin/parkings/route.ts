import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no encontrada' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let query = supabase
      .from('parkings')
      .select('id, org_id, name, address, status, total_spaces, max_daily_amount, pricing_mode, segment_amount, segment_minutes, created_at, updated_at, organizations:org_id(name)')
      .order('name')

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: `Error al obtener parkings: ${error.message}` },
        { status: 500 }
      )
    }

    const parkingsList = data || []
    const now = new Date().toISOString()

    // Una sola consulta de tarifas vigentes por orgs (evita N+1 y cuelgues)
    const orgIds = Array.from(new Set(parkingsList.map((p: any) => p.org_id)))
    const { data: tariffsRows } = await supabase
      .from('tariffs')
      .select('id, org_id, parking_id, price_per_minute, valid_from, valid_until')
      .in('org_id', orgIds)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order('valid_from', { ascending: false })

    const tariffByKey = new Map<string, { id: string; price_per_minute: number }>()
    for (const t of tariffsRows || []) {
      const key = t.parking_id ? `${t.org_id}:${t.parking_id}` : `${t.org_id}:default`
      if (!tariffByKey.has(key)) tariffByKey.set(key, { id: t.id, price_per_minute: t.price_per_minute })
    }

    const parkingsWithTariffs = parkingsList.map((parking: any) => {
      const specific = tariffByKey.get(`${parking.org_id}:${parking.id}`)
      const defaultTariff = tariffByKey.get(`${parking.org_id}:default`)
      const active = specific || defaultTariff
      return {
        ...parking,
        active_tariff: active ? { id: active.id, price_per_minute: active.price_per_minute } : null
      }
    })

    return NextResponse.json({ parkings: parkingsWithTariffs })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cargar parkings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no encontrada' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { orgId, name, address, status, totalSpaces, maxDailyAmount, pricingMode, segmentAmount, segmentMinutes } = body

    if (!orgId || !name) {
      return NextResponse.json(
        { error: 'Organización y nombre son requeridos' },
        { status: 400 }
      )
    }

    if (totalSpaces !== undefined && totalSpaces !== null && totalSpaces <= 0) {
      return NextResponse.json(
        { error: 'La capacidad total debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (maxDailyAmount !== undefined && maxDailyAmount !== null && maxDailyAmount < 0) {
      return NextResponse.json(
        { error: 'El tope máximo debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    if (pricingMode === 'per_segment') {
      const segAmt = segmentAmount != null && segmentAmount !== '' ? parseFloat(String(segmentAmount)) : NaN
      const segMin = segmentMinutes != null && segmentMinutes !== '' ? parseInt(String(segmentMinutes), 10) : NaN
      if (isNaN(segAmt) || segAmt < 0 || isNaN(segMin) || segMin <= 0) {
        return NextResponse.json(
          { error: 'En tarifa por tramo, monto y minutos por tramo son obligatorios y deben ser mayores a 0' },
          { status: 400 }
        )
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const insertPayload: Record<string, unknown> = {
      org_id: orgId,
      name,
      address: address || null,
      status: status || 'active',
      total_spaces: totalSpaces || null,
      max_daily_amount: maxDailyAmount != null && maxDailyAmount !== '' ? parseFloat(String(maxDailyAmount)) : null,
      pricing_mode: pricingMode === 'per_segment' ? 'per_segment' : 'per_minute',
      segment_amount: null,
      segment_minutes: null
    }
    if (pricingMode === 'per_segment' && segmentAmount != null && segmentAmount !== '' && segmentMinutes != null && segmentMinutes !== '') {
      insertPayload.segment_amount = parseFloat(String(segmentAmount))
      insertPayload.segment_minutes = parseInt(String(segmentMinutes), 10)
    }
    const { data, error } = await supabase
      .from('parkings')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Error al crear parking: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      parking: data
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear parking' },
      { status: 500 }
    )
  }
}
