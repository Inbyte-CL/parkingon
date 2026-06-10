import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOrgAdminAuth, requireOrgAdmin } from '@/lib/auth/requireOrgAdmin'

export async function GET(request: Request) {
  const auth = await requireOrgAdmin(request)
  if (!isOrgAdminAuth(auth)) return auth.error

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { searchParams } = new URL(request.url)
  const orgIdParam = searchParams.get('orgId')
  // admin_empresa: usa su propio orgId. superadmin: requiere orgId en query string.
  const orgId = auth.role === 'admin_empresa' ? auth.orgId! : (orgIdParam ?? '')

  if (!orgId) {
    return NextResponse.json({ error: 'orgId es requerido para superadmin' }, { status: 400 })
  }

  // Sincronizar: convertir sesiones open de días anteriores en deudores
  const { error: syncError } = await supabase.rpc('mark_abandoned_sessions')
  if (syncError) {
    console.error('mark_abandoned_sessions:', syncError.message)
    // Continuar igual para mostrar deudores ya existentes
  }

  const { data, error } = await supabase
    .from('debtor_sessions')
    .select(`
      id, plate, amount_owed, tariff_plan_name, price_per_minute,
      abandoned_at, status, created_at,
      parking:parking_id(id, name)
    `)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('abandoned_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Agrupar por patente: pueden tener múltiples deudas
  const byPlate: Record<string, {
    plate: string
    total_owed: number
    parking_name: string
    debts: typeof data
  }> = {}

  for (const row of (data || [])) {
    const parking = row.parking as any
    if (!byPlate[row.plate]) {
      byPlate[row.plate] = {
        plate: row.plate,
        total_owed: 0,
        parking_name: parking?.name ?? '–',
        debts: [],
      }
    }
    byPlate[row.plate].total_owed += parseFloat(String(row.amount_owed))
    byPlate[row.plate].debts.push(row)
  }

  return NextResponse.json({
    debtors: Object.values(byPlate).sort((a, b) => b.total_owed - a.total_owed),
    raw: data || [],
  })
}

export async function POST(request: Request) {
  // Marcar sesiones abandonadas manualmente
  const auth = await requireOrgAdmin(request)
  if (!isOrgAdminAuth(auth)) return auth.error

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.rpc('mark_abandoned_sessions')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, result: data })
}

export async function DELETE(request: Request) {
  // Condonar deuda (waive) para un registro específico
  const auth = await requireOrgAdmin(request)
  if (!isOrgAdminAuth(auth)) return auth.error

  const { searchParams } = new URL(request.url)
  const debtorId = searchParams.get('id')
  if (!debtorId) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const orgFilter = auth.role === 'admin_empresa' ? auth.orgId! : undefined

  let query = supabase
    .from('debtor_sessions')
    .update({ status: 'waived' })
    .eq('id', debtorId)
    .eq('status', 'active')
  if (orgFilter) query = (query as any).eq('org_id', orgFilter)

  const { error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
