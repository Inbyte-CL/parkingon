package com.inbyte.street

import android.app.Application
import com.inbyte.street.data.remote.SupabaseClientProvider

/**
 * Clase Application para inicialización global
 */
class StreetApp : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Inicializar Supabase Client
        SupabaseClientProvider.initialize(this)
    }
}
