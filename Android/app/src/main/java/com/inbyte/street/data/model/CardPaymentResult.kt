package com.inbyte.street.data.model

import android.content.Intent

/**
 * Resultado del intent de pago con tarjeta (Multicaja/SmartPago).
 * Mismo criterio que JIS Parking: RESULT_CODE 01/0/00 = aprobada, 99/96/98 = rechazada.
 */
sealed class CardPaymentResult {
    data class Approved(val data: Intent?) : CardPaymentResult()
    data class Rejected(val message: String) : CardPaymentResult()
    object Canceled : CardPaymentResult()
}
