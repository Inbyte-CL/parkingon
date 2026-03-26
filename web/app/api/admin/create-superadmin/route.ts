import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        is_superadmin: true
      }
    })

    if (authError || !authData.user) {
      // Si el usuario ya existe, actualizarlo
      if (authError?.message?.includes('already registered')) {
        // Obtener el usuario existente
        const { data: usersData, error: listUsersError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        })

        if (listUsersError) {
          return NextResponse.json(
            { error: `Error al buscar usuario existente: ${listUsersError.message}` },
            { status: 500 }
          )
        }

        const existingUser = usersData.users.find((user) => user.email === email)

        if (existingUser) {
          // Actualizar metadata para marcarlo como superadmin
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              user_metadata: {
                ...existingUser.user_metadata,
                is_superadmin: true
              }
            }
          )

          if (updateError) {
            return NextResponse.json(
              { error: `Error al actualizar usuario: ${updateError.message}` },
              { status: 500 }
            )
          }

          return NextResponse.json({
            success: true,
            message: 'Usuario existente actualizado como superadmin',
            user: {
              id: existingUser.id,
              email: existingUser.email
            }
          })
        }
      }

      return NextResponse.json(
        { error: `Error al crear usuario: ${authError?.message || 'Usuario no creado'}` },
        { status: 500 }
      )
    }

    // 2. Verificar que NO tenga membership (los superadmins no tienen)
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (existingMembership) {
      // Si tiene membership, eliminarlo
      await supabase
        .from('memberships')
        .delete()
        .eq('user_id', authData.user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Superadmin creado correctamente',
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear superadmin' },
      { status: 500 }
    )
  }
}
