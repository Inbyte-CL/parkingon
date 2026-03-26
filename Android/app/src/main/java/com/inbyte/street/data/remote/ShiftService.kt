package com.inbyte.street.data.remote

import android.util.Log
import com.inbyte.street.utils.ErrorLogger
import com.inbyte.street.core.Constants
import com.inbyte.street.data.model.*
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.ktor.client.call.*
import kotlinx.serialization.json.Json

/**
 * Servicio para gestión de turnos
 */
class ShiftService {
    
    private val supabase = SupabaseClientProvider.client
    private val json = Json { ignoreUnknownKeys = true }
    private val userService = UserService()
    private val TAG = "ShiftService"
    
    /**
     * Refresca el token de sesión para evitar 401 Invalid JWT en Edge Functions.
     */
    private suspend fun refreshSessionIfNeeded() {
        if (supabase.auth.currentSessionOrNull() == null) return
        try {
            supabase.auth.refreshCurrentSession()
            Log.d(TAG, "✅ Token refrescado antes de llamada a Edge Function")
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ No se pudo refrescar token: ${e.message}")
        }
    }

    /**
     * Abrir turno
     */
    suspend fun openShift(
        initialCash: Double,
        notes: String? = null
    ): Result<OpenShiftResponse> {
        return try {
            Log.d(TAG, "🚀 Iniciando apertura de turno...")
            Log.d(TAG, "💰 Efectivo inicial: $initialCash")
            refreshSessionIfNeeded()
            // Obtener parking_id del usuario
            Log.d(TAG, "📍 Obteniendo parking_id...")
            val parkingIdResult = userService.getUserParkingId()
            if (parkingIdResult.isFailure) {
                val error = parkingIdResult.exceptionOrNull()!!
                Log.e(TAG, "❌ Error obteniendo parking_id: ${error.message}")
                return Result.failure(error)
            }
            val parkingId = parkingIdResult.getOrThrow()
            Log.d(TAG, "✅ Parking ID: $parkingId")
            
            val requestBody = OpenShiftRequest(
                parkingId = parkingId,
                openingCash = initialCash,
                notes = notes
            )
            
            Log.d(TAG, "📤 Enviando request a Edge Function: $requestBody")
            
            val response = supabase.functions.invoke(
                function = Constants.FUNCTION_OPEN_SHIFT,
                body = requestBody
            )
            
            Log.d(TAG, "📥 Respuesta recibida del servidor")
            val result = response.body<OpenShiftResponse>()
            Log.d(TAG, "✅ Turno abierto exitosamente: ${result.shift.shiftId}")
            Result.success(result)
        } catch (e: Exception) {
            ErrorLogger.e("ShiftService", "openShift exception: ${e.message}")
            e.printStackTrace()
            Result.failure(e)
        }
    }
    
    /**
     * Cerrar turno
     */
    suspend fun closeShift(
        closingCash: Double,
        notes: String? = null
    ): Result<CloseShiftResponse> {
        return try {
            Log.d(TAG, "🔚 Iniciando cierre de turno...")
            Log.d(TAG, "💰 Efectivo de cierre: $closingCash")
            refreshSessionIfNeeded()
            val requestBody = CloseShiftRequest(
                closingCash = closingCash,
                notes = notes
            )
            
            Log.d(TAG, "📤 Enviando request a Edge Function: $requestBody")
            
            val response = supabase.functions.invoke(
                function = Constants.FUNCTION_CLOSE_SHIFT,
                body = requestBody
            )
            
            Log.d(TAG, "📥 Respuesta recibida del servidor")
            val result = response.body<CloseShiftResponse>()
            Log.d(TAG, "✅ Turno cerrado exitosamente")
            Result.success(result)
        } catch (e: Exception) {
            ErrorLogger.e("ShiftService", "closeShift exception: ${e.message}")
            e.printStackTrace()
            Result.failure(e)
        }
    }
    
    /**
     * Verificar el estado real del turno en el servidor
     * Retorna true si el turno está abierto, false si está cerrado o no existe
     */
    suspend fun verifyShiftStatus(shiftId: String): Result<Boolean> {
        return try {
            Log.d(TAG, "🔍 Verificando estado del turno: $shiftId")
            
            val userId = supabase.auth.currentUserOrNull()?.id
            if (userId == null) {
                Log.e(TAG, "❌ Usuario no autenticado")
                return Result.failure(Exception("Usuario no autenticado"))
            }
            
            Log.d(TAG, "👤 User ID: $userId")
            
            // Consultar el turno sin decodificar para evitar problemas de serialización
            // Solo verificamos si hay resultados en la respuesta
            val response = supabase.from("shifts")
                .select {
                    filter {
                        eq("id", shiftId)
                        eq("user_id", userId)
                        eq("status", "open")
                    }
                }
            
            // Obtener la respuesta como string y verificar si hay resultados
            val responseText = response.data
            Log.d(TAG, "📦 Respuesta del servidor: $responseText")
            
            // Si la respuesta contiene el ID del turno y no está vacía, significa que está abierto
            val isOpen = responseText.isNotEmpty() && 
                        responseText.contains(shiftId) && 
                        !responseText.contains("\"code\":\"PGRST116\"") // PGRST116 = no rows returned
            
            if (isOpen) {
                Log.d(TAG, "✅ Turno encontrado y está abierto")
            } else {
                Log.d(TAG, "ℹ️ Turno no encontrado o está cerrado (shiftId=$shiftId, userId=$userId)")
            }
            Result.success(isOpen)
        } catch (e: Exception) {
            // Si el turno no existe o está cerrado, retornar false
            Log.e(TAG, "❌ Error verificando turno: ${e.message}", e)
            Result.failure(e)
        }
    }
}
