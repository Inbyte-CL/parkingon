package com.inbyte.street.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.inbyte.street.data.local.PreferencesManager
import com.inbyte.street.data.model.User
import com.inbyte.street.data.remote.AuthService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Estados de la UI de autenticación
 */
sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class Success(val user: User) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

/**
 * ViewModel para gestión de autenticación
 */
class AuthViewModel(
    private val context: Context
) : ViewModel() {
    
    private val authService = AuthService()
    private val preferencesManager = PreferencesManager(context)
    
    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
    
    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()
    
    init {
        checkLoginStatus()
    }
    
    /**
     * Verificar si hay sesión guardada
     */
    private fun checkLoginStatus() {
        viewModelScope.launch {
            val token = preferencesManager.getToken()
            _isLoggedIn.value = !token.isNullOrEmpty() && authService.isLoggedIn()
        }
    }
    
    /**
     * Login
     */
    fun login(email: String, password: String) {
        // Validaciones
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = AuthUiState.Error("Por favor completa todos los campos")
            return
        }
        
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            _uiState.value = AuthUiState.Error("Email inválido")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            
            val result = authService.login(email, password)
            
            result.onSuccess { user ->
                // Guardar datos en preferencias
                val token = authService.getCurrentToken()
                if (token != null) {
                    preferencesManager.saveToken(token)
                    preferencesManager.saveEmail(user.email)
                    preferencesManager.saveUserId(user.id)
                    
                    _isLoggedIn.value = true
                    _uiState.value = AuthUiState.Success(user)
                } else {
                    _uiState.value = AuthUiState.Error("Error al obtener token")
                }
            }.onFailure { error ->
                val errorMessage = when {
                    error.message?.contains("Invalid login credentials") == true -> 
                        "Email o contraseña incorrectos"
                    error.message?.contains("Email not confirmed") == true -> 
                        "Email no confirmado"
                    error.message?.contains("network") == true -> 
                        "Error de conexión. Verifica tu internet"
                    else -> 
                        error.message ?: "Error al iniciar sesión"
                }
                _uiState.value = AuthUiState.Error(errorMessage)
            }
        }
    }
    
    /**
     * Logout
     */
    fun logout() {
        viewModelScope.launch {
            authService.logout()
            preferencesManager.clear()
            _isLoggedIn.value = false
            _uiState.value = AuthUiState.Idle
        }
    }
    
    /**
     * Resetear estado a Idle
     */
    fun resetState() {
        _uiState.value = AuthUiState.Idle
    }
}
