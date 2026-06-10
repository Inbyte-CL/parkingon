package com.inbyte.street.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ParkingTariffPlan(
    @SerialName("id")
    val id: String,
    @SerialName("name")
    val name: String,
    @SerialName("pricing_mode")
    val pricingMode: String = "per_minute",
    @SerialName("price_per_minute")
    val pricePerMinute: Double? = null,
    @SerialName("segment_amount")
    val segmentAmount: Double? = null,
    @SerialName("segment_minutes")
    val segmentMinutes: Int? = null,
    @SerialName("max_daily_amount")
    val maxDailyAmount: Double? = null,
    @SerialName("minimum_stay_hours")
    val minimumStayHours: Double? = null,
    @SerialName("minimum_amount")
    val minimumAmount: Double? = null
)
