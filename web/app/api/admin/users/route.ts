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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Intentar llamar a la función RPC primero
    let usersData = null
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users_with_roles')

    if (!rpcError && rpcData) {
      usersData = rpcData
    } else {
      console.warn('Función RPC no disponible, usando consulta directa:', rpcError?.message)
      
      let membershipsQuery = supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          role,
          status,
          display_name,
          org_id,
          parking_id,
          organizations:org_id (name),
          parkings:parking_id (name, status)
        `)
        .eq('status', 'active')
      
      // Filtrar por orgId si se proporciona
      if (orgId) {
        membershipsQuery = membershipsQuery.eq('org_id', orgId)
      }
      
      const { data: memberships, error: membershipsError } = await membershipsQuery

      if (membershipsError) {
        return NextResponse.json(
          { error: `Error al obtener memberships: ${membershipsError.message}` },
          { status: 500 }
        )
      }

      const usersWithDetails = []
      for (const membership of memberships || []) {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(membership.user_id)
          
          if (userError || !userData?.user) {
            console.warn(`No se pudo obtener usuario ${membership.user_id}:`, userError?.message)
            continue
          }

          const user = userData.user
          const isSuperadmin = (user.user_metadata?.is_superadmin as boolean) || false

          usersWithDetails.push({
            user_id: user.id,
            email: user.email || 'N/A',
            user_created_at: user.created_at,
            email_confirmed_at: user.email_confirmed_at,
            is_superadmin: isSuperadmin,
            membership_id: membership.id,
            role: isSuperadmin ? 'superadmin' : membership.role,
            membership_status: membership.status,
            display_name: membership.display_name,
            org_id: membership.org_id,
            parking_id: membership.parking_id,
            organization_name: (membership.organizations as any)?.name || null,
            parking_name: (membership.parkings as any)?.name || null,
            parking_status: (membership.parkings as any)?.status || null,
          })
        } catch (err: any) {
          console.warn(`Error procesando usuario ${membership.user_id}:`, err.message)
        }
      }

      usersData = usersWithDetails
    }

    // Filtrar por orgId si se proporciona (para casos donde RPC no filtra)
    let filteredUsers = usersData || []
    if (orgId && filteredUsers.length > 0) {
      filteredUsers = filteredUsers.filter((user: any) => user.org_id === orgId)
    }

    return NextResponse.json({ users: filteredUsers })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cargar usuarios' },
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
    const { email, password, displayName, role, orgId, parkingId } = body

    // Validaciones
    if (!email || !password || !role || !orgId) {
      return NextResponse.json(
        { error: 'Email, password, role y orgId son requeridos' },
        { status: 400 }
      )
    }

    // Validar que el rol sea válido
    if (!['operador', 'admin_empresa'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol inválido. Debe ser "operador" o "admin_empresa"' },
        { status: 400 }
      )
    }

    // Validar que operadores tengan parking asignado
    if (role === 'operador' && !parkingId) {
      return NextResponse.json(
        { error: 'Los operadores deben tener un parking asignado' },
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
        display_name: displayName || null
      }
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: `Error al crear usuario: ${authError?.message || 'Usuario no creado'}` },
        { status: 500 }
      )
    }

    // 2. Crear membership
    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: orgId,
        user_id: authData.user.id,
        role: role,
        parking_id: parkingId || null,
        display_name: displayName || null,
        status: 'active'
      })
      .select()
      .single()

    if (membershipError) {
      // Si falla el membership, eliminar el usuario creado
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Error al crear membership: ${membershipError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        display_name: displayName,
        role: role
      },
      membership: membershipData
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
