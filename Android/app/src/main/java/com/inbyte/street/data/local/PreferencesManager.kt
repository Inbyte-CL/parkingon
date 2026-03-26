package com.inbyte.street.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.inbyte.street.core.Constants
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
    name = Constants.DATASTORE_NAME
)

/**
 * Gestor de preferencias locales usando DataStore
 */
class PreferencesManager(private val context: Context) {
    
    private val tokenKey = stringPreferencesKey(Constants.KEY_USER_TOKEN)
    private val emailKey = stringPreferencesKey(Constants.KEY_USER_EMAIL)
    private val userIdKey = stringPreferencesKey(Constants.KEY_USER_ID)
    private val activeShiftIdKey = stringPreferencesKey(Constants.KEY_ACTIVE_SHIFT_ID)
    private val textScaleKey = floatPreferencesKey(Constants.KEY_TEXT_SCALE)
    
    // Token
    suspend fun saveToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
        }
    }
    
    suspend fun getToken(): String? {
        return context.dataStore.data.first()[tokenKey]
    }
    
    val tokenFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[tokenKey]
    }
    
    // Email
    suspend fun saveEmail(email: String) {
        context.dataStore.edit { prefs ->
            prefs[emailKey] = email
        }
    }
    
    suspend fun getEmail(): String? {
        return context.dataStore.data.first()[emailKey]
    }
    
    // User ID
    suspend fun saveUserId(userId: String) {
        context.dataStore.edit { prefs ->
            prefs[userIdKey] = userId
        }
    }
    
    suspend fun getUserId(): String? {
        return context.dataStore.data.first()[userIdKey]
    }
    
    // Active Shift ID
    suspend fun saveActiveShiftId(shiftId: String) {
        context.dataStore.edit { prefs ->
            prefs[activeShiftIdKey] = shiftId
        }
    }
    
    suspend fun getActiveShiftId(): String? {
        return context.dataStore.data.first()[activeShiftIdKey]
    }
    
    suspend fun clearActiveShiftId() {
        context.dataStore.edit { prefs ->
            prefs.remove(activeShiftIdKey)
        }
    }
    
    // Text scale: 1f = normal, 1.75f = large (+75%)
    suspend fun setTextScale(scale: Float) {
        context.dataStore.edit { prefs ->
            prefs[textScaleKey] = scale.coerceIn(1f, 2f)
        }
    }
    
    suspend fun getTextScale(): Float {
        return context.dataStore.data.first()[textScaleKey] ?: 1f
    }
    
    val textScaleFlow: Flow<Float> = context.dataStore.data.map { prefs ->
        prefs[textScaleKey] ?: 1f
    }
    
    // Clear all
    suspend fun clear() {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
