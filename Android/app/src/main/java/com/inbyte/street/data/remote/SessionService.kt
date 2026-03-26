package com.inbyte.street.data.remote

import android.util.Log
import com.inbyte.street.utils.ErrorLogger
import com.inbyte.street.data.model.CreateSessionRequest
import com.inbyte.street.data.model.CreateSessionResponse
import com.inbyte.street.data.model.ActiveSessionsResponse
import com.inbyte.street.data.model.CloseSessionRequest
import com.inbyte.street.data.model.CloseSessionResponse
import com.inbyte.street.data.model.EmptyRequest
import com.inbyte.street.data.model.CreateQuoteRequest
import com.inbyte.street.data.model.CreateQuoteResponse
import com.inbyte.street.data.model.ProcessPaymentRequest
import com.inbyte.street.data.model.ProcessPaymentResponse
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.functions.functions
import io.ktor.client.call.body
import io.ktor.client.statement.bodyAsText
import kotlinx.serialization.json.Json

/**
 * Servicio para gestión de sesiones de estacionamiento
 */
class SessionService {
    
    private val supabase = SupabaseClientProvider.client
    private val json = Json { 
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    /**
     * Crea una nueva sesión de estacionamiento
     */
    suspend fun createSession(plate: String): Result<CreateSessionResponse> {
        return try {
            Log.d("SessionService", "=== CREATE SESSION ===")
            Log.d("SessionService", "Plate: $plate")

            // Refrescar token para evitar 401 Invalid JWT (token expirado)
            val currentSession = supabase.auth.currentSessionOrNull()
            if (currentSession == null) {
                Log.e("SessionService", "❌ No hay sesión activa")
                return Result.failure(Exception("No hay sesión activa. Por favor, inicia sesión nuevamente."))
            }
            try {
                supabase.auth.refreshCurrentSession()
                Log.d("SessionService", "✅ Token refrescado antes de create-session")
            } catch (e: Exception) {
                Log.w("SessionService", "⚠️ No se pudo refrescar token: ${e.message}")
            }

            val request = CreateSessionRequest(plate = plate.trim().uppercase())
            Log.d("SessionService", "Request: $request")
            
            val response = supabase.functions.invoke(
                function = "create-session",
                body = request
            )
            
            val responseText = response.bodyAsText()
            Log.d("SessionService", "Response status: ${response.status}")
            Log.d("SessionService", "Response body: $responseText")
            
            if (response.status.value in 200..299) {
                val result = json.decodeFromString<CreateSessionResponse>(responseText)
                Log.d("SessionService", "✅ Session created: ${result.session.id}")
                Result.success(result)
            } else {
                val errorMsg = try {
                    val errorResponse = json.decodeFromString<Map<String, String>>(responseText)
                    errorResponse["error"] ?: "Error desconocido"
                } catch (e: Exception) {
                    responseText
                }
                Log.e("SessionService", "❌ Error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SessionService", "❌ Exception: ${e.message}", e)
            Result.failure(e)
        }
    }
    
    /**
     * Obtiene las sesiones activas del turno actual con ocupación del parking
     */
    suspend fun getActiveSessions(): Result<ActiveSessionsResponse> {
        return try {
            Log.d("SessionService", "=== GET ACTIVE SESSIONS ===")
            
            // Verificar y refrescar el token si es necesario
            val currentSession = supabase.auth.currentSessionOrNull()
            if (currentSession == null) {
                Log.e("SessionService", "❌ No hay sesión activa")
                return Result.failure(Exception("No hay sesión activa. Por favor, inicia sesión nuevamente."))
            }
            
            Log.d("SessionService", "🔑 Sesión actual: user=${currentSession.user?.id}")
            
            // Forzar refresh del token antes de hacer la llamada
            try {
                supabase.auth.refreshCurrentSession()
                Log.d("SessionService", "✅ Token refrescado")
            } catch (e: Exception) {
                Log.w("SessionService", "⚠️ No se pudo refrescar token: ${e.message}")
                // Si el refresh falla, verificar si el token actual es válido
                val accessToken = supabase.auth.currentAccessTokenOrNull()
                if (accessToken == null) {
                    Log.e("SessionService", "❌ No hay token de acceso disponible")
                    return Result.failure(Exception("Token de acceso no disponible. Por favor, inicia sesión nuevamente."))
                }
                Log.d("SessionService", "ℹ️ Usando token actual sin refrescar")
            }
            
            // Obtener el token actualizado después del refresh
            val accessToken = supabase.auth.currentAccessTokenOrNull()
            Log.d("SessionService", "🔑 Token de acceso: ${if (accessToken != null) "disponible (${accessToken.take(20)}...)" else "no disponible"}")
            
            // Enviar un objeto vacío serializable para asegurar que se use POST
            val response = supabase.functions.invoke(
                function = "get-active-sessions",
                body = EmptyRequest()
            )
            
            val responseText = response.bodyAsText()
            Log.d("SessionService", "Response status: ${response.status}")
            Log.d("SessionService", "Response body: $responseText")
            
            if (response.status.value in 200..299) {
                val result = json.decodeFromString<ActiveSessionsResponse>(responseText)
                Log.d("SessionService", "✅ Found ${result.sessions.size} active sessions")
                Log.d("SessionService", "📊 Occupancy: ${result.occupancy.occupiedSpaces}/${result.occupancy.totalSpaces}")
                Log.d("SessionService", "💰 Price per minute: ${result.pricePerMinute}")
                Result.success(result)
            } else {
                val errorMsg = try {
                    val errorResponse = json.decodeFromString<Map<String, String>>(responseText)
                    errorResponse["error"] ?: "Error desconocido"
                } catch (e: Exception) {
                    responseText
                }
                Log.e("SessionService", "❌ Error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SessionService", "❌ Exception: ${e.message}", e)
            Result.failure(e)
        }
    }
    
    /**
     * Cierra una sesión sin procesar pago (registrar salida).
     * @param amount Monto mostrado en la ventana de salida (se guarda tal cual)
     * @param minutes Minutos cobrados correspondientes a ese monto
     */
    suspend fun closeSession(
        sessionId: String,
        reason: String? = null,
        amount: Double? = null,
        minutes: Int? = null
    ): Result<CloseSessionResponse> {
        return try {
            Log.d("SessionService", "=== CLOSE SESSION ===")
            Log.d("SessionService", "Session ID: $sessionId, amount: $amount, minutes: $minutes")
            
            val request = CloseSessionRequest(
                sessionId = sessionId,
                reason = reason,
                amount = amount,
                minutes = minutes
            )
            Log.d("SessionService", "Request: $request")
            
            val response = supabase.functions.invoke(
                function = "close-session",
                body = request
            )
            
            val responseText = response.bodyAsText()
            Log.d("SessionService", "Response status: ${response.status}")
            Log.d("SessionService", "Response body: $responseText")
            
            if (response.status.value in 200..299) {
                val result = json.decodeFromString<CloseSessionResponse>(responseText)
                Log.d("SessionService", "✅ Session closed: ${result.session.id}")
                Result.success(result)
            } else {
                val errorMsg = try {
                    val errorResponse = json.decodeFromString<Map<String, String>>(responseText)
                    errorResponse["error"] ?: "Error desconocido"
                } catch (e: Exception) {
                    responseText
                }
                Log.e("SessionService", "❌ Error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SessionService", "❌ Exception: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Crea una cotización (quote) para la sesión; congela el monto a pagar por un TTL.
     */
    suspend fun createQuote(sessionId: String): Result<CreateQuoteResponse> {
        return try {
            val currentSession = supabase.auth.currentSessionOrNull()
            if (currentSession == null) {
                Log.e("SessionService", "❌ createQuote: no hay sesión activa")
                return Result.failure(Exception("No hay sesión activa. Inicia sesión nuevamente."))
            }
            try {
                supabase.auth.refreshCurrentSession()
                Log.d("SessionService", "✅ Token refrescado antes de create-quote")
            } catch (e: Exception) {
                Log.w("SessionService", "⚠️ No se pudo refrescar token: ${e.message}")
            }
            val request = CreateQuoteRequest(sessionId = sessionId)
            val response = supabase.functions.invoke(
                function = "create-quote",
                body = request
            )
            val responseText = response.bodyAsText()
            if (response.status.value in 200..299) {
                val result = json.decodeFromString<CreateQuoteResponse>(responseText)
                Log.d("SessionService", "✅ Quote created: ${result.quote.quoteId}")
                Result.success(result)
            } else {
                val errorMsg = try {
                    val errorResponse = json.decodeFromString<Map<String, String>>(responseText)
                    errorResponse["error"] ?: responseText
                } catch (e: Exception) {
                    responseText
                }
                ErrorLogger.e("SessionService", "createQuote API error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SessionService", "❌ createQuote exception: ${e.message}", e)
            ErrorLogger.e("SessionService", "createQuote exception: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Procesa el pago con la quote (cierra sesión en backend).
     * payment_method: "card", "cash", "qr", "transfer"
     */
    suspend fun processPayment(quoteId: String, paymentMethod: String, klapCode: String = "0"): Result<ProcessPaymentResponse> {
        return try {
            val currentSession = supabase.auth.currentSessionOrNull()
            if (currentSession == null) {
                Log.e("SessionService", "❌ processPayment: no hay sesión activa")
                ErrorLogger.e("SessionService", "processPayment[$paymentMethod]: no hay sesión activa")
                return Result.failure(Exception("No hay sesión activa. Inicia sesión nuevamente."))
            }
            try {
                supabase.auth.refreshCurrentSession()
                Log.d("SessionService", "✅ Token refrescado antes de process-payment")
            } catch (e: Exception) {
                Log.w("SessionService", "⚠️ No se pudo refrescar token: ${e.message}")
            }
            val request = ProcessPaymentRequest(quoteId = quoteId, paymentMethod = paymentMethod, klapCode = klapCode)
            val response = supabase.functions.invoke(
                function = "process-payment",
                body = request
            )
            val responseText = response.bodyAsText()
            if (response.status.value in 200..299) {
                val result = json.decodeFromString<ProcessPaymentResponse>(responseText)
                Log.d("SessionService", "✅ Payment processed: $quoteId")
                Result.success(result)
            } else {
                val errorMsg = try {
                    val errorResponse = json.decodeFromString<Map<String, String>>(responseText)
                    errorResponse["error"] ?: responseText
                } catch (e: Exception) {
                    responseText
                }
                Log.e("SessionService", "❌ processPayment: $errorMsg")
                ErrorLogger.e("SessionService", "processPayment[$paymentMethod] API error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e("SessionService", "❌ processPayment exception: ${e.message}", e)
            ErrorLogger.e("SessionService", "processPayment[$paymentMethod] exception: ${e.message}")
            Log.e("SessionService", "❌ processPayment exception: ${e.message}", e)
            Result.failure(e)
        }
    }
}
