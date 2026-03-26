package com.inbyte.street.core

/**
 * Constantes globales de la aplicación
 */
object Constants {
    // Supabase Configuration
    const val SUPABASE_URL = "https://mmqqrfvullrovstcykcj.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tcXFyZnZ1bGxyb3ZzdGN5a2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjI4MzYsImV4cCI6MjA4NDc5ODgzNn0.7Dg6tcKkxdM0AHU7b6HnlbKTY8yBXPh2CD9P1uHs3FQ"
    
    // Edge Functions
    const val FUNCTION_OPEN_SHIFT = "open-shift"
    const val FUNCTION_CLOSE_SHIFT = "close-shift"
    const val FUNCTION_CREATE_SESSION = "create-session"
    const val FUNCTION_CLOSE_SESSION = "close-session"
    const val FUNCTION_CREATE_QUOTE = "create-quote"
    const val FUNCTION_PROCESS_PAYMENT = "process-payment"
    const val FUNCTION_GET_PARKING_STATUS = "get-parking-status"
    
    // DataStore Keys
    const val DATASTORE_NAME = "inbyte_parking_prefs"
    const val KEY_USER_TOKEN = "user_token"
    const val KEY_USER_EMAIL = "user_email"
    const val KEY_USER_ID = "user_id"
    const val KEY_ACTIVE_SHIFT_ID = "active_shift_id"
    const val KEY_TEXT_SCALE = "text_scale"
    
    // UI
    const val QUOTE_VALIDITY_SECONDS = 150
    const val SESSION_CODE_LENGTH = 6
}
