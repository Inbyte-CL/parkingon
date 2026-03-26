package com.inbyte.street.data.remote

import android.content.Context
import com.inbyte.street.core.Constants
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest

/**
 * Cliente Supabase singleton
 * Proporciona acceso centralizado a los servicios de Supabase
 */
object SupabaseClientProvider {
    
    private var _client: SupabaseClient? = null
    
    fun initialize(context: Context) {
        if (_client == null) {
            _client = createSupabaseClient(
                supabaseUrl = Constants.SUPABASE_URL,
                supabaseKey = Constants.SUPABASE_ANON_KEY
            ) {
                install(Auth) {
                    // Configurar para que persista la sesión automáticamente
                    alwaysAutoRefresh = true
                    autoLoadFromStorage = true
                }
                install(Postgrest)
                install(Functions)
            }
        }
    }
    
    val client: SupabaseClient
        get() = _client ?: throw IllegalStateException("SupabaseClient no inicializado. Llama a initialize() primero.")
}
