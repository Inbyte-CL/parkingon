import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOrgAdminAuth, requireOrgAdmin } from '@/lib/auth/requireOrgAdmin'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request) {
  try {
    const auth = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(auth)) return auth.error
    const { searchParams } = new URL(request.url)
    const orgId = auth.role === 'admin_empresa' ? auth.orgId : searchParams.get('orgId')

    const supabase = getSupabase()

    let query = supabase
      .from('supermarkets')
      .select(`
        id, org_id, name, comuna, address, store_number, status, created_at, updated_at,
        organizations:org_id(name),
        supermarket_discount_rules(id, min_ticket_amount, max_ticket_amount, free_minutes, description, status)
      `)
      .order('name')

    if (orgId) query = query.eq('org_id', orgId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ supermarkets: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireOrgAdmin(request)
    if (!isOrgAdminAuth(auth)) return auth.error
    const body = await request.json()
    const { name, comuna, address, storeNumber, discountRules } = body
    const orgId = auth.role === 'admin_empresa' ? auth.orgId : body.orgId

    if (!orgId || !name || !storeNumber) {
      return NextResponse.json(
        { error: 'Organización, nombre y número de local son requeridos' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data: sm, error: smError } = await supabase
      .from('supermarkets')
      .insert({ org_id: orgId, name, comuna: comuna || null, address: address || null, store_number: storeNumber })
      .select()
      .single()

    if (smError) return NextResponse.json({ error: smError.message }, { status: 500 })

    if (discountRules && discountRules.length > 0) {
      const rules = discountRules.map((r: any) => ({
        supermarket_id: sm.id,
        min_ticket_amount: Number.parseFloat(r.minTicketAmount) || 0,
        max_ticket_amount: r.maxTicketAmount ? Number.parseFloat(r.maxTicketAmount) : null,
        free_minutes: Number.parseInt(r.freeMinutes) || 0,
        discount_amount: 0,
        description: r.description || null,
      }))
      const { error: rulesError } = await supabase.from('supermarket_discount_rules').insert(rules)
      if (rulesError) return NextResponse.json({ error: rulesError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, supermarket: sm })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
