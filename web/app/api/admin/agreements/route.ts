import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOrgAdminAuth, requireOrgAdmin } from '@/lib/auth/requireOrgAdmin'

export async function GET(request: Request) {
  try {
    const authResult = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(authResult)) return authResult.error
    const auth = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuración de Supabase no encontrada' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const orgIdParam = searchParams.get('orgId')

    let orgId = orgIdParam
    if (auth.role === 'admin_empresa') {
      orgId = auth.orgId
    }
    if (!orgId) {
      return NextResponse.json({ error: 'orgId es requerido' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase
      .from('agreement_plates')
      .select('id, org_id, plate, label, is_active, created_at, updated_at, organizations:org_id(name)')
      .eq('org_id', orgId)
      .order('plate')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agreements: data ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al cargar convenios'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(authResult)) return authResult.error
    const auth = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuración de Supabase no encontrada' }, { status: 500 })
    }

    const body = await request.json()
    const { plate, label, orgId: bodyOrgId } = body

    if (!plate || typeof plate !== 'string' || !plate.trim()) {
      return NextResponse.json({ error: 'La patente es requerida' }, { status: 400 })
    }

    let orgId = bodyOrgId as string | undefined
    if (auth.role === 'admin_empresa') {
      orgId = auth.orgId ?? undefined
    }
    if (!orgId) {
      return NextResponse.json({ error: 'orgId es requerido' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: normalizedPlate, error: normalizeError } = await supabase.rpc('normalize_plate', {
      input: plate.trim(),
    })
    if (normalizeError || !normalizedPlate) {
      return NextResponse.json(
        { error: normalizeError?.message || 'No se pudo normalizar la patente' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('agreement_plates')
      .insert({
        org_id: orgId,
        plate: normalizedPlate,
        label: label?.trim() || null,
        is_active: true,
        created_by: auth.user.id,
      })
      .select('id, org_id, plate, label, is_active, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Esta patente ya está registrada en convenio para la organización' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agreement: data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear convenio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
