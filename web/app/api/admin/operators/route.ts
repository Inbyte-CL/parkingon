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

    const { user_ids } = await request.json()

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ operators: {} })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Obtener memberships para estos user_ids
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('user_id, display_name')
      .in('user_id', user_ids)

    const operatorNames: Record<string, string> = {}

    // Procesar cada user_id
    for (const userId of user_ids) {
      // Buscar en memberships primero
      const membership = memberships?.find(m => m.user_id === userId)
      
      if (membership?.display_name) {
        operatorNames[userId] = membership.display_name
      } else {
        // Si no hay display_name, obtener email desde auth
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
          
          if (!userError && userData?.user?.email) {
            // Usar email como fallback, pero solo la parte antes del @
            const email = userData.user.email
            operatorNames[userId] = email.split('@')[0] || 'Operador'
          } else {
            operatorNames[userId] = 'Operador'
          }
        } catch (err) {
          operatorNames[userId] = 'Operador'
        }
      }
    }

    return NextResponse.json({ operators: operatorNames })
  } catch (error: any) {
    console.error('Error obteniendo nombres de operadores:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener nombres de operadores' },
      { status: 500 }
    )
  }
}
