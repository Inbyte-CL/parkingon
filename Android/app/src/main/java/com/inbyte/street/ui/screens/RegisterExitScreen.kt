package com.inbyte.street.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.inbyte.street.data.model.SessionWithDuration
import com.inbyte.street.ui.theme.*
import com.inbyte.street.ui.viewmodel.SessionUiState
import com.inbyte.street.ui.viewmodel.SessionViewModel
import com.inbyte.street.utils.DateUtils
import com.inbyte.street.utils.filterPlateInput
import com.inbyte.street.utils.normalizePlate
import com.inbyte.street.utils.PlateVisualTransformation
import com.inbyte.street.utils.formatPlateForDisplay
import com.inbyte.street.utils.computeSessionAmount

private val Shape = RoundedCornerShape(12.dp)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterExitScreen(
    viewModel: SessionViewModel,
    onBack: () -> Unit,
    onExitRegistered: () -> Unit,
    onProcessExit: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    var searchPlate by remember { mutableStateOf("") }
    var sessions by remember { mutableStateOf<List<SessionWithDuration>>(emptyList()) }
    var filteredSessions by remember { mutableStateOf<List<SessionWithDuration>>(emptyList()) }
    var pricePerMinute by remember { mutableStateOf(0.0) }
    var maxDailyAmount by remember { mutableStateOf<Double?>(null) }
    var pricingMode by remember { mutableStateOf("per_minute") }
    var segmentAmount by remember { mutableStateOf<Double?>(null) }
    var segmentMinutes by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) { viewModel.getActiveSessions() }
    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is SessionUiState.ActiveSessionsLoaded -> {
                sessions = state.response.sessions
                filteredSessions = sessions
                pricePerMinute = state.response.pricePerMinute ?: 0.0
                maxDailyAmount = state.response.maxDailyAmount
                pricingMode = state.response.pricingMode ?: "per_minute"
                segmentAmount = state.response.segmentAmount
                segmentMinutes = state.response.segmentMinutes
            }
            is SessionUiState.SessionClosed -> {
                viewModel.resetState()
                viewModel.getActiveSessions()
            }
            else -> {}
        }
    }
    LaunchedEffect(searchPlate, sessions) {
        val query = searchPlate
        filteredSessions = if (query.isBlank()) sessions
        else sessions.filter { it.plate.contains(query, ignoreCase = true) }
    }

    Scaffold(
        containerColor = BackgroundDarkGreen,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Registrar salida",
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
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = Shape,
                color = CardDark,
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Buscar por placa",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = searchPlate,
                        onValueChange = { searchPlate = filterPlateInput(it) },
                        label = { Text("Placa", color = Color.White.copy(alpha = 0.7f)) },
                        placeholder = { Text("XXXX-XX", color = Color.White.copy(alpha = 0.4f)) },
                        visualTransformation = PlateVisualTransformation,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        leadingIcon = {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = Color.White.copy(alpha = 0.6f)
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        enabled = uiState !is SessionUiState.Loading,
                        shape = RoundedCornerShape(8.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedContainerColor = BackgroundDarkGreen,
                            unfocusedContainerColor = BackgroundDarkGreen,
                            focusedBorderColor = PrimaryGreen,
                            unfocusedBorderColor = BorderDark,
                            cursorColor = PrimaryGreen,
                            focusedLabelColor = PrimaryGreen,
                            unfocusedLabelColor = Color.White.copy(alpha = 0.6f),
                            focusedLeadingIconColor = PrimaryGreen,
                            unfocusedLeadingIconColor = Color.White.copy(alpha = 0.5f)
                        )
                    )
                }
            }

            Text(
                text = if (searchPlate.isBlank()) "Vehículos (${sessions.size})" else "Resultados (${filteredSessions.size})",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = Color.White.copy(alpha = 0.6f),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )

            if (uiState is SessionUiState.Loading && sessions.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PrimaryGreen)
                }
            } else if (filteredSessions.isEmpty()) {
                EmptySearchMessage(searchPlate)
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredSessions) { session ->
                        ExitSessionCard(
                            session = session,
                            pricePerMinute = pricePerMinute,
                            maxDailyAmount = maxDailyAmount,
                            pricingMode = pricingMode,
                            segmentAmount = segmentAmount,
                            segmentMinutes = segmentMinutes,
                            onSelectSession = { onProcessExit(session.id) }
                        )
                    }
                }
            }

            if (uiState is SessionUiState.Error) {
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
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
        }
    }
}

@Composable
fun ExitSessionCard(
    session: SessionWithDuration,
    pricePerMinute: Double,
    maxDailyAmount: Double? = null,
    pricingMode: String = "per_minute",
    segmentAmount: Double? = null,
    segmentMinutes: Int? = null,
    onSelectSession: () -> Unit
) {
    val entryDate = DateUtils.formatDate(session.entryTime)
    val entryTime = DateUtils.formatTime(session.entryTime)
    var currentAmount by remember { mutableStateOf(0.0) }
    var currentDuration by remember { mutableStateOf(session.durationMinutes) }

    LaunchedEffect(session.id, pricePerMinute, maxDailyAmount, pricingMode, segmentAmount, segmentMinutes) {
        while (true) {
            val entryTimeMillis = java.time.ZonedDateTime.parse(session.entryTime).toInstant().toEpochMilli()
            val durationMinutes = ((System.currentTimeMillis() - entryTimeMillis) / (1000 * 60)).toInt()
            currentDuration = durationMinutes
            currentAmount = computeSessionAmount(
                durationMinutes, pricePerMinute, maxDailyAmount, pricingMode, segmentAmount, segmentMinutes
            )
            kotlinx.coroutines.delay(10000)
        }
    }

    val durationText = if (currentDuration < 60) "$currentDuration min" else "${currentDuration / 60}h ${currentDuration % 60}m"

    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onSelectSession),
        shape = Shape,
        color = CardDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(PrimaryGreen.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.DirectionsCar,
                        contentDescription = null,
                        tint = PrimaryGreen,
                        modifier = Modifier.size(26.dp)
                    )
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column {
                    Text(
                        formatPlateForDisplay(session.plate),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                    Text(
                        "$entryDate · $entryTime",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.6f)
                    )
                    Text(
                        "$durationText · ${com.inbyte.street.utils.CurrencyUtils.formatCLP(currentAmount)}",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = PrimaryGreen
                    )
                }
            }
            Icon(
                Icons.Default.ExitToApp,
                contentDescription = "Registrar salida",
                tint = PrimaryGreen,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

@Composable
fun EmptySearchMessage(searchPlate: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                modifier = Modifier.size(56.dp),
                tint = Color.White.copy(alpha = 0.3f)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = if (searchPlate.isBlank()) "No hay vehículos estacionados" else "No se encontró \"$searchPlate\"",
                style = MaterialTheme.typography.titleSmall,
                color = Color.White.copy(alpha = 0.6f)
            )
        }
    }
}
