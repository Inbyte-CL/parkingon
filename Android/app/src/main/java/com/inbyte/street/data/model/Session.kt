package com.inbyte.street.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Modelos para gestión de sesiones de estacionamiento
 */

@Serializable
data class CreateSessionRequest(
    val plate: String,
    @SerialName("parking_tariff_plan_id")
    val parkingTariffPlanId: String? = null
)

@Serializable
data class CreateSessionResponse(
    val success: Boolean,
    val session: Session,
    val message: String? = null
)

@Serializable
data class Session(
    @SerialName("id")
    val id: String,
    
    @SerialName("shift_id")
    val shiftId: String? = null,
    
    @SerialName("parking_id")
    val parkingId: String = "",
    
    @SerialName("plate")
    val plate: String,
    
    @SerialName("normalized_plate")
    val normalizedPlate: String? = null,
    
    @SerialName("entry_time")
    val entryTime: String,
    
    @SerialName("exit_time")
    val exitTime: String? = null,
    
    @SerialName("status")
    val status: String,
    
    @SerialName("session_code")
    val sessionCode: String? = null,
    
    @SerialName("created_at")
    val createdAt: String? = null,

    @SerialName("is_agreement")
    val isAgreement: Boolean = false,

    @SerialName("parking_tariff_plan_id")
    val parkingTariffPlanId: String? = null,

    @SerialName("tariff_plan_name")
    val tariffPlanName: String? = null,

    @SerialName("price_per_minute")
    val pricePerMinute: Double? = null,

    @SerialName("pricing_mode")
    val pricingMode: String? = null,

    @SerialName("segment_amount")
    val segmentAmount: Double? = null,

    @SerialName("segment_minutes")
    val segmentMinutes: Int? = null,

    @SerialName("minimum_stay_hours")
    val minimumStayHours: Double? = null,

    @SerialName("minimum_amount")
    val minimumAmount: Double? = null
)

@Serializable
data class ActiveSessionsResponse(
    val success: Boolean,
    val sessions: List<SessionWithDuration>,
    val occupancy: ParkingOccupancy,
    
    @SerialName("price_per_minute")
    val pricePerMinute: Double? = null,
    
    @SerialName("max_daily_amount")
    val maxDailyAmount: Double? = null,
    
    @SerialName("pricing_mode")
    val pricingMode: String? = "per_minute",
    
    @SerialName("segment_amount")
    val segmentAmount: Double? = null,
    
    @SerialName("segment_minutes")
    val segmentMinutes: Int? = null,

    @SerialName("multiple_tariffs_enabled")
    val multipleTariffsEnabled: Boolean = false,

    @SerialName("tariff_plans")
    val tariffPlans: List<ParkingTariffPlan> = emptyList()
)

@Serializable
data class DebtDetail(
    @SerialName("id")
    val id: String,

    @SerialName("amount_owed")
    val amountOwed: Double,

    @SerialName("tariff_plan_name")
    val tariffPlanName: String? = null,

    @SerialName("abandoned_at")
    val abandonedAt: String? = null
)

@Serializable
data class SessionWithDuration(
    @SerialName("id")
    val id: String,
    
    @SerialName("plate")
    val plate: String,
    
    @SerialName("entry_time")
    val entryTime: String,
    
    @SerialName("session_code")
    val sessionCode: String? = null,
    
    @SerialName("duration_minutes")
    val durationMinutes: Int,
    
    @SerialName("status")
    val status: String,

    @SerialName("is_agreement")
    val isAgreement: Boolean = false,

    @SerialName("parking_tariff_plan_id")
    val parkingTariffPlanId: String? = null,

    @SerialName("tariff_plan_name")
    val tariffPlanName: String? = null,

    @SerialName("price_per_minute")
    val pricePerMinute: Double? = null,

    @SerialName("max_daily_amount")
    val maxDailyAmount: Double? = null,

    @SerialName("pricing_mode")
    val pricingMode: String? = "per_minute",

    @SerialName("segment_amount")
    val segmentAmount: Double? = null,

    @SerialName("segment_minutes")
    val segmentMinutes: Int? = null,

    @SerialName("minimum_stay_hours")
    val minimumStayHours: Double? = null,

    @SerialName("minimum_amount")
    val minimumAmount: Double? = null,

    @SerialName("has_debt")
    val hasDebt: Boolean = false,

    @SerialName("debt_amount")
    val debtAmount: Double = 0.0,

    @SerialName("debt_details")
    val debtDetails: List<DebtDetail> = emptyList()
)

@Serializable
data class ParkingOccupancy(
    @SerialName("total_spaces")
    val totalSpaces: Int = 0,
    
    @SerialName("occupied_spaces")
    val occupiedSpaces: Int = 0,
    
    @SerialName("available_spaces")
    val availableSpaces: Int = 0,
    
    @SerialName("occupancy_percentage")
    val occupancyPercentage: Double = 0.0
)

@Serializable
data class CloseSessionRequest(
    @SerialName("session_id")
    val sessionId: String,
    val reason: String? = null,
    /** Monto mostrado en la ventana de salida (se almacena tal cual para salidas sin pago) */
    val amount: Double? = null,
    /** Minutos cobrados usados para ese monto (opcional) */
    val minutes: Int? = null
)

@Serializable
data class CloseSessionResponse(
    val success: Boolean,
    val session: Session,
    val message: String? = null
)

@Serializable
data class EmptyRequest(
    val _empty: String? = null
)
