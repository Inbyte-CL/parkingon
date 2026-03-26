import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type RouteParams = { userId: string }

export async function PUT(
  request: Request,
  segment: { params: RouteParams | Promise<RouteParams> }
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
    const { password } = body
    const params = await Promise.resolve(segment.params)
    const userId = decodeURIComponent(params.userId || '')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Actualizar contraseña usando admin API
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: password
    })

    if (error) {
      return NextResponse.json(
        { error: `Error al actualizar contraseña: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cambiar contraseña' },
      { status: 500 }
    )
  }
}
