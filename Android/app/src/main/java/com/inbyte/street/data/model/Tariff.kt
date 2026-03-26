package com.inbyte.street.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Modelo de tarifa
 */
@Serializable
data class Tariff(
    @SerialName("id")
    val id: String,
    
    @SerialName("parking_id")
    val parkingId: String,
    
    @SerialName("name")
    val name: String,
    
    @SerialName("price_per_minute")
    val pricePerMinute: Double,
    
    @SerialName("status")
    val status: String,
    
    @SerialName("created_at")
    val createdAt: String? = null
)

/**
 * Response con tarifa activa
 */
@Serializable
data class ActiveTariffResponse(
    @SerialName("success")
    val success: Boolean,
    
    @SerialName("tariff")
    val tariff: Tariff? = null,
    
    @SerialName("error")
    val error: String? = null
)
