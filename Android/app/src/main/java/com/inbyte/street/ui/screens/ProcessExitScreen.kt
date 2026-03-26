package com.inbyte.street.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.inbyte.street.MainActivity
import com.inbyte.street.data.model.CardPaymentResult
import com.inbyte.street.data.model.CreateQuoteResponse
import com.inbyte.street.data.model.Quote
import com.inbyte.street.data.model.SessionWithDuration
import com.inbyte.street.hardware.VoucherPrinter
import com.inbyte.street.ui.theme.*
import com.inbyte.street.ui.viewmodel.SessionUiState
import com.inbyte.street.ui.viewmodel.SessionViewModel
import com.inbyte.street.utils.CurrencyUtils
import com.inbyte.street.utils.DateUtils
import com.inbyte.street.utils.formatPlateForDisplay
import com.inbyte.street.utils.computeSessionAmount
import com.inbyte.street.utils.formatTariffLabel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val CardShape = RoundedCornerShape(16.dp)
private val GreenAlpha10 = PrimaryGreen.copy(alpha = 0.1f)
private val NeutralDark = Color(0xFF1D3329)

private fun isQuoteFreshEnough(quote: Quote?, minSecondsRemaining: Long = 30): Boolean {
    if (quote?.validUntil.isNullOrBlank()) return false
    return try {
        val expiresMillis = java.time.ZonedDateTime.parse(quote!!.validUntil).toInstant().toEpochMilli()
        val remaining = expiresMillis - System.currentTimeMillis()
        remaining > (minSecondsRemaining * 1000)
    } catch (_: Exception) {
        false
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcessExitScreen(
    session: SessionWithDuration,
    pricePerMinute: Double,
    maxDailyAmount: Double? = null,
    pricingMode: String = "per_minute",
    segmentAmount: Double? = null,
    segmentMinutes: Int? = null,
    voucherHeader: VoucherPrinter.VoucherHeader? = null,
    viewModel: SessionViewModel,
    mainActivity: MainActivity?,
    onBack: () -> Unit,
    onExitProcessed: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val cardPaymentResultState = if (mainActivity != null) {
        mainActivity.cardPaymentResult.collectAsState(initial = null)
    } else {
        remember { mutableStateOf<CardPaymentResult?>(null) }
    }
    val cardPaymentResult by cardPaymentResultState

    val context = androidx.compose.ui.platform.LocalContext.current
    var currentAmount by remember { mutableStateOf(0.0) }
    var currentDuration by remember { mutableStateOf(session.durationMinutes) }
    var currentTimeIso by remember { mutableStateOf(nowIso()) }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var closedSessionId by remember { mutableStateOf<String?>(null) }
    var currentQuote by remember { mutableStateOf<Quote?>(null) }
    var preCreatedQuote by remember { mutableStateOf<Quote?>(null) }
    var isWaitingCardResult by remember { mutableStateOf(false) }
    var showCashDialog by remember { mutableStateOf(false) }
    var cashChangeAmount by remember { mutableStateOf(0.0) }
    // Datos del pago en efectivo pendientes de imprimir (amountPaid, amountReceived, exitTimeIso)
    var pendingCashPrint by remember { mutableStateOf<Triple<Double, Double, String>?>(null) }
    var errorDialogMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Pre-crear cotización al cargar la pantalla para que "Pago con tarjeta" lance el intent al instante
    LaunchedEffect(session.id) {
        viewModel.createQuoteInBackground(session.id) { result ->
            result.onSuccess { preCreatedQuote = it.quote }
        }
    }

    LaunchedEffect(session.id, pricePerMinute, maxDailyAmount, pricingMode, segmentAmount, segmentMinutes) {
        while (true) {
            val entryTimeMillis = java.time.ZonedDateTime.parse(session.entryTime).toInstant().toEpochMilli()
            val durationMinutes = ((System.currentTimeMillis() - entryTimeMillis) / (1000 * 60)).toInt()
            currentDuration = durationMinutes
            currentAmount = computeSessionAmount(
                durationMinutes, pricePerMinute, maxDailyAmount, pricingMode, segmentAmount, segmentMinutes
            )
            currentTimeIso = nowIso()
            delay(1000)
        }
    }

    LaunchedEffect(cardPaymentResult) {
        val result = cardPaymentResult ?: return@LaunchedEffect
        mainActivity?.clearCardPaymentResult()
        isWaitingCardResult = false
        when (result) {
            is CardPaymentResult.Approved -> {
                val quote = currentQuote
                val extras = result.data?.extras
                val mcCode = try {
                    val keysToTry = listOf(
                        "MC_CODE",
                        "MCCode",
                        "MCCODE",
                        "MC-CODE",
                        "CODIGO_KLAP",
                        "KLAP_CODE"
                    )
                    val direct = keysToTry
                        .asSequence()
                        .mapNotNull { k -> extras?.get(k)?.toString()?.trim()?.takeIf { it.isNotBlank() } }
                        .firstOrNull()
                    if (direct != null) direct else run {
                        // Heurística: algunos POS cambian el nombre del extra. Buscamos por patrón.
                        val keySet = extras?.keySet().orEmpty()
                        val dynamicKey = keySet.firstOrNull { k ->
                            val up = k.uppercase(Locale.ROOT)
                            (up.contains("MC") && up.contains("CODE")) || up.contains("KLAP")
                        }
                        dynamicKey?.let { k -> extras?.get(k)?.toString()?.trim()?.takeIf { it.isNotBlank() } } ?: "0"
                    }
                } catch (_: Exception) {
                    "0"
                }
                // Log de diagnóstico: qué keys llegan realmente en el intent aprobado
                try {
                    val keys = extras?.keySet()?.joinToString(", ") ?: "(sin extras)"
                    Log.d("ProcessExitScreen", "Card intent approved extras keys=[$keys] MC_CODE=$mcCode")
                } catch (_: Exception) {
                }
                if (quote != null) viewModel.processPayment(quote.quoteId, "card", mcCode)
                else errorDialogMessage = "Error: no se encontró la cotización activa. Intente nuevamente."
            }
            is CardPaymentResult.Rejected -> {
                errorDialogMessage = "Transacción rechazada\n\n${result.message}"
            }
            is CardPaymentResult.Canceled -> {
                snackbarHostState.showSnackbar("Pago cancelado")
            }
        }
    }

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is SessionUiState.SessionClosed -> {
                if (closedSessionId != state.response.session.id) {
                    closedSessionId = state.response.session.id
                    // Imprimir comprobante de pago en efectivo si corresponde
                    val cashPrint = pendingCashPrint
                    if (cashPrint != null) {
                        pendingCashPrint = null
                        val (amountPaid, amountReceived, exitTimeIso) = cashPrint
                        val cashData = VoucherPrinter.CashPaymentData(
                            plate = session.plate,
                            sessionCode = session.sessionCode ?: session.id.take(8),
                            entryTime = session.entryTime,
                            exitTime = exitTimeIso,
                            durationMinutes = currentDuration,
                            amountPaid = amountPaid,
                            amountReceived = amountReceived,
                            changeAmount = (amountReceived - amountPaid).coerceAtLeast(0.0)
                        )
                        VoucherPrinter.printCashPaymentVoucher(context, cashData, voucherHeader)
                    }
                    showSuccessDialog = true
                }
            }
            is SessionUiState.Error -> errorDialogMessage = state.message
            else -> {}
        }
    }

    if (showSuccessDialog) {
        ExitConfirmationDialog(
            plate = session.plate,
            changeAmount = if (cashChangeAmount > 0) cashChangeAmount else null,
            onDismiss = {
                showSuccessDialog = false
                cashChangeAmount = 0.0
                viewModel.resetState()
                onExitProcessed()
            }
        )
    }

    val errMsg = errorDialogMessage
    if (errMsg != null) {
        AlertDialog(
            onDismissRequest = { errorDialogMessage = null },
            containerColor = CardDark,
            icon = {
                Icon(
                    Icons.Default.ErrorOutline,
                    contentDescription = null,
                    modifier = Modifier.size(36.dp),
                    tint = Color(0xFFFF6B6B)
                )
            },
            title = {
                Text("Error", fontWeight = FontWeight.Bold, color = Color(0xFFFF6B6B))
            },
            text = {
                Box(
                    modifier = Modifier
                        .heightIn(max = 300.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        errMsg,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { errorDialogMessage = null },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF6B6B))
                ) {
                    Text("Cerrar", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    if (showCashDialog) {
        CashPaymentDialog(
            plate = session.plate,
            entryTime = session.entryTime,
            durationMinutes = currentDuration,
            amountToPay = currentAmount,
            preCreatedQuote = preCreatedQuote,
            isLoading = uiState is SessionUiState.Loading,
            onConfirm = { receivedAmount, quote ->
                cashChangeAmount = (receivedAmount - quote.amountLocked).coerceAtLeast(0.0)
                pendingCashPrint = Triple(quote.amountLocked, receivedAmount, nowIso())
                currentQuote = quote
                showCashDialog = false
                viewModel.processPayment(quote.quoteId, "cash")
            },
            onCreateQuote = { onResult ->
                viewModel.createQuote(session.id, onResult)
            },
            onDismiss = { showCashDialog = false }
        )
    }

    val durationText = if (currentDuration < 60) "${currentDuration}m" else "${currentDuration / 60}h ${currentDuration % 60}m"
    val amountStr = CurrencyUtils.formatCLP(currentAmount).replace("$", "").trim()

    Scaffold(
        containerColor = BackgroundDarkGreen,
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = CardDark,
                    contentColor = Color.White
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // ----- Header -----
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 48.dp)
                    .padding(top = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    onClick = onBack,
                    modifier = Modifier.size(40.dp),
                    shape = CircleShape,
                    color = GreenAlpha10
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Volver",
                            tint = PrimaryGreen,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
                Text(
                    "Salida de vehículo",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.size(40.dp))
            }

            // ----- Scroll content -----
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp)
            ) {
                // ----- Primary plate card (green) -----
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = CardShape,
                        color = PrimaryGreen,
                        shadowElevation = 6.dp
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                "SESIÓN ACTIVA",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = BackgroundDarkGreen.copy(alpha = 0.8f),
                                letterSpacing = 1.5.sp
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                formatPlateForDisplay(session.plate),
                                style = MaterialTheme.typography.displayMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = BackgroundDarkGreen
                            )
                            Row(
                                modifier = Modifier.padding(top = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.LocationOn,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = BackgroundDarkGreen
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    "Estacionamiento",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    color = BackgroundDarkGreen
                                )
                            }
                        }
                    }
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 16.dp, y = (-16).dp)
                            .size(72.dp)
                            .background(
                                BackgroundDarkGreen.copy(alpha = 0.12f),
                                CircleShape
                            )
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // ----- Session details card -----
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = CardShape,
                    color = NeutralDark.copy(alpha = 0.4f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryGreen.copy(alpha = 0.2f))
                ) {
                    Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
                        DetailRow("Fecha y hora entrada", DateUtils.formatEntryDisplay(session.entryTime))
                        HorizontalDivider(color = PrimaryGreen.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 8.dp))
                        DetailRow("Hora actual", formatCurrentTime(currentTimeIso))
                        HorizontalDivider(color = PrimaryGreen.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 8.dp))
                        DetailRow("Duración total", durationText, trailingIcon = {
                            Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp), tint = PrimaryGreen)
                        })
                        HorizontalDivider(color = PrimaryGreen.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 8.dp))
                        DetailRow("Tarifa aplicada", formatTariffLabel(pricePerMinute, pricingMode, segmentAmount, segmentMinutes))
                        if (maxDailyAmount != null) {
                            DetailRow("Tope máx.", CurrencyUtils.formatCLP(maxDailyAmount))
                        }
                    }
                }

                // ----- Total to pay -----
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "TOTAL A PAGAR",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryGreen,
                        letterSpacing = 1.5.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            "$",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White.copy(alpha = 0.6f),
                            modifier = Modifier.padding(end = 4.dp, bottom = 4.dp)
                        )
                        Text(
                            amountStr.ifEmpty() { "0" },
                            style = MaterialTheme.typography.displayLarge,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                }
            }

            // ----- Fixed footer -----
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = BackgroundDarkGreen.copy(alpha = 0.9f),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                        .padding(bottom = 16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                if (uiState is SessionUiState.Loading || showSuccessDialog || showCashDialog) return@OutlinedButton
                                showCashDialog = true
                            },
                            modifier = Modifier.weight(1f).heightIn(min = 72.dp),
                            shape = CardShape,
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = PrimaryGreen,
                                disabledContentColor = PrimaryGreen.copy(alpha = 0.5f)
                            ),
                            border = androidx.compose.foundation.BorderStroke(2.dp, PrimaryGreen),
                            enabled = uiState !is SessionUiState.Loading && !showSuccessDialog && !showCashDialog,
                            contentPadding = PaddingValues(vertical = 10.dp, horizontal = 8.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(Icons.Default.Payments, contentDescription = null, modifier = Modifier.size(22.dp), tint = PrimaryGreen)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    "Pago en efectivo",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 2,
                                    color = PrimaryGreen
                                )
                            }
                        }
                        Button(
                            onClick = {
                                if (mainActivity == null) {
                                    errorDialogMessage = "Error: no se puede abrir el módulo de pago con tarjeta."
                                    return@Button
                                }
                                if (isWaitingCardResult || showSuccessDialog) return@Button
                                val quote = preCreatedQuote
                                if (isQuoteFreshEnough(quote)) {
                                    currentQuote = quote
                                    val amountInt = (quote?.amountLocked ?: 0.0).toInt().coerceAtLeast(1)
                                    isWaitingCardResult = true
                                    mainActivity.launchCardPayment(amountInt)
                                    return@Button
                                }
                                isWaitingCardResult = true
                                viewModel.createQuote(session.id) { result ->
                                    result.onSuccess { response ->
                                        currentQuote = response.quote
                                        preCreatedQuote = response.quote
                                        val amountInt = response.quote.amountLocked.toInt().coerceAtLeast(1)
                                        mainActivity.launchCardPayment(amountInt)
                                    }.onFailure { e ->
                                        isWaitingCardResult = false
                                        errorDialogMessage = "Error al crear cotización:\n\n${e.message ?: "Error desconocido"}"
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f).heightIn(min = 72.dp),
                            shape = CardShape,
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                            enabled = mainActivity != null && !isWaitingCardResult && !showSuccessDialog,
                            contentPadding = PaddingValues(vertical = 10.dp, horizontal = 8.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                if (isWaitingCardResult && currentQuote != null) {
                                    CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp, color = BackgroundDarkGreen)
                                } else {
                                    Icon(Icons.Default.CreditCard, contentDescription = null, modifier = Modifier.size(22.dp), tint = BackgroundDarkGreen)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    if (isWaitingCardResult && currentQuote != null) "Esperando tarjeta..." else "Pago con tarjeta",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = BackgroundDarkGreen,
                                    maxLines = 2
                                )
                            }
                        }
                    }
                    Text(
                        "Cierre automático de sesión tras el pago",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.4f),
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

    }
}

private fun nowIso(): String = java.time.ZonedDateTime.now(ZoneId.systemDefault()).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)

private fun formatCurrentTime(iso: String): String {
    return try {
        val zdt = java.time.ZonedDateTime.parse(iso)
        zdt.format(DateTimeFormatter.ofPattern("d MMM, hh:mm a", Locale("es")))
    } catch (_: Exception) {
        DateUtils.formatEntryDisplay(iso)
    }
}

@Composable
private fun DetailRow(
    label: String,
    value: String,
    trailingIcon: @Composable (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = PrimaryGreen.copy(alpha = 0.7f)
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            trailingIcon?.invoke()
            if (trailingIcon != null) Spacer(modifier = Modifier.width(6.dp))
            Text(
                value,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
        }
    }
}

@Composable
fun ExitConfirmationDialog(
    plate: String,
    changeAmount: Double? = null,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CardDark,
        icon = {
            Icon(
                Icons.Default.DirectionsCar,
                contentDescription = null,
                modifier = Modifier.size(44.dp),
                tint = PrimaryGreen
            )
        },
        title = {
            Text("Salida registrada", fontWeight = FontWeight.SemiBold, color = PrimaryGreen)
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "Vehículo salido del estacionamiento:",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = GreenAlpha10
                ) {
                    Text(
                        plate,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(16.dp),
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                if (changeAmount != null && changeAmount > 0) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = PrimaryGreen.copy(alpha = 0.15f)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                "VUELTO A ENTREGAR",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = PrimaryGreen,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                CurrencyUtils.formatCLP(changeAmount),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Black,
                                color = PrimaryGreen
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }
                Text(
                    "Sesión cerrada correctamente.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }
        },
        confirmButton = {
            Button(onClick = onDismiss, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen)) {
                Text("Aceptar", color = BackgroundDarkGreen)
            }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
private fun CashPaymentDialog(
    plate: String,
    entryTime: String,
    durationMinutes: Int,
    amountToPay: Double,
    preCreatedQuote: Quote?,
    isLoading: Boolean,
    onConfirm: (receivedAmount: Double, quote: Quote) -> Unit,
    onCreateQuote: (onResult: (Result<CreateQuoteResponse>) -> Unit) -> Unit,
    onDismiss: () -> Unit
) {
    var receivedInput by remember { mutableStateOf("") }
    var lockedQuote by remember { mutableStateOf(preCreatedQuote) }
    var isCreatingQuote by remember { mutableStateOf(false) }
    var quoteError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val lockedAmount = lockedQuote?.amountLocked ?: amountToPay
    val receivedAmount = receivedInput.toDoubleOrNull() ?: 0.0
    val change = (receivedAmount - lockedAmount).coerceAtLeast(0.0)
    val canConfirm = receivedAmount >= lockedAmount && lockedQuote != null && !isCreatingQuote && !isLoading

    LaunchedEffect(Unit) {
        if (lockedQuote == null) {
            isCreatingQuote = true
            onCreateQuote { result ->
                result.onSuccess { response -> lockedQuote = response.quote }
                    .onFailure { e -> quoteError = e.message ?: "Error al obtener cotización" }
                isCreatingQuote = false
            }
        }
    }

    Dialog(
        onDismissRequest = { if (!isCreatingQuote && !isLoading) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(20.dp),
            color = CardDark
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Pago en efectivo",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryGreen
                    )
                    Icon(Icons.Default.Payments, contentDescription = null, tint = PrimaryGreen, modifier = Modifier.size(24.dp))
                }

                Spacer(modifier = Modifier.height(16.dp))

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = BackgroundDarkGreen.copy(alpha = 0.6f)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        CashDetailRow("Patente", formatPlateForDisplay(plate))
                        CashDetailRow("Entrada", DateUtils.formatEntryDisplay(entryTime))
                        CashDetailRow(
                            "Duración",
                            if (durationMinutes < 60) "${durationMinutes}m" else "${durationMinutes / 60}h ${durationMinutes % 60}m"
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = PrimaryGreen.copy(alpha = 0.12f)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "TOTAL A PAGAR",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryGreen,
                            letterSpacing = 1.sp
                        )
                        if (isCreatingQuote) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = PrimaryGreen)
                        } else {
                            Text(
                                CurrencyUtils.formatCLP(lockedAmount),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = receivedInput,
                    onValueChange = { v -> if (v.length <= 8) receivedInput = v.filter { it.isDigit() } },
                    label = { Text("Monto recibido ($)", color = Color.White.copy(alpha = 0.6f)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PrimaryGreen,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        cursorColor = PrimaryGreen
                    ),
                    textStyle = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = when {
                        receivedAmount <= 0 -> Color.White.copy(alpha = 0.05f)
                        receivedAmount < lockedAmount -> Color(0xFFB00020).copy(alpha = 0.15f)
                        else -> PrimaryGreen.copy(alpha = 0.15f)
                    }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "VUELTO",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = when {
                                receivedAmount < lockedAmount && receivedAmount > 0 -> Color(0xFFFF6B6B)
                                change > 0 -> PrimaryGreen
                                else -> Color.White.copy(alpha = 0.4f)
                            },
                            letterSpacing = 1.sp
                        )
                        Text(
                            when {
                                receivedAmount <= 0 -> "—"
                                receivedAmount < lockedAmount -> "Monto insuficiente"
                                else -> CurrencyUtils.formatCLP(change)
                            },
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            color = when {
                                receivedAmount < lockedAmount && receivedAmount > 0 -> Color(0xFFFF6B6B)
                                change > 0 -> PrimaryGreen
                                else -> Color.White.copy(alpha = 0.4f)
                            }
                        )
                    }
                }

                if (quoteError != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Error: $quoteError",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFFF6B6B)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        enabled = !isLoading,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White.copy(alpha = 0.7f)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.3f))
                    ) {
                        Text("Cancelar", fontWeight = FontWeight.SemiBold)
                    }
                    Button(
                        onClick = {
                            val q = lockedQuote ?: return@Button
                            onConfirm(receivedAmount, q)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        enabled = canConfirm,
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = BackgroundDarkGreen)
                        } else {
                            Icon(Icons.Default.Check, contentDescription = null, tint = BackgroundDarkGreen, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Confirmar", fontWeight = FontWeight.Bold, color = BackgroundDarkGreen)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CashDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.55f))
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = Color.White)
    }
}
