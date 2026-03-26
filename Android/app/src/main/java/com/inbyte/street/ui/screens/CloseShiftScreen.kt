package com.inbyte.street.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.inbyte.street.ui.theme.*
import com.inbyte.street.ui.viewmodel.ShiftUiState
import com.inbyte.street.ui.viewmodel.ShiftViewModel
import kotlinx.coroutines.launch

private val Shape = RoundedCornerShape(12.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CloseShiftScreen(
    viewModel: ShiftViewModel,
    onBack: () -> Unit,
    onShiftClosed: () -> Unit
) {
    var closingCash by remember { mutableStateOf("") }
    var showSummary by remember { mutableStateOf(false) }
    var summaryData by remember { mutableStateOf<com.inbyte.street.data.model.CloseShiftResponse?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is ShiftUiState.ShiftClosed -> {
                summaryData = state.response
                showSummary = true
            }
            is ShiftUiState.Error -> {
                errorMessage = state.message
                viewModel.resetState()
            }
            else -> {}
        }
    }

    if (showSummary && summaryData != null) {
        ShiftSummaryDialog(
            summary = summaryData!!,
            onDismiss = {
                showSummary = false
                viewModel.resetState()
                onShiftClosed()
            }
        )
    }

    errorMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { errorMessage = null },
            title = {
                Text(
                    "Error al cerrar turno",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        msg,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = { errorMessage = null }) {
                    Text("Entendido", color = PrimaryGreen, fontWeight = FontWeight.SemiBold)
                }
            },
            containerColor = CardDark
        )
    }

    Scaffold(
        containerColor = BackgroundDarkGreen,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Cerrar turno",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BackgroundDarkGreen,
                    titleContentColor = Color.White
                )
            )
        },
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
        ) {
            Surface(
                modifier = Modifier
                    .size(64.dp)
                    .align(Alignment.CenterHorizontally),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f))
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = null,
                        modifier = Modifier.size(36.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                "Efectivo de cierre",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Ingresa el efectivo final para calcular la diferencia",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.6f),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )

            Spacer(modifier = Modifier.height(28.dp))

            OutlinedTextField(
                value = closingCash,
                onValueChange = { if (it.isEmpty() || it.all { c -> c.isDigit() }) closingCash = it },
                label = { Text("Monto", color = Color.White.copy(alpha = 0.7f)) },
                placeholder = { Text("0", color = Color.White.copy(alpha = 0.4f)) },
                leadingIcon = {
                    Icon(
                        Icons.Default.AttachMoney,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = Color.White.copy(alpha = 0.6f)
                    )
                },
                suffix = { Text("CLP", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.5f)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                modifier = Modifier.fillMaxWidth(),
                shape = Shape,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedContainerColor = CardDark,
                    unfocusedContainerColor = CardDark,
                    focusedBorderColor = MaterialTheme.colorScheme.error,
                    unfocusedBorderColor = BorderDark,
                    cursorColor = PrimaryGreen,
                    focusedLabelColor = MaterialTheme.colorScheme.error,
                    unfocusedLabelColor = Color.White.copy(alpha = 0.6f)
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = Shape,
                color = CardDark.copy(alpha = 0.8f),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Importante",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "• Verifica que no haya sesiones abiertas\n• Cuenta el efectivo con cuidado\n• Esta acción no se puede deshacer",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = {
                    focusManager.clearFocus()
                    viewModel.closeShift(closingCash.toDoubleOrNull() ?: 0.0, null)
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                shape = Shape,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                enabled = uiState !is ShiftUiState.Loading && closingCash.isNotBlank(),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
            ) {
                if (uiState is ShiftUiState.Loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Cerrar turno", style = MaterialTheme.typography.titleMedium)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text("Cancelar", color = Color.White.copy(alpha = 0.7f))
            }
        }
    }
}

@Composable
fun ShiftSummaryDialog(
    summary: com.inbyte.street.data.model.CloseShiftResponse,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CardDark,
        title = {
            Text(
                "Turno cerrado",
                fontWeight = FontWeight.SemiBold,
                color = PrimaryGreen
            )
        },
        text = {
            Column {
                Text(
                    "Resumen del turno",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(12.dp))
                SummaryRow("Duración", "${summary.summary.durationHours ?: "0"} h", color = Color.White)
                SummaryRow("Sesiones", "${summary.summary.totalSessions}", color = Color.White)
                SummaryRow("Efectivo inicial", com.inbyte.street.utils.CurrencyUtils.formatCLP(summary.summary.openingCash), color = Color.White)
                SummaryRow("Efectivo final", com.inbyte.street.utils.CurrencyUtils.formatCLP(summary.summary.closingCash), color = Color.White)
                SummaryRow("Ventas efectivo", com.inbyte.street.utils.CurrencyUtils.formatCLP(summary.summary.cashSales), color = Color.White)
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BorderDark)
                SummaryRow(
                    "Total ingresos",
                    com.inbyte.street.utils.CurrencyUtils.formatCLP(summary.summary.totalPayments),
                    bold = true,
                    color = PrimaryGreen
                )
                SummaryRow(
                    "Diferencia caja",
                    com.inbyte.street.utils.CurrencyUtils.formatCLP(summary.summary.difference),
                    bold = true,
                    color = if (summary.summary.difference >= 0) PrimaryGreen else MaterialTheme.colorScheme.error
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen)
            ) {
                Text("Entendido", color = BackgroundDarkGreen)
            }
        },
        shape = RoundedCornerShape(20.dp)
    )
}

@Composable
fun SummaryRow(
    label: String,
    value: String,
    bold: Boolean = false,
    color: Color = Color.White
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = if (bold) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium,
            fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
            color = color.copy(alpha = if (bold) 1f else 0.8f)
        )
        Text(
            text = value,
            style = if (bold) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium,
            fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
            color = color
        )
    }
    Spacer(modifier = Modifier.height(4.dp))
}
