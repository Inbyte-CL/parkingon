package com.inbyte.street.utils

/**
 * Calcula el monto a cobrar según duración y modo de tarifa (por minuto o por tramo).
 * Por tramo: ceil(minutos / segment_minutes) * segment_amount; luego se aplica tope máximo si existe.
 */
fun computeSessionAmount(
    durationMinutes: Int,
    pricePerMinute: Double,
    maxDailyAmount: Double?,
    pricingMode: String = "per_minute",
    segmentAmount: Double? = null,
    segmentMinutes: Int? = null
): Double {
    val raw = if (pricingMode == "per_segment" && segmentAmount != null && segmentMinutes != null && segmentMinutes > 0) {
        kotlin.math.ceil(durationMinutes.toDouble() / segmentMinutes) * segmentAmount
    } else {
        kotlin.math.ceil(durationMinutes.toDouble()) * pricePerMinute
    }
    return if (maxDailyAmount != null) minOf(raw, maxDailyAmount) else raw
}

/**
 * Texto de tarifa para mostrar en UI: "$X/min" o "$X cada Y min".
 */
fun formatTariffLabel(
    pricePerMinute: Double,
    pricingMode: String,
    segmentAmount: Double?,
    segmentMinutes: Int?
): String {
    return if (pricingMode == "per_segment" && segmentAmount != null && segmentMinutes != null) {
        "${CurrencyUtils.formatCLP(segmentAmount)} cada $segmentMinutes min"
    } else {
        "${CurrencyUtils.formatCLP(pricePerMinute)}/min"
    }
}
