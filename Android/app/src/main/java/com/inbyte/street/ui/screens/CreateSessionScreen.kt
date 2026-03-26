package com.inbyte.street.ui.screens

import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.inbyte.street.data.remote.UserService
import com.inbyte.street.hardware.VoucherPrinter
import com.inbyte.street.ui.theme.*
import com.inbyte.street.ui.viewmodel.SessionUiState
import com.inbyte.street.ui.viewmodel.SessionViewModel
import com.inbyte.street.utils.DateUtils
import com.inbyte.street.utils.filterPlateInput
import com.inbyte.street.utils.normalizePlate
import com.inbyte.street.utils.PlateVisualTransformation
import com.inbyte.street.utils.formatPlateForDisplay
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val Shape = RoundedCornerShape(12.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateSessionScreen(
    viewModel: SessionViewModel,
    onBack: () -> Unit,
    onSessionCreated: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    var plate by remember { mutableStateOf("") }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var createdSession by remember { mutableStateOf<com.inbyte.street.data.model.CreateSessionResponse?>(null) }

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is SessionUiState.SessionCreated -> {
                createdSession = state.response
                showSuccessDialog = true
                plate = ""
                CoroutineScope(Dispatchers.IO).launch {
                    val prevHandler = Thread.getDefaultUncaughtExceptionHandler()
                    Thread.setDefaultUncaughtExceptionHandler { thread, e ->
                        val isNexgoCloudError = thread == Looper.getMainLooper().thread &&
                            (e is NoClassDefFoundError || e is ClassNotFoundException) &&
                            (e.message?.contains("ICloudService") == true || e.cause?.message?.contains("ICloudService") == true)
                        if (isNexgoCloudError) {
                            Handler(Looper.getMainLooper()).post {
                                Toast.makeText(context, "Impresora no disponible", Toast.LENGTH_SHORT).show()
                            }
                            return@setDefaultUncaughtExceptionHandler
                        }
                        prevHandler?.uncaughtException(thread, e)
                    }
                    val userInfo = runCatching { UserService().getUserInfo().getOrNull() }.getOrNull()
                    val header = userInfo?.let {
                        VoucherPrinter.VoucherHeader(
                            organizationName = it.organizationName,
                            parkingName = it.parkingName,
                            pricePerMinute = it.pricePerMinute,
                            pricingMode = it.pricingMode,
                            segmentAmount = it.segmentAmount,
                            segmentMinutes = it.segmentMinutes,
                            operatorName = it.displayName
                        )
                    }
                    val printed = VoucherPrinter.printEntryVoucher(context, state.response.session, header)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(
                            context,
                            if (printed) "Voucher impreso" else "Impresora no disponible",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                    delay(3000)
                    Thread.setDefaultUncaughtExceptionHandler(prevHandler)
                }
            }
            else -> {}
        }
    }

    if (showSuccessDialog && createdSession != null) {
        SessionCreatedDialog(
            response = createdSession!!,
            onDismiss = {
                showSuccessDialog = false
                createdSession = null
                viewModel.resetState()
            },
            onNewEntry = {
                showSuccessDialog = false
                createdSession = null
                viewModel.resetState()
                plate = ""
            },
            onFinish = {
                showSuccessDialog = false
                createdSession = null
                viewModel.resetState()
                onSessionCreated()
            }
        )
    }

    Scaffold(
        containerColor = BackgroundDarkGreen,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Registrar entrada",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Volver",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BackgroundDarkGreen,
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier.size(64.dp),
                shape = RoundedCornerShape(16.dp),
                color = PrimaryGreen.copy(alpha = 0.15f),
                border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryGreen.copy(alpha = 0.3f))
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        Icons.Default.DirectionsCar,
                        contentDescription = null,
                        modifier = Modifier.size(36.dp),
                        tint = PrimaryGreen
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                "Placa del vehículo",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Se normalizará automáticamente",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.6f)
            )

            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = plate,
                onValueChange = { plate = filterPlateInput(it) },
                label = { Text("Placa", color = Color.White.copy(alpha = 0.7f)) },
                placeholder = { Text("XXXX-XX", color = Color.White.copy(alpha = 0.4f)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = PlateVisualTransformation,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = {
                        focusManager.clearFocus()
                        if (plate.isNotBlank()) viewModel.createSession(plate)
                    }
                ),
                enabled = uiState !is SessionUiState.Loading,
                shape = Shape,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedContainerColor = CardDark,
                    unfocusedContainerColor = CardDark,
                    focusedBorderColor = PrimaryGreen,
                    unfocusedBorderColor = BorderDark,
                    cursorColor = PrimaryGreen,
                    focusedLabelColor = PrimaryGreen,
                    unfocusedLabelColor = Color.White.copy(alpha = 0.6f)
                )
            )

            if (uiState is SessionUiState.Error) {
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = Shape,
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f))
                ) {
                    Text(
                        (uiState as SessionUiState.Error).message,
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    focusManager.clearFocus()
                    if (plate.isNotBlank()) viewModel.createSession(plate)
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                shape = Shape,
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen),
                enabled = uiState !is SessionUiState.Loading && plate.isNotBlank(),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
            ) {
                if (uiState is SessionUiState.Loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = BackgroundDarkGreen,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Registrar entrada", style = MaterialTheme.typography.titleMedium, color = BackgroundDarkGreen)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text("Cancelar", color = Color.White.copy(alpha = 0.7f))
            }

            Spacer(modifier = Modifier.height(8.dp))

            TextButton(
                onClick = {
                    scope.launch {
                        val ok = VoucherPrinter.printTestVoucher(context)
                        withContext(Dispatchers.Main) {
                            Toast.makeText(
                                context,
                                if (ok) "Test impreso" else "Falló (ver logcat)",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = uiState !is SessionUiState.Loading
            ) {
                Text("Probar impresora", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.5f))
            }
        }
    }
}

@Composable
fun SessionCreatedDialog(
    response: com.inbyte.street.data.model.CreateSessionResponse,
    onDismiss: () -> Unit,
    onNewEntry: () -> Unit,
    onFinish: () -> Unit
) {
    val entryDate = DateUtils.formatDate(response.session.entryTime)
    val entryTime = DateUtils.formatTime(response.session.entryTime)

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CardDark,
        title = {
            Text("Entrada registrada", fontWeight = FontWeight.SemiBold, color = PrimaryGreen)
        },
        text = {
            Column {
                Text(
                    "Vehículo registrado:",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(12.dp))
                InfoRow("Placa", formatPlateForDisplay(response.session.normalizedPlate ?: response.session.plate))
                InfoRow("Fecha", entryDate)
                InfoRow("Hora entrada", entryTime)
                InfoRow("Estado", "Estacionado")
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = response.message ?: "Registrado en el sistema",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.6f)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onNewEntry,
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen)
            ) {
                Text("Registrar otro", color = BackgroundDarkGreen)
            }
        },
        dismissButton = {
            TextButton(onClick = onFinish) {
                Text("Finalizar", color = PrimaryGreen)
            }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text("$label:", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Color.White)
    }
}
