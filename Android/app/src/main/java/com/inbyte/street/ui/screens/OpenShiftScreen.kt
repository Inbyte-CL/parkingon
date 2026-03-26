package com.inbyte.street.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.PlayArrow
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
fun OpenShiftScreen(
    viewModel: ShiftViewModel,
    onBack: () -> Unit,
    onShiftOpened: () -> Unit
) {
    var initialCash by remember { mutableStateOf("") }

    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is ShiftUiState.ShiftOpened -> {
                scope.launch {
                    snackbarHostState.showSnackbar("Turno abierto", duration = SnackbarDuration.Short)
                }
                onShiftOpened()
                viewModel.resetState()
            }
            is ShiftUiState.Error -> {
                scope.launch {
                    snackbarHostState.showSnackbar(state.message, duration = SnackbarDuration.Long)
                }
                viewModel.resetState()
            }
            else -> {}
        }
    }

    Scaffold(
        containerColor = BackgroundDarkGreen,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Abrir turno",
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
        },
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
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
        ) {
            Surface(
                modifier = Modifier
                    .size(64.dp)
                    .align(Alignment.CenterHorizontally),
                shape = RoundedCornerShape(16.dp),
                color = PrimaryGreen.copy(alpha = 0.15f),
                border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryGreen.copy(alpha = 0.3f))
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = null,
                        modifier = Modifier.size(36.dp),
                        tint = PrimaryGreen
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                "Efectivo inicial",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Con el que comienzas el turno",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.6f),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )

            Spacer(modifier = Modifier.height(28.dp))

            OutlinedTextField(
                value = initialCash,
                onValueChange = { if (it.isEmpty() || it.all { c -> c.isDigit() }) initialCash = it },
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
                    focusedBorderColor = PrimaryGreen,
                    unfocusedBorderColor = BorderDark,
                    cursorColor = PrimaryGreen,
                    focusedLabelColor = PrimaryGreen,
                    unfocusedLabelColor = Color.White.copy(alpha = 0.6f)
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = Shape,
                color = CardDark.copy(alpha = 0.8f),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Importante",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = PrimaryGreen
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "• Verifica el efectivo antes de iniciar\n• Solo puedes tener un turno abierto",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            Button(
                onClick = {
                    focusManager.clearFocus()
                    viewModel.openShift(initialCash.toDoubleOrNull() ?: 0.0, null)
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                shape = Shape,
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen),
                enabled = uiState !is ShiftUiState.Loading && initialCash.isNotBlank(),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
            ) {
                if (uiState is ShiftUiState.Loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = BackgroundDarkGreen,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Abrir turno", style = MaterialTheme.typography.titleMedium, color = BackgroundDarkGreen)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text("Cancelar", color = Color.White.copy(alpha = 0.7f))
            }
        }
    }
}
