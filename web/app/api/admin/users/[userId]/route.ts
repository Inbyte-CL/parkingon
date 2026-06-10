import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireSuperadmin } from '@/lib/auth/requireSuperadmin'

const VALID_OPERATION_MODES = ['both', 'entry_only', 'exit_only'] as const

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
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
    const { email, displayName, role, orgId, parkingId, status, operationMode, allowFreeExit } = body
    const userId = params.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Actualizar membership
    const updateData: any = {}
    if (displayName !== undefined) updateData.display_name = displayName
    if (role !== undefined) {
      if (!['operador', 'admin_empresa'].includes(role)) {
        return NextResponse.json(
          { error: 'Rol inválido' },
          { status: 400 }
        )
      }
      updateData.role = role
    }
    if (orgId !== undefined) updateData.org_id = orgId
    if (parkingId !== undefined) {
      // Si es operador, parking_id es requerido
      if (role === 'operador' && !parkingId) {
        return NextResponse.json(
          { error: 'Los operadores deben tener un parking asignado' },
          { status: 400 }
        )
      }
      updateData.parking_id = parkingId
    }
    if (status !== undefined) updateData.status = status
    if (operationMode !== undefined) {
      if (!(VALID_OPERATION_MODES as readonly string[]).includes(operationMode)) {
        return NextResponse.json(
          { error: 'Modo de operación inválido' },
          { status: 400 }
        )
      }
      updateData.operation_mode = operationMode
    }
    if (allowFreeExit !== undefined) {
      updateData.allow_free_exit = Boolean(allowFreeExit)
    }

    // Obtener membership actual
    const { data: currentMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (!currentMembership) {
      return NextResponse.json(
        { error: 'Membership no encontrado' },
        { status: 404 }
      )
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .update(updateData)
      .eq('id', currentMembership.id)
      .select()
      .single()

    if (membershipError) {
      return NextResponse.json(
        { error: `Error al actualizar membership: ${membershipError.message}` },
        { status: 500 }
      )
    }

    // 2. Actualizar email y user_metadata en auth.users
    if (email !== undefined || displayName !== undefined) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      if (userData?.user) {
        const updateAuthData: any = {}
        
        // Actualizar email si cambió
        if (email !== undefined && email !== userData.user.email) {
          updateAuthData.email = email
        }
        
        // Actualizar user_metadata si displayName cambió
        if (displayName !== undefined) {
          updateAuthData.user_metadata = {
            ...userData.user.user_metadata,
            display_name: displayName
          }
        }
        
        if (Object.keys(updateAuthData).length > 0) {
          const { error: authError } = await supabase.auth.admin.updateUserById(userId, updateAuthData)
          if (authError) {
            return NextResponse.json(
              { error: `Error al actualizar usuario en auth: ${authError.message}` },
              { status: 500 }
            )
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      membership: membershipData
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar usuario' },
      { status: 500 }
    )
  }
}

async function countByCreator(
  supabase: SupabaseClient,
  table: 'sessions' | 'payment_quotes' | 'payments',
  userId: string
) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId)

  if (error) {
    throw new Error(`Error al verificar historial en ${table}: ${error.message}`)
  }
  return count ?? 0
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await requireSuperadmin(request)
    if (auth.error) return auth.error

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no encontrada' },
        { status: 500 }
      )
    }

    const userId = params.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: targetUser, error: fetchError } = await supabase.auth.admin.getUserById(userId)

    if (fetchError || !targetUser?.user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if ((targetUser.user.user_metadata?.is_superadmin as boolean) === true) {
      return NextResponse.json(
        { error: 'No se puede eliminar un superadmin' },
        { status: 400 }
      )
    }

    const [sessionsCount, quotesCount, paymentsCount] = await Promise.all([
      countByCreator(supabase, 'sessions', userId),
      countByCreator(supabase, 'payment_quotes', userId),
      countByCreator(supabase, 'payments', userId),
    ])

    const totalHistory = sessionsCount + quotesCount + paymentsCount
    if (totalHistory > 0) {
      return NextResponse.json(
        {
          error:
            'Este usuario tiene historial operativo (sesiones, cotizaciones o pagos). ' +
            'Por integridad de datos no se puede eliminar. Edítalo y cambia su estado a inactivo.',
          history: { sessions: sessionsCount, quotes: quotesCount, payments: paymentsCount },
        },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Error al eliminar usuario: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Usuario "${targetUser.user.email}" eliminado correctamente`,
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar usuario' },
      { status: 500 }
    )
  }
}
