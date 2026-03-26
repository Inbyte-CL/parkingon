package com.inbyte.street.ui.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.inbyte.street.data.model.ActiveSessionsResponse
import com.inbyte.street.data.model.CloseSessionResponse
import com.inbyte.street.data.model.CreateQuoteResponse
import com.inbyte.street.data.model.CreateSessionResponse
import com.inbyte.street.data.model.ProcessPaymentResponse
import com.inbyte.street.data.remote.SessionService
import com.inbyte.street.utils.ErrorLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ViewModel para gestión de sesiones de estacionamiento
 */
class SessionViewModel(context: Context) : ViewModel() {
    
    private val sessionService = SessionService()
    
    private val _uiState = MutableStateFlow<SessionUiState>(SessionUiState.Idle)
    val uiState: StateFlow<SessionUiState> = _uiState
    
    /**
     * Crea una nueva sesión de estacionamiento
     */
    fun createSession(plate: String) {
        if (plate.isBlank()) {
            _uiState.value = SessionUiState.Error("La placa no puede estar vacía")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = SessionUiState.Loading
            
            val result = sessionService.createSession(plate)
            
            result.onSuccess { response ->
                Log.d("SessionViewModel", "✅ Session created successfully: ${response.session.id}")
                _uiState.value = SessionUiState.SessionCreated(response)
            }.onFailure { error ->
                val msg = error.message ?: "Error al crear la sesión"
                Log.e("SessionViewModel", "❌ Error creating session: $msg")
                ErrorLogger.e("SessionViewModel", "createSession: $msg")
                _uiState.value = SessionUiState.Error(msg)
            }
        }
    }
    
    /**
     * Obtiene las sesiones activas con ocupación del parking
     */
    fun getActiveSessions() {
        viewModelScope.launch {
            _uiState.value = SessionUiState.Loading
            
            val result = sessionService.getActiveSessions()
            
            result.onSuccess { response ->
                Log.d("SessionViewModel", "✅ Active sessions loaded: ${response.sessions.size}")
                Log.d("SessionViewModel", "📊 Occupancy: ${response.occupancy.occupiedSpaces}/${response.occupancy.totalSpaces}")
                _uiState.value = SessionUiState.ActiveSessionsLoaded(response)
            }.onFailure { error ->
                val msg = error.message ?: "Error al cargar las sesiones"
                Log.e("SessionViewModel", "❌ Error loading sessions: $msg")
                ErrorLogger.e("SessionViewModel", "getActiveSessions: $msg")
                _uiState.value = SessionUiState.Error(msg)
            }
        }
    }
    
    /**
     * Cierra una sesión sin procesar pago (registrar salida).
     * @param amount Monto mostrado en la ventana de salida (se guarda tal cual)
     * @param minutes Minutos cobrados correspondientes a ese monto
     */
    fun closeSession(
        sessionId: String,
        reason: String? = null,
        amount: Double? = null,
        minutes: Int? = null
    ) {
        viewModelScope.launch {
            _uiState.value = SessionUiState.Loading
            
            val result = sessionService.closeSession(sessionId, reason, amount, minutes)
            
            result.onSuccess { response ->
                Log.d("SessionViewModel", "✅ Session closed successfully: ${response.session.id}")
                _uiState.value = SessionUiState.SessionClosed(response)
            }.onFailure { error ->
                val msg = error.message ?: "Error al cerrar la sesión"
                Log.e("SessionViewModel", "❌ Error closing session: $msg")
                ErrorLogger.e("SessionViewModel", "closeSession: $msg")
                _uiState.value = SessionUiState.Error(msg)
            }
        }
    }
    
    /**
     * Crea una cotización para la sesión (para pago con tarjeta o efectivo).
     * Devuelve el resultado vía callback para no mezclar con el estado de cierre.
     */
    fun createQuote(sessionId: String, onResult: (Result<CreateQuoteResponse>) -> Unit) {
        viewModelScope.launch {
            _uiState.value = SessionUiState.Loading
            Log.d("SessionViewModel", "createQuote: calling API for sessionId=$sessionId")
            val result = sessionService.createQuote(sessionId)
            _uiState.value = SessionUiState.Idle
            Log.d("SessionViewModel", "createQuote: result success=${result.isSuccess}, invoking callback on Main")
            withContext(Dispatchers.Main.immediate) {
                onResult(result)
            }
        }
    }

    /**
     * Crea una cotización en segundo plano sin cambiar el UI state (Loading).
     * Sirve para pre-crear la quote al entrar a la pantalla y lanzar el intent al instante al tocar "Pago con tarjeta".
     */
    fun createQuoteInBackground(sessionId: String, onResult: (Result<CreateQuoteResponse>) -> Unit) {
        viewModelScope.launch {
            Log.d("SessionViewModel", "createQuoteInBackground: calling API for sessionId=$sessionId")
            val result = sessionService.createQuote(sessionId)
            Log.d("SessionViewModel", "createQuoteInBackground: result success=${result.isSuccess}")
            withContext(Dispatchers.Main.immediate) {
                onResult(result)
            }
        }
    }

    /**
     * Procesa el pago (tarjeta/efectivo) con la quote; al completar cierra la sesión y emite SessionClosed.
     */
    fun processPayment(quoteId: String, paymentMethod: String, klapCode: String = "0") {
        viewModelScope.launch {
            _uiState.value = SessionUiState.Loading
            val result = sessionService.processPayment(quoteId, paymentMethod, klapCode)
            result.onSuccess { response ->
                Log.d("SessionViewModel", "✅ Payment processed, session closed")
                _uiState.value = SessionUiState.SessionClosed(
                    CloseSessionResponse(success = true, session = response.session, message = response.message)
                )
            }.onFailure { error ->
                val msg = error.message ?: "Error al procesar el pago"
                Log.e("SessionViewModel", "❌ processPayment: $msg")
                ErrorLogger.e("SessionViewModel", "processPayment[$paymentMethod]: $msg")
                _uiState.value = SessionUiState.Error(msg)
            }
        }
    }

    /**
     * Resetea el estado a Idle
     */
    fun resetState() {
        _uiState.value = SessionUiState.Idle
    }
}

/**
 * Estados de la UI para sesiones
 */
sealed class SessionUiState {
    object Idle : SessionUiState()
    object Loading : SessionUiState()
    data class SessionCreated(val response: CreateSessionResponse) : SessionUiState()
    data class ActiveSessionsLoaded(val response: ActiveSessionsResponse) : SessionUiState()
    data class SessionClosed(val response: CloseSessionResponse) : SessionUiState()
    data class Error(val message: String) : SessionUiState()
}
