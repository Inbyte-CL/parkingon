package com.inbyte.street.ui.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import com.inbyte.street.utils.ErrorLogger
import androidx.lifecycle.viewModelScope
import com.inbyte.street.data.model.UserInfo
import com.inbyte.street.data.model.ParkingOccupancy
import com.inbyte.street.data.remote.UserService
import com.inbyte.street.data.remote.SessionService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel para la pantalla principal (Home)
 */
class HomeViewModel(context: Context) : ViewModel() {
    
    private val userService = UserService()
    private val sessionService = SessionService()
    
    private val _userInfo = MutableStateFlow<UserInfo?>(null)
    val userInfo: StateFlow<UserInfo?> = _userInfo
    
    private val _occupancy = MutableStateFlow<ParkingOccupancy?>(null)
    val occupancy: StateFlow<ParkingOccupancy?> = _occupancy
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    init {
        loadUserInfo()
    }
    
    /**
     * Cargar información del usuario
     */
    fun loadUserInfo() {
        viewModelScope.launch {
            _isLoading.value = true
            
            val result = userService.getUserInfo()
            result.onSuccess { info ->
                Log.d("HomeViewModel", "✅ User info loaded: $info")
                _userInfo.value = info
                
                // Cargar ocupación del parking (siempre desde la BD)
                loadOccupancy()
            }.onFailure { error ->
                val msg = error.message ?: "Error al cargar info de usuario"
                Log.e("HomeViewModel", "❌ Error loading user info: $msg")
                ErrorLogger.e("HomeViewModel", "loadUserInfo: $msg")
            }
            
            _isLoading.value = false
        }
    }
    
    /**
     * Cargar ocupación del parking en tiempo real
     * Siempre consulta desde la BD para obtener todas las sesiones activas del parking
     */
    fun loadOccupancy() {
        viewModelScope.launch {
            Log.d("HomeViewModel", "🔄 Cargando ocupación desde BD...")
            val result = sessionService.getActiveSessions()
            result.onSuccess { response ->
                Log.d("HomeViewModel", "✅ Occupancy loaded: ${response.occupancy}")
                Log.d("HomeViewModel", "📊 Sesiones activas: ${response.sessions.size}")
                _occupancy.value = response.occupancy
            }.onFailure { error ->
                val msg = error.message ?: "Error al cargar ocupación"
                Log.e("HomeViewModel", "❌ Error loading occupancy: $msg")
                ErrorLogger.e("HomeViewModel", "loadOccupancy: $msg")
            }
        }
    }
    
    /**
     * Refrescar datos del usuario y ocupación
     * Útil cuando se vuelve a la app o se inicia sesión
     */
    fun refresh() {
        loadUserInfo()
    }
}
