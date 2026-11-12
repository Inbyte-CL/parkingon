import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOrgAdminAuth, requireOrgAdmin } from '@/lib/auth/requireOrgAdmin'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request, { params }: { params: { supermarketId: string } }) {
  const auth = await requireOrgAdmin(request)
  if (!isOrgAdminAuth(auth)) return auth.error
  const supabase = getSupabase()
  let query = supabase
    .from('supermarkets')
    .select(`
      id, org_id, name, comuna, address, store_number, status, created_at, updated_at,
      supermarket_discount_rules(id, min_ticket_amount, max_ticket_amount, free_minutes, description, status)
    `)
    .eq('id', params.supermarketId)
  if (auth.role === 'admin_empresa') query = query.eq('org_id', auth.orgId!)
  const { data, error } = await query
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ supermarket: data })
}

export async function PUT(request: Request, { params }: { params: { supermarketId: string } }) {
  try {
    const auth = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(auth)) return auth.error
    const body = await request.json()
    const { name, comuna, address, storeNumber, status, discountRules } = body
    const supabase = getSupabase()
    let ownership = supabase.from('supermarkets').select('id, org_id').eq('id', params.supermarketId)
    if (auth.role === 'admin_empresa') ownership = ownership.eq('org_id', auth.orgId!)
    const { data: existing } = await ownership.maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Supermercado no encontrado' }, { status: 404 })

    if (status !== undefined && status !== 'active' && status !== 'inactive') {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updatePayload.name = name
    if (comuna !== undefined) updatePayload.comuna = comuna || null
    if (address !== undefined) updatePayload.address = address || null
    if (storeNumber !== undefined) updatePayload.store_number = storeNumber
    if (status !== undefined) updatePayload.status = status
    // Solo superadmin puede mover un supermercado a otra organización; admin_empresa
    // queda siempre acotado a la suya.
    if (auth.role === 'superadmin' && body.orgId) updatePayload.org_id = body.orgId

    const { error: smError } = await supabase
      .from('supermarkets')
      .update(updatePayload)
      .eq('id', params.supermarketId)

    if (smError) return NextResponse.json({ error: smError.message }, { status: 500 })

    // El reemplazo se delega a una transacción SQL para no dejar reglas a medias.
    if (discountRules !== undefined) {
      const rules = discountRules.map((r: any) => ({
          min_ticket_amount: Number.parseFloat(r.minTicketAmount) || 0,
          max_ticket_amount: r.maxTicketAmount ? Number.parseFloat(r.maxTicketAmount) : null,
          free_minutes: Number.parseInt(r.freeMinutes) || 0,
          discount_amount: 0,
          description: r.description || null,
      }))
      const { error: rulesError } = await supabase.rpc('replace_supermarket_discount_rules', {
        p_supermarket_id: params.supermarketId,
        p_rules: rules,
        p_actor_id: auth.user.id,
      })
      if (rulesError) return NextResponse.json({
        error: `No se pudieron reemplazar las reglas de forma atómica: ${rulesError.message}`,
      }, { status: 503 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * Por defecto desactiva (baja lógica) para no perder el historial.
 * Con ?permanent=true borra la fila, pero solo si ya está inactiva: así el borrado
 * definitivo siempre exige un paso previo deliberado.
 */
export async function DELETE(request: Request, { params }: { params: { supermarketId: string } }) {
  try {
    const auth = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(auth)) return auth.error
    const permanent = new URL(request.url).searchParams.get('permanent') === 'true'
    const supabase = getSupabase()

    let ownership = supabase
      .from('supermarkets')
      .select('id, status')
      .eq('id', params.supermarketId)
    if (auth.role === 'admin_empresa') ownership = ownership.eq('org_id', auth.orgId!)
    const { data: existing } = await ownership.maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Supermercado no encontrado' }, { status: 404 })

    if (permanent) {
      if (existing.status !== 'inactive') {
        return NextResponse.json(
          { error: 'Debes desactivar el supermercado antes de eliminarlo definitivamente' },
          { status: 409 }
        )
      }
      // Las reglas se van en cascada y las canjes conservan el historial con
      // supermarket_id en NULL (ON DELETE SET NULL).
      const { error } = await supabase
        .from('supermarkets')
        .delete()
        .eq('id', params.supermarketId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, deleted: 'permanent' })
    }

    const { error } = await supabase
      .from('supermarkets')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', params.supermarketId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: 'soft' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
