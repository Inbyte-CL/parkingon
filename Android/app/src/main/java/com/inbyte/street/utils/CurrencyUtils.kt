package com.inbyte.street.utils

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

/**
 * Utilidades para formateo de moneda en pesos chilenos (CLP)
 * Formato: $1.234 (sin decimales, punto como separador de miles)
 */
object CurrencyUtils {
    
    private val currencyFormatter = DecimalFormat("#,###", DecimalFormatSymbols(Locale.forLanguageTag("es-CL")).apply {
        groupingSeparator = '.'
        decimalSeparator = ','
    })
    
    /**
     * Formatea un monto en pesos chilenos sin decimales
     * Ejemplo: 1234.56 -> "$1.235"
     */
    fun formatCLP(amount: Double): String {
        val roundedAmount = amount.toLong() // Redondear a entero
        return "$${currencyFormatter.format(roundedAmount)}"
    }
    
    /**
     * Formatea un monto en pesos chilenos sin decimales (desde Long)
     * Ejemplo: 1234 -> "$1.234"
     */
    fun formatCLP(amount: Long): String {
        return "$${currencyFormatter.format(amount)}"
    }
    
    /**
     * Formatea un monto en pesos chilenos sin decimales (desde Int)
     * Ejemplo: 1234 -> "$1.234"
     */
    fun formatCLP(amount: Int): String {
        return "$${currencyFormatter.format(amount)}"
    }
}
