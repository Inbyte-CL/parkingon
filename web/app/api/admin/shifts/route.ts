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
    const status = searchParams.get('status') || 'open'

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: shifts, error } = await supabase
      .from('shifts')
      .select(`
        id,
        org_id,
        user_id,
        parking_id,
        status,
        opening_time,
        closing_time,
        opening_cash,
        closing_cash,
        cash_sales,
        expected_cash_drawer,
        difference,
        notes,
        created_at,
        updated_at,
        organizations:org_id(name),
        parkings:parking_id(name, address)
      `)
      .eq('status', status)
      .order('opening_time', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: `Error al obtener turnos: ${error.message}` },
        { status: 500 }
      )
    }

    // Obtener información adicional de usuarios
    const shiftsWithUserInfo = await Promise.all(
      (shifts || []).map(async (shift: any) => {
        const { data: userData } = await supabase.auth.admin.getUserById(shift.user_id)
        const { data: membership } = await supabase
          .from('memberships')
          .select('display_name')
          .eq('user_id', shift.user_id)
          .eq('status', 'active')
          .maybeSingle()

        return {
          ...shift,
          user_email: userData?.user?.email || 'N/A',
          user_display_name: membership?.display_name || null
        }
      })
    )

    return NextResponse.json({ shifts: shiftsWithUserInfo || [] })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cargar turnos' },
      { status: 500 }
    )
  }
}
