package com.inbyte.street.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Información completa del usuario para mostrar en la UI
 */
data class UserInfo(
    val displayName: String,
    val role: String,
    val organizationName: String,
    val parkingName: String,
    val parkingId: String,
    val pricePerMinute: Double? = null,
    val maxDailyAmount: Double? = null,
    val pricingMode: String = "per_minute",
    val segmentAmount: Double? = null,
    val segmentMinutes: Int? = null
)

/**
 * Response del endpoint de información del usuario
 */
@Serializable
data class UserInfoResponse(
    @SerialName("display_name")
    val displayName: String? = null,
    
    @SerialName("role")
    val role: String,
    
    @SerialName("org_name")
    val orgName: String,
    
    @SerialName("parking_name")
    val parkingName: String? = null,
    
    @SerialName("parking_id")
    val parkingId: String? = null
)

/**
 * Modelo para tarifa (solo campos necesarios)
 */
@Serializable
data class TariffSimple(
    @SerialName("price_per_minute")
    val pricePerMinute: Double
)

@Serializable
data class ParkingMaxDaily(
    @SerialName("max_daily_amount")
    val maxDailyAmount: Double? = null,
    @SerialName("pricing_mode")
    val pricingMode: String? = "per_minute",
    @SerialName("segment_amount")
    val segmentAmount: Double? = null,
    @SerialName("segment_minutes")
    val segmentMinutes: Int? = null
)
