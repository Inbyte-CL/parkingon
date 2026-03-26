import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { email, displayName, role, orgId, parkingId, status } = body
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

export async function DELETE(
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

    // Desactivar membership en lugar de eliminarlo
    const { error: membershipError } = await supabase
      .from('memberships')
      .update({ status: 'inactive' })
      .eq('user_id', userId)

    if (membershipError) {
      return NextResponse.json(
        { error: `Error al desactivar membership: ${membershipError.message}` },
        { status: 500 }
      )
    }

    // Opcional: Eliminar usuario de auth (comentado por seguridad)
    // await supabase.auth.admin.deleteUser(userId)

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado correctamente'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar usuario' },
      { status: 500 }
    )
  }
}
