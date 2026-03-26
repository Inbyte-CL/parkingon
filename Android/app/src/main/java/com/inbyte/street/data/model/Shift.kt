package com.inbyte.street.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Shift(
    @SerialName("id")
    val id: String? = null,
    
    @SerialName("shift_id")
    val shiftId: String? = null,
    
    @SerialName("org_id")
    val orgId: String? = null,
    
    @SerialName("parking_id")
    val parkingId: String,
    
    @SerialName("user_id")
    val userId: String,
    
    @SerialName("opening_time")
    val openingTime: String,
    
    @SerialName("closing_time")
    val closingTime: String? = null,
    
    @SerialName("opening_cash")
    val openingCash: Double,
    
    @SerialName("initial_cash")
    val initialCash: Double? = null,
    
    @SerialName("closing_cash")
    val closingCash: Double? = null,
    
    @SerialName("cash_difference")
    val cashDifference: Double? = null,
    
    @SerialName("cash_sales")
    val cashSales: Double? = null,
    
    @SerialName("total_cash_sales")
    val totalCashSales: Double? = null,
    
    @SerialName("total_card_sales")
    val totalCardSales: Double? = null,
    
    @SerialName("expected_cash_drawer")
    val expectedCashDrawer: Double? = null,
    
    val status: String,
    val notes: String? = null
)

@Serializable
data class OpenShiftRequest(
    @SerialName("parking_id")
    val parkingId: String,
    
    @SerialName("opening_cash")
    val openingCash: Double,
    
    val notes: String? = null
)

@Serializable
data class OpenShiftResponse(
    val success: Boolean,
    val shift: Shift
)

@Serializable
data class CloseShiftRequest(
    @SerialName("closing_cash")
    val closingCash: Double,
    val notes: String? = null
)

@Serializable
data class CloseShiftResponse(
    val success: Boolean,
    val shift: Shift,
    val summary: ShiftSummary
)

@Serializable
data class ShiftSummary(
    @SerialName("opening_time")
    val openingTime: String? = null,
    
    @SerialName("closing_time")
    val closingTime: String? = null,
    
    @SerialName("duration_hours")
    val durationHours: String? = null,
    
    @SerialName("opening_cash")
    val openingCash: Double,
    
    @SerialName("closing_cash")
    val closingCash: Double,
    
    @SerialName("cash_sales")
    val cashSales: Double,
    
    @SerialName("expected_cash_drawer")
    val expectedCashDrawer: Double,
    
    @SerialName("difference")
    val difference: Double,
    
    @SerialName("difference_status")
    val differenceStatus: String? = null,
    
    @SerialName("total_payments")
    val totalPayments: Double,
    
    @SerialName("payments_by_method")
    val paymentsByMethod: Map<String, Double>? = null,
    
    @SerialName("total_sessions")
    val totalSessions: Int
)
