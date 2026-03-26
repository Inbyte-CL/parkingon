import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(
  request: Request,
  { params }: { params: { parkingId: string } }
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
    const { name, address, status, totalSpaces, orgId, maxDailyAmount, pricingMode, segmentAmount, segmentMinutes } = body
    const parkingId = params.parkingId

    if (!parkingId) {
      return NextResponse.json(
        { error: 'parkingId es requerido' },
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

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (status !== undefined) updateData.status = status
    if (totalSpaces !== undefined) updateData.total_spaces = totalSpaces || null
    if (orgId !== undefined) updateData.org_id = orgId
    if (maxDailyAmount !== undefined) updateData.max_daily_amount = maxDailyAmount != null && maxDailyAmount !== '' ? parseFloat(String(maxDailyAmount)) : null
    if (pricingMode !== undefined) {
      updateData.pricing_mode = pricingMode === 'per_segment' ? 'per_segment' : 'per_minute'
      if (pricingMode === 'per_segment' && segmentAmount != null && segmentAmount !== '' && segmentMinutes != null && segmentMinutes !== '') {
        updateData.segment_amount = parseFloat(String(segmentAmount))
        updateData.segment_minutes = parseInt(String(segmentMinutes), 10)
      } else {
        updateData.segment_amount = null
        updateData.segment_minutes = null
      }
    }

    const { data, error } = await supabase
      .from('parkings')
      .update(updateData)
      .eq('id', parkingId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Error al actualizar parking: ${error.message}` },
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
      { error: error.message || 'Error al actualizar parking' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { parkingId: string } }
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

    const parkingId = params.parkingId

    if (!parkingId) {
      return NextResponse.json(
        { error: 'parkingId es requerido' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Desactivar en lugar de eliminar (soft delete)
    const { error } = await supabase
      .from('parkings')
      .update({ status: 'inactive' })
      .eq('id', parkingId)

    if (error) {
      return NextResponse.json(
        { error: `Error al desactivar parking: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Parking desactivado correctamente'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar parking' },
      { status: 500 }
    )
  }
}
