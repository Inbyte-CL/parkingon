package com.inbyte.street.ui.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import com.inbyte.street.utils.ErrorLogger
import androidx.lifecycle.viewModelScope
import com.inbyte.street.data.local.PreferencesManager
import com.inbyte.street.data.model.*
import com.inbyte.street.data.remote.ShiftService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Estados de la UI de turnos
 */
sealed class ShiftUiState {
    object Idle : ShiftUiState()
    object Loading : ShiftUiState()
    data class ShiftOpened(val response: OpenShiftResponse) : ShiftUiState()
    data class ShiftClosed(val response: CloseShiftResponse) : ShiftUiState()
    data class Error(val message: String) : ShiftUiState()
}

/**
 * ViewModel para gestión de turnos
 */
class ShiftViewModel(
    private val context: Context
) : ViewModel() {
    
    private val shiftService = ShiftService()
    private val preferencesManager = PreferencesManager(context)
    
    private val _uiState = MutableStateFlow<ShiftUiState>(ShiftUiState.Idle)
    val uiState: StateFlow<ShiftUiState> = _uiState.asStateFlow()
    
    private val _hasActiveShift = MutableStateFlow(false)
    val hasActiveShift: StateFlow<Boolean> = _hasActiveShift.asStateFlow()
    
    private val _activeShiftId = MutableStateFlow<String?>(null)
    val activeShiftId: StateFlow<String?> = _activeShiftId.asStateFlow()
    
    private val _lastSyncTime = MutableStateFlow<Long?>(null)
    val lastSyncTime: StateFlow<Long?> = _lastSyncTime.asStateFlow()
    
    init {
        checkActiveShift()
    }
    
    /**
     * Verificar si hay turno activo guardado
     * También verifica en el servidor si el turno realmente está abierto
     */
    private fun checkActiveShift() {
        viewModelScope.launch {
            val shiftId = preferencesManager.getActiveShiftId()
            Log.d("ShiftViewModel", "🔍 Verificando turno activo - shiftId desde preferencias: $shiftId")
            
            if (shiftId.isNullOrEmpty()) {
                Log.d("ShiftViewModel", "ℹ️ No hay shift_id guardado, estado: sin turno")
                _hasActiveShift.value = false
                _activeShiftId.value = null
                return@launch
            }
            
            // Verificar primero en el servidor antes de establecer el estado local
            // Esto evita mostrar "Turno Activo" cuando en realidad está cerrado
            Log.d("ShiftViewModel", "🔍 Verificando en servidor antes de establecer estado local...")
            val verifyResult = shiftService.verifyShiftStatus(shiftId)
            
            verifyResult.onSuccess { isOpen ->
                // Actualizar tiempo de última sincronización
                _lastSyncTime.value = System.currentTimeMillis()
                
                if (isOpen) {
                    // El turno está abierto en el servidor - establecer estado
                    _hasActiveShift.value = true
                    _activeShiftId.value = shiftId
                    Log.d("ShiftViewModel", "✅ Verificación servidor: turno está abierto - Estado actualizado a true")
                } else {
                    // El turno fue cerrado (probablemente por superadmin)
                    // Limpiar preferencias locales y estado
                    Log.w("ShiftViewModel", "⚠️ Verificación servidor: turno NO está abierto, limpiando estado local")
                    preferencesManager.clearActiveShiftId()
                    _hasActiveShift.value = false
                    _activeShiftId.value = null
                    Log.d("ShiftViewModel", "✅ Estado actualizado a false después de limpiar")
                }
            }.onFailure { error ->
                // En caso de error de red, establecer estado basado en preferencias
                // pero con un warning en logs
                _lastSyncTime.value = System.currentTimeMillis()
                Log.w("ShiftViewModel", "⚠️ Error verificando turno en servidor: ${error.message} - Usando estado de preferencias")
                _hasActiveShift.value = true
                _activeShiftId.value = shiftId
            }
        }
    }
    
    /**
     * Refrescar estado del turno desde el servidor
     * Útil cuando se vuelve a la pantalla principal
     */
    fun refreshShiftStatus() {
        checkActiveShift()
    }
    
    /**
     * Abrir turno
     */
    fun openShift(initialCash: Double, notes: String?) {
        // Validaciones
        if (initialCash < 0) {
            _uiState.value = ShiftUiState.Error("El efectivo inicial no puede ser negativo")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = ShiftUiState.Loading
            
            val result = shiftService.openShift(initialCash, notes)
            
            result.onSuccess { response ->
                // Guardar shift_id en preferencias
                val shiftId = response.shift.id ?: response.shift.shiftId ?: ""
                Log.d("ShiftViewModel", "✅ Turno abierto - Guardando shift_id: $shiftId")
                Log.d("ShiftViewModel", "📦 Response shift: id=${response.shift.id}, shiftId=${response.shift.shiftId}, status=${response.shift.status}")
                
                if (shiftId.isNotEmpty()) {
                    preferencesManager.saveActiveShiftId(shiftId)
                    _hasActiveShift.value = true
                    _activeShiftId.value = shiftId
                    Log.d("ShiftViewModel", "✅ Estado actualizado: hasActiveShift=true, activeShiftId=$shiftId")
                } else {
                    Log.e("ShiftViewModel", "❌ Error: shift_id está vacío en la respuesta")
                }
                _uiState.value = ShiftUiState.ShiftOpened(response)
            }.onFailure { error ->
                val errorMessage = when {
                    error.message?.contains("Ya tienes un turno abierto") == true ->
                        "Ya tienes un turno abierto. Ciérralo primero."
                    error.message?.contains("No tienes un parking asignado") == true ->
                        "No tienes un parking asignado. Contacta al administrador."
                    error.message?.contains("network") == true ->
                        "Error de conexión. Verifica tu internet"
                    else ->
                        error.message ?: "Error al abrir turno"
                }
                Log.e("ShiftViewModel", "❌ openShift: $errorMessage")
                ErrorLogger.e("ShiftViewModel", "openShift: $errorMessage")
                _uiState.value = ShiftUiState.Error(errorMessage)
            }
        }
    }
    
    /**
     * Cerrar turno
     */
    fun closeShift(closingCash: Double, notes: String?) {
        // Validaciones
        if (closingCash < 0) {
            _uiState.value = ShiftUiState.Error("El efectivo de cierre no puede ser negativo")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = ShiftUiState.Loading
            
            val result = shiftService.closeShift(closingCash, notes)
            
            result.onSuccess { response ->
                // Limpiar shift_id de preferencias
                preferencesManager.clearActiveShiftId()
                _hasActiveShift.value = false
                _activeShiftId.value = null
                _uiState.value = ShiftUiState.ShiftClosed(response)
            }.onFailure { error ->
                val errorMessage = when {
                    error.message?.contains("No tienes un turno abierto") == true -> {
                        preferencesManager.clearActiveShiftId()
                        _hasActiveShift.value = false
                        _activeShiftId.value = null
                        "El turno ya fue cerrado"
                    }
                    error.message?.contains("Hay sesiones abiertas") == true ->
                        "No puedes cerrar el turno con sesiones abiertas"
                    error.message?.contains("network") == true ->
                        "Error de conexión. Verifica tu internet"
                    else ->
                        error.message ?: "Error al cerrar turno"
                }
                Log.e("ShiftViewModel", "❌ closeShift: $errorMessage")
                ErrorLogger.e("ShiftViewModel", "closeShift: $errorMessage")
                _uiState.value = ShiftUiState.Error(errorMessage)
            }
        }
    }
    
    /**
     * Resetear estado a Idle
     */
    fun resetState() {
        _uiState.value = ShiftUiState.Idle
    }
}
