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
    const parkingId = searchParams.get('parkingId')

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let query = supabase
      .from('tariffs')
      .select(`
        id,
        org_id,
        parking_id,
        price_per_minute,
        valid_from,
        valid_until,
        created_at,
        organizations:org_id(name),
        parkings:parking_id(name)
      `)
      .order('valid_from', { ascending: false })

    if (orgId) {
      query = query.eq('org_id', orgId)
    }
    if (parkingId) {
      query = query.eq('parking_id', parkingId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: `Error al obtener tarifas: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ tariffs: data || [] })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cargar tarifas' },
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
    const { orgId, parkingId, pricePerMinute, validFrom, validUntil } = body

    if (!orgId || !pricePerMinute || !validFrom) {
      return NextResponse.json(
        { error: 'Organización, precio por minuto y fecha de inicio son requeridos' },
        { status: 400 }
      )
    }

    if (pricePerMinute < 0) {
      return NextResponse.json(
        { error: 'El precio por minuto debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    if (validUntil && new Date(validUntil) <= new Date(validFrom)) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser mayor a la fecha de inicio' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data, error } = await supabase
      .from('tariffs')
      .insert({
        org_id: orgId,
        parking_id: parkingId || null,
        price_per_minute: pricePerMinute,
        valid_from: validFrom,
        valid_until: validUntil || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Error al crear tarifa: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tariff: data
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear tarifa' },
      { status: 500 }
    )
  }
}
