import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOrgAdminAuth, requireOrgAdmin } from '@/lib/auth/requireOrgAdmin'

type RouteContext = { params: Promise<{ agreementId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authResult = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(authResult)) return authResult.error
    const auth = authResult

    const { agreementId } = await context.params
    const body = await request.json()
    const { label, is_active, plate } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuración de Supabase no encontrada' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existing, error: fetchError } = await supabase
      .from('agreement_plates')
      .select('id, org_id')
      .eq('id', agreementId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Convenio no encontrado' }, { status: 404 })
    }

    if (auth.role === 'admin_empresa' && existing.org_id !== auth.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (label !== undefined) updates.label = label?.trim() || null
    if (is_active !== undefined) updates.is_active = Boolean(is_active)
    if (plate !== undefined && typeof plate === 'string' && plate.trim()) {
      const { data: normalizedPlate, error: normalizeError } = await supabase.rpc('normalize_plate', {
        input: plate.trim(),
      })
      if (normalizeError || !normalizedPlate) {
        return NextResponse.json({ error: 'No se pudo normalizar la patente' }, { status: 400 })
      }
      updates.plate = normalizedPlate
    }

    const { data, error } = await supabase
      .from('agreement_plates')
      .update(updates)
      .eq('id', agreementId)
      .select('id, org_id, plate, label, is_active, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'La patente ya existe en convenio' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agreement: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar convenio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authResult = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(authResult)) return authResult.error
    const auth = authResult

    const { agreementId } = await context.params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuración de Supabase no encontrada' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existing, error: fetchError } = await supabase
      .from('agreement_plates')
      .select('id, org_id')
      .eq('id', agreementId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Convenio no encontrado' }, { status: 404 })
    }

    if (auth.role === 'admin_empresa' && existing.org_id !== auth.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { error } = await supabase
      .from('agreement_plates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', agreementId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar convenio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
