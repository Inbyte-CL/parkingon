import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOperatorAuth, requireOperator } from '@/lib/auth/requireOperator'

/**
 * GET /api/admin/supermarkets/by-store-number?storeNumber=XX&orgId=...
 * Devuelve el supermercado activo y sus reglas de descuento vigentes para un número de local.
 * Usado desde la app Android al escanear un código de barras de ticket.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireOperator(request)
    if (!isOperatorAuth(auth)) return auth.error
    const { searchParams } = new URL(request.url)
    const storeNumber = searchParams.get('storeNumber')
    const requestedOrgId = searchParams.get('orgId')
    if (requestedOrgId && requestedOrgId !== auth.orgId) {
      return NextResponse.json({ error: 'No autorizado para otra organización' }, { status: 403 })
    }

    if (!storeNumber) {
      return NextResponse.json({ error: 'storeNumber es requerido' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let query = supabase
      .from('supermarkets')
      .select(`
        id, name, store_number, status,
        supermarket_discount_rules(id, min_ticket_amount, max_ticket_amount, free_minutes, description, status)
      `)
      .eq('store_number', storeNumber)
      .eq('status', 'active')

    query = query.eq('org_id', auth.orgId)

    const { data, error } = await query.limit(1).maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ supermarket: null })

    // Filtrar solo reglas activas
    const activeRules = (data.supermarket_discount_rules ?? []).filter((r: any) => r.status === 'active')

    return NextResponse.json({
      supermarket: {
        ...data,
        supermarket_discount_rules: activeRules,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
