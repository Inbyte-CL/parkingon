import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PUT(
  request: Request,
  { params }: { params: { orgId: string } }
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
    const { name, slug, status } = body
    const orgId = params.orgId

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId es requerido' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json(
          { error: 'El slug solo puede contener letras minúsculas, números y guiones' },
          { status: 400 }
        )
      }
      updateData.slug = slug.toLowerCase()
    }
    if (status !== undefined) updateData.status = status

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una organización con ese slug' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Error al actualizar organización: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      organization: data
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar organización' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { orgId: string } }
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

    const orgId = params.orgId

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId es requerido' },
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
      .from('organizations')
      .update({ status: 'inactive' })
      .eq('id', orgId)

    if (error) {
      return NextResponse.json(
        { error: `Error al desactivar organización: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Organización desactivada correctamente'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar organización' },
      { status: 500 }
    )
  }
}
