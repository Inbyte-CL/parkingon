import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(
  request: Request,
  { params }: { params: { tariffId: string } }
) {
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
    const { pricePerMinute, validFrom, validUntil, parkingId } = body
    const tariffId = params.tariffId

    if (!tariffId) {
      return NextResponse.json(
        { error: 'tariffId es requerido' },
        { status: 400 }
      )
    }

    if (pricePerMinute !== undefined && pricePerMinute < 0) {
      return NextResponse.json(
        { error: 'El precio por minuto debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    if (validUntil && validFrom && new Date(validUntil) <= new Date(validFrom)) {
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

    const updateData: any = {}
    if (pricePerMinute !== undefined) updateData.price_per_minute = pricePerMinute
    if (validFrom !== undefined) updateData.valid_from = validFrom
    if (validUntil !== undefined) updateData.valid_until = validUntil || null
    if (parkingId !== undefined) updateData.parking_id = parkingId || null

    const { data, error } = await supabase
      .from('tariffs')
      .update(updateData)
      .eq('id', tariffId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Error al actualizar tarifa: ${error.message}` },
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
      { error: error.message || 'Error al actualizar tarifa' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { tariffId: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no encontrada' },
        { status: 500 }
      )
    }

    const tariffId = params.tariffId

    if (!tariffId) {
      return NextResponse.json(
        { error: 'tariffId es requerido' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Eliminar tarifa (hard delete, ya que es histórico)
    const { error } = await supabase
      .from('tariffs')
      .delete()
      .eq('id', tariffId)

    if (error) {
      return NextResponse.json(
        { error: `Error al eliminar tarifa: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Tarifa eliminada correctamente'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar tarifa' },
      { status: 500 }
    )
  }
}
