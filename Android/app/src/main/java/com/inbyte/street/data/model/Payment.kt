package com.inbyte.street.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Quote(
    @SerialName("quote_id")
    val quoteId: String,
    
    @SerialName("session_id")
    val sessionId: String,
    
    @SerialName("amount_locked")
    val amountLocked: Double,
    
    @SerialName("exit_time_locked")
    val exitTimeLocked: String,
    
    @SerialName("minutes_locked")
    val minutesLocked: Int,
    
    @SerialName("tariff_applied")
    val tariffApplied: Double,
    
    @SerialName("expires_at")
    val validUntil: String? = null,
    
    val status: String? = null
)

@Serializable
data class CreateQuoteRequest(
    @SerialName("session_id")
    val sessionId: String
)

@Serializable
data class CreateQuoteResponse(
    val success: Boolean,
    val quote: Quote,
    val calculation: QuoteCalculation? = null
)

@Serializable
data class QuoteCalculation(
    @SerialName("minutes_parked")
    val minutesParked: Int,
    
    @SerialName("tariff_per_minute")
    val tariffPerMinute: Double,
    
    @SerialName("amount")
    val amountToPay: Double,
    
    @SerialName("expires_at")
    val validUntil: String? = null
)

@Serializable
data class Payment(
    @SerialName("id")
    val paymentId: String,
    
    @SerialName("session_id")
    val sessionId: String,
    
    @SerialName("quote_id")
    val quoteId: String,
    
    @SerialName("amount")
    val amountLocked: Double,
    
    val minutes: Int,
    
    @SerialName("payment_method")
    val paymentMethod: String,
    
    val status: String,
    
    @SerialName("created_at")
    val createdAt: String
)

@Serializable
data class ProcessPaymentRequest(
    @SerialName("quote_id")
    val quoteId: String,
    
    @SerialName("payment_method")
    val paymentMethod: String, // "cash" or "card"

    // Código Klap (MC_CODE) cuando el pago con tarjeta fue aprobado.
    // Para efectivo/no disponible debe ir "0" (se interpreta como N/A).
    @SerialName("klap_code")
    val klapCode: String = "0"
)

@Serializable
data class ProcessPaymentResponse(
    val success: Boolean,
    val payment: Payment,
    val session: Session,
    val message: String? = null
)

// ParkingOccupancy moved to Session.kt to avoid duplication

@Serializable
data class ParkingStatusResponse(
    val success: Boolean,
    val parking: ParkingOccupancy? = null,
    val parkings: List<ParkingOccupancy>? = null,
    val summary: OccupancySummary? = null
)

@Serializable
data class OccupancySummary(
    @SerialName("total_parkings")
    val totalParkings: Int,
    
    @SerialName("total_spaces")
    val totalSpaces: Int,
    
    @SerialName("total_occupied")
    val totalOccupied: Int,
    
    @SerialName("total_available")
    val totalAvailable: Int
)
