/**
 * Calcula monto de estacionamiento (misma lógica en create-quote y close-session).
 */
export type PricingInput = {
  minutesCharged: number
  pricingMode: string
  pricePerMinute: number
  segmentAmount: number | null
  segmentMinutes: number | null
  maxDailyAmount: number | null
  minimumStayHours: number | null
  minimumAmount: number | null
}

export function computeParkingAmount(input: PricingInput): number {
  const {
    minutesCharged,
    pricingMode,
    pricePerMinute,
    segmentAmount,
    segmentMinutes,
    maxDailyAmount,
    minimumStayHours,
    minimumAmount,
  } = input

  const minMinutes =
    minimumStayHours != null && minimumStayHours > 0
      ? Math.ceil(minimumStayHours * 60)
      : 0

  let amount: number

  if (minMinutes > 0 && minimumAmount != null && minutesCharged <= minMinutes) {
    // Dentro del período mínimo: cobrar el monto mínimo fijo
    amount = minimumAmount
  } else if (minMinutes > 0 && minimumAmount != null && minutesCharged > minMinutes) {
    // Pasado el período mínimo: monto mínimo + minutos extra según tarifa
    const extraMinutes = minutesCharged - minMinutes
    let extraAmount: number
    if (
      pricingMode === 'per_segment' &&
      segmentAmount != null &&
      segmentMinutes != null &&
      segmentMinutes > 0
    ) {
      extraAmount = Math.ceil(extraMinutes / segmentMinutes) * segmentAmount
    } else {
      extraAmount = extraMinutes * pricePerMinute
    }
    amount = minimumAmount + extraAmount
  } else {
    // Sin monto mínimo: lógica original
    const billableMinutes = Math.max(minutesCharged, minMinutes)
    if (
      pricingMode === 'per_segment' &&
      segmentAmount != null &&
      segmentMinutes != null &&
      segmentMinutes > 0
    ) {
      amount = Math.ceil(billableMinutes / segmentMinutes) * segmentAmount
    } else {
      amount = billableMinutes * pricePerMinute
    }
  }

  if (maxDailyAmount != null) {
    amount = Math.min(amount, maxDailyAmount)
  }
  return amount
}

export type TariffPlanRow = {
  id: string
  name: string
  pricing_mode: string
  price_per_minute: number | null
  segment_amount: number | null
  segment_minutes: number | null
  max_daily_amount: number | null
  minimum_stay_hours: number | null
  minimum_amount: number | null
}

export type ParkingPricingDefaults = {
  max_daily_amount: number | null
  pricing_mode: string
  segment_amount: number | null
  segment_minutes: number | null
  minimum_stay_hours: number | null
}

export function resolveSessionPricing(
  plan: TariffPlanRow | null,
  parking: ParkingPricingDefaults | null,
  fallbackPricePerMinute: number
): {
  pricingMode: string
  pricePerMinute: number
  segmentAmount: number | null
  segmentMinutes: number | null
  maxDailyAmount: number | null
  minimumStayHours: number | null
  tariffPlanName: string | null
} {
  if (plan) {
    const pricingMode = plan.pricing_mode === 'per_segment' ? 'per_segment' : 'per_minute'
    return {
      pricingMode,
      pricePerMinute:
        plan.price_per_minute != null ? parseFloat(String(plan.price_per_minute)) : 0,
      segmentAmount:
        plan.segment_amount != null ? parseFloat(String(plan.segment_amount)) : null,
      segmentMinutes:
        plan.segment_minutes != null ? parseInt(String(plan.segment_minutes), 10) : null,
      maxDailyAmount:
        plan.max_daily_amount != null ? parseFloat(String(plan.max_daily_amount)) : null,
      minimumStayHours:
        plan.minimum_stay_hours != null ? parseFloat(String(plan.minimum_stay_hours)) : null,
      minimumAmount:
        plan.minimum_amount != null ? parseFloat(String(plan.minimum_amount)) : null,
      tariffPlanName: plan.name,
    }
  }

  const pricingMode = parking?.pricing_mode === 'per_segment' ? 'per_segment' : 'per_minute'
  return {
    pricingMode,
    pricePerMinute: fallbackPricePerMinute,
    segmentAmount:
      parking?.segment_amount != null ? parseFloat(String(parking.segment_amount)) : null,
    segmentMinutes:
      parking?.segment_minutes != null ? parseInt(String(parking.segment_minutes), 10) : null,
    maxDailyAmount:
      parking?.max_daily_amount != null ? parseFloat(String(parking.max_daily_amount)) : null,
    minimumStayHours: null,
    minimumAmount: null,
    tariffPlanName: null,
  }
}

export type SessionPricing = ReturnType<typeof resolveSessionPricing>
