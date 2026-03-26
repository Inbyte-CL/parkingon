import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Cambio de contraseña por ID de usuario (Admin API).
 * Ruta plana para evitar problemas de routing con /users/[userId]/password en algunos entornos.
 */
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
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const password = body.password as string

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password,
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
      user: { id: data.user?.id, email: data.user?.email },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al cambiar contraseña'
    console.error('reset-user-password:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
