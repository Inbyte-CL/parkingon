import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOrgAdminAuth, requireOrgAdmin } from '@/lib/auth/requireOrgAdmin'

type TariffPlanInput = {
  id?: string
  name: string
  pricingMode: 'per_minute' | 'per_segment'
  pricePerMinute?: number | string | null
  segmentAmount?: number | string | null
  segmentMinutes?: number | string | null
  maxDailyAmount?: number | string | null
  minimumStayHours?: number | string | null
  minimumAmount?: number | string | null
  sortOrder?: number
}

function validatePlan(plan: TariffPlanInput, index: number): string | null {
  if (!plan.name?.trim()) return `Tarifa ${index + 1}: el nombre es obligatorio`
  if (plan.pricingMode === 'per_segment') {
    const segAmt = plan.segmentAmount != null && plan.segmentAmount !== '' ? parseFloat(String(plan.segmentAmount)) : NaN
    const segMin = plan.segmentMinutes != null && plan.segmentMinutes !== '' ? parseInt(String(plan.segmentMinutes), 10) : NaN
    if (isNaN(segAmt) || segAmt < 0 || isNaN(segMin) || segMin <= 0) {
      return `Tarifa "${plan.name}": monto y minutos por tramo son obligatorios`
    }
  } else {
    const price = plan.pricePerMinute != null && plan.pricePerMinute !== '' ? parseFloat(String(plan.pricePerMinute)) : NaN
    if (isNaN(price) || price < 0) {
      return `Tarifa "${plan.name}": precio por minuto inválido`
    }
  }
  const minHours = plan.minimumStayHours != null && plan.minimumStayHours !== ''
    ? parseFloat(String(plan.minimumStayHours))
    : 0
  if (isNaN(minHours) || minHours < 0) {
    return `Tarifa "${plan.name}": estadía mínima inválida`
  }
  if (plan.minimumAmount != null && plan.minimumAmount !== '') {
    const minAmt = parseFloat(String(plan.minimumAmount))
    if (isNaN(minAmt) || minAmt < 0) {
      return `Tarifa "${plan.name}": monto mínimo inválido`
    }
    if (minAmt > 0 && minHours <= 0) {
      return `Tarifa "${plan.name}": para usar monto mínimo debe especificar también una estadía mínima`
    }
  }
  return null
}

export async function GET(
  request: Request,
  { params }: { params: { parkingId: string } }
) {
  const auth = await requireOrgAdmin(request)
  if (!isOrgAdminAuth(auth)) return auth.error

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const parkingId = params.parkingId
  const { data: parking, error: parkingError } = await supabase
    .from('parkings')
    .select('id, org_id, multiple_tariffs_enabled')
    .eq('id', parkingId)
    .single()

  if (parkingError || !parking) {
    return NextResponse.json({ error: 'Parking no encontrado' }, { status: 404 })
  }

  if (auth.role === 'admin_empresa' && auth.orgId !== parking.org_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: plans, error: plansError } = await supabase
    .from('parking_tariff_plans')
    .select('*')
    .eq('parking_id', parkingId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true })

  if (plansError) {
    return NextResponse.json({ error: plansError.message }, { status: 500 })
  }

  return NextResponse.json({
    multipleTariffsEnabled: parking.multiple_tariffs_enabled === true,
    plans: plans || [],
  })
}

export async function PUT(
  request: Request,
  { params }: { params: { parkingId: string } }
) {
  const auth = await requireOrgAdmin(request)
  if (!isOrgAdminAuth(auth)) return auth.error

  const body = await request.json()
  const multipleTariffsEnabled = body.multipleTariffsEnabled === true
  const plans: TariffPlanInput[] = Array.isArray(body.plans) ? body.plans : []
  const parkingId = params.parkingId

  if (multipleTariffsEnabled && plans.length === 0) {
    return NextResponse.json(
      { error: 'Debe configurar al menos una tarifa cuando Tarifa múltiple está activa' },
      { status: 400 }
    )
  }

  for (let i = 0; i < plans.length; i++) {
    const err = validatePlan(plans[i], i)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: parking, error: parkingError } = await supabase
    .from('parkings')
    .select('id, org_id')
    .eq('id', parkingId)
    .single()

  if (parkingError || !parking) {
    return NextResponse.json({ error: 'Parking no encontrado' }, { status: 404 })
  }

  if (auth.role === 'admin_empresa' && auth.orgId !== parking.org_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { error: updateParkingError } = await supabase
    .from('parkings')
    .update({ multiple_tariffs_enabled: multipleTariffsEnabled })
    .eq('id', parkingId)

  if (updateParkingError) {
    return NextResponse.json({ error: updateParkingError.message }, { status: 500 })
  }

  // Reemplazar planes activos (soft-delete anteriores, insertar nuevos)
  const { error: deactivateError } = await supabase
    .from('parking_tariff_plans')
    .update({ status: 'inactive' })
    .eq('parking_id', parkingId)
    .eq('status', 'active')

  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 })
  }

  if (plans.length > 0) {
    const rows = plans.map((plan, index) => ({
      org_id: parking.org_id,
      parking_id: parkingId,
      name: plan.name.trim(),
      pricing_mode: plan.pricingMode === 'per_segment' ? 'per_segment' : 'per_minute',
      price_per_minute:
        plan.pricingMode === 'per_minute' && plan.pricePerMinute != null && plan.pricePerMinute !== ''
          ? parseFloat(String(plan.pricePerMinute))
          : null,
      segment_amount:
        plan.pricingMode === 'per_segment' && plan.segmentAmount != null && plan.segmentAmount !== ''
          ? parseFloat(String(plan.segmentAmount))
          : null,
      segment_minutes:
        plan.pricingMode === 'per_segment' && plan.segmentMinutes != null && plan.segmentMinutes !== ''
          ? parseInt(String(plan.segmentMinutes), 10)
          : null,
      max_daily_amount:
        plan.maxDailyAmount != null && plan.maxDailyAmount !== ''
          ? parseFloat(String(plan.maxDailyAmount))
          : null,
      minimum_stay_hours:
        plan.minimumStayHours != null && plan.minimumStayHours !== ''
          ? parseFloat(String(plan.minimumStayHours))
          : 0,
      minimum_amount:
        plan.minimumAmount != null && plan.minimumAmount !== ''
          ? parseFloat(String(plan.minimumAmount))
          : null,
      sort_order: plan.sortOrder ?? index,
      status: 'active',
    }))

    const { error: insertError } = await supabase.from('parking_tariff_plans').insert(rows)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  const { data: savedPlans } = await supabase
    .from('parking_tariff_plans')
    .select('*')
    .eq('parking_id', parkingId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true })

  return NextResponse.json({
    success: true,
    multipleTariffsEnabled,
    plans: savedPlans || [],
  })
}
