package com.inbyte.street.utils

import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Utilidades para formateo de fechas y horas.
 * Convierte siempre a la zona horaria local del equipo (backend puede enviar UTC).
 */
object DateUtils {

    /**
     * Parsea ISO8601 y convierte a hora local del dispositivo.
     */
    private fun parseToLocal(isoDateTime: String): ZonedDateTime? {
        return try {
            val parsed = ZonedDateTime.parse(isoDateTime)
            parsed.withZoneSameInstant(ZoneId.systemDefault())
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Formatea una fecha ISO8601 a formato local "dd/MM/yyyy" (hora del equipo).
     * Ejemplo: "08/02/2026"
     */
    fun formatDate(isoDateTime: String): String {
        val local = parseToLocal(isoDateTime) ?: return "Fecha inválida"
        return local.format(DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.getDefault()))
    }
    
    /**
     * Formatea una fecha ISO8601 a formato de hora local "HH:mm" (hora del equipo).
     * Ejemplo: "22:33"
     */
    fun formatTime(isoDateTime: String): String {
        val local = parseToLocal(isoDateTime) ?: return "Hora inválida"
        return local.format(DateTimeFormatter.ofPattern("HH:mm", Locale.getDefault()))
    }
    
    /**
     * Formatea una fecha ISO8601 a formato completo "dd/MM/yyyy HH:mm" (hora del equipo).
     * Ejemplo: "08/02/2026 22:33"
     */
    fun formatDateTime(isoDateTime: String): String {
        val local = parseToLocal(isoDateTime) ?: return "Fecha/Hora inválida"
        return local.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.getDefault()))
    }

    /**
     * Formato corto para entrada: "14 oct, 11:20"
     */
    fun formatEntryDisplay(isoDateTime: String): String {
        val local = parseToLocal(isoDateTime) ?: return "—"
        return local.format(DateTimeFormatter.ofPattern("d MMM, HH:mm", Locale("es")))
    }
}
