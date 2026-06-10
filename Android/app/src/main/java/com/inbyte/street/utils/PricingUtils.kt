package com.inbyte.street.utils

/**
 * Calcula el monto a cobrar según duración, modo de tarifa, estadía mínima y monto mínimo.
 *
 * Lógica con monto mínimo:
 *  - Si la sesión dura ≤ minMinutes → se cobra minimumAmount fijo.
 *  - Si la sesión supera minMinutes → minimumAmount + minutos extra según tarifa.
 * Sin monto mínimo: comportamiento original (billableMinutes = max(duración, minMinutes)).
 */
fun computeSessionAmount(
    durationMinutes: Int,
    pricePerMinute: Double,
    maxDailyAmount: Double?,
    pricingMode: String = "per_minute",
    segmentAmount: Double? = null,
    segmentMinutes: Int? = null,
    minimumStayHours: Double? = null,
    minimumAmount: Double? = null
): Double {
    val minMinutes = if (minimumStayHours != null && minimumStayHours > 0) {
        kotlin.math.ceil(minimumStayHours * 60).toInt()
    } else {
        0
    }

    val raw: Double = when {
        minMinutes > 0 && minimumAmount != null && durationMinutes <= minMinutes -> {
            minimumAmount
        }
        minMinutes > 0 && minimumAmount != null && durationMinutes > minMinutes -> {
            val extraMinutes = durationMinutes - minMinutes
            val extra = if (pricingMode == "per_segment" && segmentAmount != null && segmentMinutes != null && segmentMinutes > 0) {
                kotlin.math.ceil(extraMinutes.toDouble() / segmentMinutes) * segmentAmount
            } else {
                extraMinutes.toDouble() * pricePerMinute
            }
            minimumAmount + extra
        }
        else -> {
            val billableMinutes = maxOf(durationMinutes, minMinutes)
            if (pricingMode == "per_segment" && segmentAmount != null && segmentMinutes != null && segmentMinutes > 0) {
                kotlin.math.ceil(billableMinutes.toDouble() / segmentMinutes) * segmentAmount
            } else {
                billableMinutes.toDouble() * pricePerMinute
            }
        }
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
    segmentMinutes: Int?,
    tariffPlanName: String? = null,
    minimumStayHours: Double? = null
): String {
    val base = if (pricingMode == "per_segment" && segmentAmount != null && segmentMinutes != null) {
        "${CurrencyUtils.formatCLP(segmentAmount)} cada $segmentMinutes min"
    } else {
        "${CurrencyUtils.formatCLP(pricePerMinute)}/min"
    }
    val prefix = tariffPlanName?.takeIf { it.isNotBlank() }?.let { "$it: " } ?: ""
    val minSuffix = if (minimumStayHours != null && minimumStayHours > 0) {
        " (mín. ${formatMinimumStayHours(minimumStayHours)})"
    } else ""
    return "$prefix$base$minSuffix"
}

/**
 * Segunda línea del botón de selección de tarifa: precio, estadía mínima, monto mínimo y tope.
 */
fun formatTariffPlanDetailsLine(
    pricePerMinute: Double?,
    pricingMode: String,
    segmentAmount: Double?,
    segmentMinutes: Int?,
    maxDailyAmount: Double? = null,
    minimumStayHours: Double? = null,
    minimumAmount: Double? = null
): String {
    val parts = mutableListOf<String>()
    if (pricingMode == "per_segment" && segmentAmount != null && segmentMinutes != null && segmentMinutes > 0) {
        parts.add("${CurrencyUtils.formatCLP(segmentAmount)} cada $segmentMinutes min")
    } else {
        parts.add("${CurrencyUtils.formatCLP(pricePerMinute ?: 0.0)}/min")
    }
    if (minimumStayHours != null && minimumStayHours > 0) {
        if (minimumAmount != null && minimumAmount > 0) {
            parts.add("mín. ${formatMinimumStayHours(minimumStayHours)} (${CurrencyUtils.formatCLP(minimumAmount)})")
        } else {
            parts.add("mín. ${formatMinimumStayHours(minimumStayHours)}")
        }
    }
    if (maxDailyAmount != null && maxDailyAmount > 0) {
        parts.add("tope ${CurrencyUtils.formatCLP(maxDailyAmount)}")
    }
    return parts.joinToString(" · ")
}

private fun formatMinimumStayHours(hours: Double): String {
    return if (hours == hours.toLong().toDouble()) "${hours.toLong()} h" else "${hours} h"
}
