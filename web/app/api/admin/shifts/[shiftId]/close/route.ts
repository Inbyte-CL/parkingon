import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  { params }: { params: { shiftId: string } }
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
    const { closingCash, notes } = body
    const shiftId = params.shiftId

    if (!shiftId) {
      return NextResponse.json(
        { error: 'shiftId es requerido' },
        { status: 400 }
      )
    }

    if (closingCash === undefined || closingCash === null) {
      return NextResponse.json(
        { error: 'closingCash es requerido' },
        { status: 400 }
      )
    }

    if (isNaN(closingCash) || closingCash < 0) {
      return NextResponse.json(
        { error: 'closingCash debe ser un número positivo o cero' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Obtener el turno
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .eq('status', 'open')
      .single()

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: 'Turno no encontrado o ya está cerrado' },
        { status: 404 }
      )
    }

    // 2. Calcular cash_sales del turno
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_method')
      .eq('shift_id', shiftId)
      .eq('status', 'completed')

    const cashSales = payments
      ?.filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

    const expectedCashDrawer = Number(shift.opening_cash || 0) + cashSales
    const difference = Number(closingCash) - expectedCashDrawer

    // 3. Cerrar el turno
    const now = new Date().toISOString()
    const { data: closedShift, error: closeError } = await supabase
      .from('shifts')
      .update({
        status: 'closed',
        closing_time: now,
        closing_cash: closingCash,
        cash_sales: cashSales,
        expected_cash_drawer: expectedCashDrawer,
        difference: difference,
        notes: notes || shift.notes || null,
        updated_at: now
      })
      .eq('id', shiftId)
      .select()
      .single()

    if (closeError) {
      return NextResponse.json(
        { error: `Error al cerrar turno: ${closeError.message}` },
        { status: 500 }
      )
    }

    // 4. Registrar en audit_logs
    await supabase
      .from('audit_logs')
      .insert({
        org_id: shift.org_id,
        user_id: shift.user_id,
        action: 'shift.closed_manually',
        entity_type: 'shift',
        entity_id: shiftId,
        metadata: {
          closed_by: 'superadmin',
          parking_id: shift.parking_id,
          opening_time: shift.opening_time,
          closing_time: now,
          opening_cash: shift.opening_cash,
          closing_cash: closingCash,
          cash_sales: cashSales,
          expected_cash_drawer: expectedCashDrawer,
          difference: difference
        }
      })

    return NextResponse.json({
      success: true,
      shift: closedShift,
      summary: {
        opening_time: shift.opening_time,
        closing_time: now,
        opening_cash: shift.opening_cash,
        closing_cash: closingCash,
        cash_sales: cashSales,
        expected_cash_drawer: expectedCashDrawer,
        difference: difference
      },
      message: 'Turno cerrado exitosamente'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cerrar turno' },
      { status: 500 }
    )
  }
}
