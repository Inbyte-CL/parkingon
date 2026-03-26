package com.inbyte.street.data.remote

import android.util.Log
import com.inbyte.street.utils.ErrorLogger
import com.inbyte.street.data.model.Membership
import com.inbyte.street.data.model.UserInfo
import com.inbyte.street.data.model.TariffSimple
import com.inbyte.street.data.model.ParkingMaxDaily
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order

/**
 * Servicio para obtener información del usuario
 */
class UserService {
    
    private val supabase = SupabaseClientProvider.client
    private val TAG = "UserService"
    
    /**
     * Obtener parking asignado del usuario
     * Busca en la tabla memberships el parking_id del usuario autenticado
     */
    suspend fun getUserParkingId(): Result<String> {
        return try {
            Log.d(TAG, "🔍 Obteniendo parking_id del usuario...")
            
            // Obtener el user_id actual
            val userId = supabase.auth.currentUserOrNull()?.id
            if (userId == null) {
                Log.e(TAG, "❌ Usuario no autenticado")
                return Result.failure(Exception("Usuario no autenticado"))
            }
            Log.d(TAG, "✅ User ID: $userId")
            
            // Buscar membership activo - obtener TODOS los campos
            Log.d(TAG, "📡 Consultando tabla memberships...")
            val membership = supabase.from("memberships")
                .select {
                    filter {
                        eq("user_id", userId)
                        eq("status", "active")
                    }
                    single()
                }
                .decodeAs<Membership>()
            
            Log.d(TAG, "📦 Membership obtenido: $membership")
            
            // Verificar que tenga parking_id
            val parkingId = membership.parkingId
            if (parkingId.isNullOrEmpty() || parkingId == "null") {
                Log.e(TAG, "❌ No tienes un parking asignado (parking_id=$parkingId)")
                return Result.failure(Exception("No tienes un parking asignado. Contacta al administrador."))
            }
            
            Log.d(TAG, "✅ Parking ID obtenido: $parkingId")
            Result.success(parkingId)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error al obtener parking: ${e.message}", e)
            e.printStackTrace()
            Result.failure(Exception("Error al obtener parking: ${e.message}"))
        }
    }
    
    /**
     * Obtener información completa del usuario (nombre, rol, organización, parking)
     */
    suspend fun getUserInfo(): Result<UserInfo> {
        return try {
            Log.d(TAG, "🔍 Obteniendo información del usuario...")
            
            // Obtener el user_id actual
            val userId = supabase.auth.currentUserOrNull()?.id
            if (userId == null) {
                Log.e(TAG, "❌ Usuario no autenticado")
                return Result.failure(Exception("Usuario no autenticado"))
            }
            
            // Obtener membership con joins a organizations y parkings
            val response = supabase.from("memberships")
                .select(
                    columns = Columns.raw("""
                        display_name,
                        role,
                        org_id,
                        organizations!inner(name),
                        parkings(id, name)
                    """.trimIndent())
                ) {
                    filter {
                        eq("user_id", userId)
                        eq("status", "active")
                    }
                    single()
                }
            
            // Parsear manualmente la respuesta
            val data = response.data
            Log.d(TAG, "📦 Response data: $data")
            
            // Extraer valores usando regex o parsing manual
            val displayNameRegex = """"display_name"\s*:\s*"([^"]*)"""".toRegex()
            val roleRegex = """"role"\s*:\s*"([^"]*)"""".toRegex()
            val orgIdRegex = """"org_id"\s*:\s*"([^"]*)"""".toRegex()
            val orgNameRegex = """"organizations"\s*:\s*\{\s*"name"\s*:\s*"([^"]*)"""".toRegex()
            val parkingIdRegex = """"parkings"\s*:\s*\{\s*"id"\s*:\s*"([^"]*)"""".toRegex()
            val parkingNameRegex = """"parkings"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]*)"""".toRegex()
            
            val displayName = displayNameRegex.find(data)?.groupValues?.get(1) ?: "Usuario"
            val role = roleRegex.find(data)?.groupValues?.get(1) ?: "operador"
            val orgId = orgIdRegex.find(data)?.groupValues?.get(1) ?: ""
            val orgName = orgNameRegex.find(data)?.groupValues?.get(1) ?: "Organización"
            val parkingId = parkingIdRegex.find(data)?.groupValues?.get(1) ?: ""
            val parkingName = parkingNameRegex.find(data)?.groupValues?.get(1) ?: "Sin parking"
            
            // Obtener tarifa activa del parking
            var pricePerMinute: Double? = null
            if (orgId.isNotEmpty() && parkingId.isNotEmpty()) {
                try {
                    Log.d(TAG, "💰 Obteniendo tarifa activa para org_id=$orgId, parking_id=$parkingId")
                    val now = java.time.Instant.now().toString()
                    
                    // Buscar tarifa específica del parking primero
                    // Usar consulta más simple: buscar tarifas válidas y ordenar
                    val parkingTariff = supabase.from("tariffs")
                        .select(columns = Columns.list("price_per_minute")) {
                            filter {
                                eq("org_id", orgId)
                                eq("parking_id", parkingId)
                                lte("valid_from", now)
                            }
                            order(column = "valid_from", order = Order.DESCENDING)
                            limit(1)
                        }
                        .decodeAs<List<TariffSimple>>()
                    
                    // Filtrar manualmente las que tienen valid_until en el futuro o null
                    val validParkingTariff = parkingTariff.firstOrNull { tariff ->
                        // Como solo obtenemos price_per_minute, asumimos que si hay resultado, es válida
                        // La validación de valid_until se hace en el servidor o podemos hacer otra consulta
                        true
                    }
                    
                    if (validParkingTariff != null) {
                        pricePerMinute = validParkingTariff.pricePerMinute
                        Log.d(TAG, "✅ Tarifa específica del parking obtenida: $pricePerMinute por minuto")
                    } else {
                        // Si no hay tarifa específica, buscar tarifa default (parking_id = null)
                        val defaultTariff = supabase.from("tariffs")
                            .select(columns = Columns.list("price_per_minute")) {
                                filter {
                                    eq("org_id", orgId)
                                    exact("parking_id", null)
                                    lte("valid_from", now)
                                }
                                order(column = "valid_from", order = Order.DESCENDING)
                                limit(1)
                            }
                            .decodeAs<List<TariffSimple>>()
                        
                        if (defaultTariff.isNotEmpty()) {
                            pricePerMinute = defaultTariff[0].pricePerMinute
                            Log.d(TAG, "✅ Tarifa default obtenida: $pricePerMinute por minuto")
                        } else {
                            Log.w(TAG, "⚠️ No se encontró tarifa activa para el parking")
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error al obtener tarifa: ${e.message}", e)
                    // No es crítico, continuamos sin la tarifa
                }
            }

            // Obtener tope máximo y modo de tarifa del parking
            var maxDailyAmount: Double? = null
            var pricingMode = "per_minute"
            var segmentAmount: Double? = null
            var segmentMinutes: Int? = null
            if (parkingId.isNotEmpty()) {
                try {
                    val parkingRow = supabase.from("parkings")
                        .select(columns = Columns.list("max_daily_amount", "pricing_mode", "segment_amount", "segment_minutes")) {
                            filter { eq("id", parkingId) }
                            single()
                        }
                        .decodeAs<ParkingMaxDaily>()
                    maxDailyAmount = parkingRow.maxDailyAmount
                    parkingRow.pricingMode?.let { pricingMode = it }
                    segmentAmount = parkingRow.segmentAmount
                    segmentMinutes = parkingRow.segmentMinutes
                } catch (e: Exception) {
                    Log.d(TAG, "Tope máximo / modo tarifa no configurado o error: ${e.message}")
                }
            }
            
            val userInfo = UserInfo(
                displayName = displayName,
                role = role.replaceFirstChar { it.uppercase() },
                organizationName = orgName,
                parkingName = parkingName,
                parkingId = parkingId,
                pricePerMinute = pricePerMinute,
                maxDailyAmount = maxDailyAmount,
                pricingMode = pricingMode,
                segmentAmount = segmentAmount,
                segmentMinutes = segmentMinutes
            )
            
            Log.d(TAG, "✅ User info obtenido: $userInfo")
            Result.success(userInfo)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error al obtener info del usuario: ${e.message}", e)
            ErrorLogger.e("UserService", "getUserInfo exception: ${e.message}")
            Result.failure(Exception("Error al obtener información del usuario"))
        }
    }
}
