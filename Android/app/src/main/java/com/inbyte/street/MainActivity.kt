package com.inbyte.street

import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.inbyte.street.data.local.PreferencesManager
import com.inbyte.street.data.model.CardPaymentResult
import com.inbyte.street.ui.navigation.NavGraph
import com.inbyte.street.ui.theme.InbyteStreetTheme
import com.inbyte.street.utils.ErrorLogger
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    companion object {
        private const val TAG = "MainActivity"
        // Mismo intent que JIS Parking 1.3 (Multicaja/SmartPago)
        private const val APPLICATION_ID = "cl.multicaja.alimentacion"
        private const val CLASS_NAME = "cl.multicaja.alimentacion.ui.PosActivity"
    }

    private val _cardPaymentResult = MutableStateFlow<CardPaymentResult?>(null)
    val cardPaymentResult: StateFlow<CardPaymentResult?> = _cardPaymentResult.asStateFlow()

    private val paymentLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        handlePaymentResult(result.resultCode, result.data)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ErrorLogger.init(this)
        enableEdgeToEdge()
        setContent {
            var textScale by remember { mutableStateOf(1f) }
            var scaleLoaded by remember { mutableStateOf(false) }
            val scope = rememberCoroutineScope()
            val appContext = applicationContext

            LaunchedEffect(scaleLoaded) {
                if (!scaleLoaded) {
                    textScale = PreferencesManager(appContext).getTextScale()
                    scaleLoaded = true
                }
            }

            fun onTextScaleChange(scale: Float) {
                textScale = scale
                scope.launch {
                    PreferencesManager(appContext).setTextScale(scale)
                }
            }

            InbyteStreetTheme(textScale = textScale) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    NavGraph(
                        navController = navController,
                        context = appContext,
                        mainActivity = this,
                        textScale = textScale,
                        onTextScaleChange = ::onTextScaleChange
                    )
                }
            }
        }
    }

    /**
     * Lanza el intent de pago a Multicaja/SmartPago (igual que JIS Parking 1.3).
     * @param amount Monto en pesos (entero).
     */
    fun launchCardPayment(amount: Int) {
        Log.d(TAG, "launchCardPayment called amount=$amount thread=${Thread.currentThread().name}")
        try {
            val intent = Intent().apply {
                component = ComponentName(APPLICATION_ID, CLASS_NAME)
                putExtras(android.os.Bundle().apply {
                    putString("TRX_TYPE", "PAYMENT")
                    putInt("AMOUNT", amount)
                    putInt("TIP", 0)
                    putString("PARTNER_CODE", "")
                    putBoolean("NO_CLICK_PRINTING", false)
                    putBoolean("EXTERNAL_PRINTING", false)
                    putBoolean("SKIP_RESULT_SCREEN", true)
                    putInt("TAX_DOCUMENT_TYPE", 0)
                })
            }
            Log.d(TAG, "launchCardPayment: launching intent to $APPLICATION_ID/$CLASS_NAME")
            paymentLauncher.launch(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error launching payment intent", e)
            _cardPaymentResult.value = CardPaymentResult.Rejected(e.message ?: "Error al abrir pasarela de pago")
        }
    }

    /**
     * Procesa el resultado del intent (misma lógica que JIS: RESULT_CODE 01=aprobada, 99=rechazada).
     */
    private fun handlePaymentResult(resultCode: Int, data: Intent?) {
        val resultBundle = data?.extras ?: android.os.Bundle()
        if (resultBundle.isEmpty) {
            _cardPaymentResult.value = CardPaymentResult.Canceled
            return
        }
        try {
            val keys = resultBundle.keySet()?.joinToString(", ") ?: "(sin keys)"
            val mcCode = resultBundle.get("MC_CODE")?.toString()
            Log.d(TAG, "handlePaymentResult: keys=[$keys] MC_CODE=$mcCode RESULT_CODE=${resultBundle.getString("RESULT_CODE")}")
        } catch (_: Exception) {
        }
        val resultCodeFromBundle = resultBundle.getString("RESULT_CODE") ?: ""
        val responseMessage = resultBundle.getString("RESPONSE_MESSAGE") ?: ""
        val tradeResult = resultBundle.getInt("TRADE_RESULT", -1)
        val codigosAprobacion = listOf("0", "00", "01")
        val codigosRechazo = listOf("99", "96", "98")
        val isApproved = when {
            resultCodeFromBundle in codigosAprobacion -> true
            resultCodeFromBundle in codigosRechazo -> false
            tradeResult == 0 -> true
            else -> false
        }
        _cardPaymentResult.value = if (isApproved) {
            CardPaymentResult.Approved(data)
        } else {
            CardPaymentResult.Rejected(responseMessage.ifEmpty { "Transacción rechazada" })
        }
    }

    /** Limpia el último resultado (llamar después de consumirlo en la UI). */
    fun clearCardPaymentResult() {
        _cardPaymentResult.value = null
    }
}