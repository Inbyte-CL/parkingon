package com.inbyte.street.ui.screens

import android.util.Log
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.inbyte.street.data.model.SessionWithDuration
import com.inbyte.street.data.model.ParkingOccupancy
import com.inbyte.street.ui.theme.*
import com.inbyte.street.utils.formatPlateForDisplay
import com.inbyte.street.ui.viewmodel.SessionUiState
import com.inbyte.street.ui.viewmodel.SessionViewModel
import com.inbyte.street.ui.viewmodel.ShiftViewModel
import com.inbyte.street.utils.CurrencyUtils
import com.inbyte.street.utils.computeSessionAmount
import com.inbyte.street.utils.DateUtils

private val CardShape = RoundedCornerShape(16.dp)
private val SearchShape = RoundedCornerShape(12.dp)
private val GreenAlpha10 = PrimaryGreen.copy(alpha = 0.1f)
private val GreenAlpha20 = PrimaryGreen.copy(alpha = 0.2f)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveSessionsScreen(
    viewModel: SessionViewModel,
    onBack: () -> Unit,
    onProcessExit: (String) -> Unit = {},
    onNewEntry: () -> Unit = {},
    currentRoute: String? = "active_sessions",
    onNavigateHome: () -> Unit = {},
    onNavigateAutos: () -> Unit = {},
    onNavigateSupport: () -> Unit = {},
    onNavigateSettings: () -> Unit = {},
    onLogout: () -> Unit = {},
    shiftViewModel: ShiftViewModel? = null,
    onCloseShift: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var sessionsData by remember { mutableStateOf<Pair<List<SessionWithDuration>, ParkingOccupancy>?>(null) }
    var pricePerMinute by remember { mutableStateOf(0.0) }
    var maxDailyAmount by remember { mutableStateOf<Double?>(null) }
    var pricingMode by remember { mutableStateOf("per_minute") }
    var segmentAmount by remember { mutableStateOf<Double?>(null) }
    var segmentMinutes by remember { mutableStateOf<Int?>(null) }
    var refreshCounter by remember { mutableStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { refreshCounter++ }
    LaunchedEffect(refreshCounter) {
        if (refreshCounter > 0) {
            Log.d("ActiveSessionsScreen", "Cargando sesiones (refreshCounter=$refreshCounter)")
            viewModel.getActiveSessions()
        }
    }
    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is SessionUiState.ActiveSessionsLoaded -> {
                sessionsData = Pair(state.response.sessions, state.response.occupancy)
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

    val sessions = sessionsData?.first?.filter { session ->
        searchQuery.isBlank() || session.plate.contains(searchQuery, ignoreCase = true) ||
            (session.sessionCode?.contains(searchQuery, ignoreCase = true) == true)
    } ?: emptyList()
    val occupancy = sessionsData?.second

    Scaffold(
        containerColor = BackgroundDarkGreen,
        bottomBar = {
            AppBottomNav(
                currentRoute = currentRoute,
                onNavigateHome = onNavigateHome,
                onNavigateAutos = onNavigateAutos,
                onNavigateSupport = onNavigateSupport,
                onNavigateSettings = onNavigateSettings,
                onLogout = {
                    onLogout()
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            Column(modifier = Modifier.fillMaxSize()) {
                // ----- Header (sticky style) -----
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BackgroundDarkGreen.copy(alpha = 0.95f))
                        .padding(horizontal = 24.dp, vertical = 48.dp)
                        .padding(top = 24.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "Vehículos estacionados",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Text(
                            "MONITOREO EN VIVO",
                            style = MaterialTheme.typography.labelSmall,
                            color = PrimaryGreen,
                            fontWeight = FontWeight.Medium,
                            letterSpacing = 2.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    Row {
                        IconButton(
                            onClick = { viewModel.getActiveSessions() },
                            enabled = uiState !is SessionUiState.Loading
                        ) {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Actualizar",
                                tint = PrimaryGreen
                            )
                        }
                        IconButton(onClick = onBack) {
                            Icon(
                                Icons.Default.ArrowBack,
                                contentDescription = "Volver",
                                tint = Color.White
                            )
                        }
                    }
                }

                // ----- Search & Filter -----
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                        .padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Surface(
                        modifier = Modifier.weight(1f),
                        shape = SearchShape,
                        color = CardDark.copy(alpha = 0.5f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.Transparent)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = Color.White.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                textStyle = MaterialTheme.typography.bodyMedium.copy(
                                    color = Color.White,
                                    fontSize = 14.sp
                                ),
                                cursorBrush = SolidColor(PrimaryGreen),
                                decorationBox = { inner ->
                                    if (searchQuery.isEmpty()) {
                                        Text(
                                            "Buscar patente o ticket...",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Color.White.copy(alpha = 0.4f),
                                            fontSize = 14.sp
                                        )
                                    }
                                    inner()
                                }
                            )
                        }
                    }
                    Surface(
                        modifier = Modifier.size(44.dp),
                        shape = SearchShape,
                        color = GreenAlpha10,
                        border = androidx.compose.foundation.BorderStroke(1.dp, GreenAlpha20)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Tune,
                                contentDescription = "Filtros",
                                tint = PrimaryGreen,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }

                // ----- Content -----
                if (uiState is SessionUiState.Loading && sessionsData == null) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = PrimaryGreen)
                    }
                } else if (uiState is SessionUiState.Error) {
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        shape = CardShape,
                        color = MaterialTheme.colorScheme.errorContainer
                    ) {
                        Text(
                            (uiState as SessionUiState.Error).message,
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 24.dp, top = 8.dp, end = 24.dp, bottom = 100.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        occupancy?.let { occ ->
                            item {
                                OccupancySummaryCard(occupancy = occ)
                                Spacer(modifier = Modifier.height(24.dp))
                            }
                        }
                        if (sessions.isEmpty()) {
                            item {
                                EmptySessionsMessage()
                            }
                        } else {
                            items(sessions) { session ->
                                VehicleCard(
                                    session = session,
                                    pricePerMinute = pricePerMinute,
                                    maxDailyAmount = maxDailyAmount,
                                    pricingMode = pricingMode,
                                    segmentAmount = segmentAmount,
                                    segmentMinutes = segmentMinutes,
                                    onTap = { onProcessExit(session.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OccupancySummaryCard(occupancy: ParkingOccupancy) {
    val pct = (occupancy.occupancyPercentage / 100.0).coerceIn(0.0, 1.0).toFloat()
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = GreenAlpha10,
        border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryGreen.copy(alpha = 0.2f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text(
                        "OCUPACIÓN ACTUAL",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.6f),
                        letterSpacing = 0.5.sp
                    )
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            "${occupancy.occupiedSpaces}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            " / ${occupancy.totalSpaces}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.6f),
                            modifier = Modifier.padding(start = 4.dp, bottom = 2.dp)
                        )
                    }
                }
                Text(
                    "${String.format("%.1f", occupancy.occupancyPercentage)}% lleno",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = PrimaryGreen
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(Slate800Ring)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fraction = pct)
                        .clip(RoundedCornerShape(3.dp))
                        .background(PrimaryGreen)
                )
            }
        }
    }
}

@Composable
private fun VehicleCard(
    session: SessionWithDuration,
    pricePerMinute: Double,
    maxDailyAmount: Double? = null,
    pricingMode: String = "per_minute",
    segmentAmount: Double? = null,
    segmentMinutes: Int? = null,
    onTap: () -> Unit
) {
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

    val durationText = if (currentDuration < 60) {
        "${currentDuration}m"
    } else {
        "${currentDuration / 60}h ${currentDuration % 60}m"
    }

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onTap),
        shape = CardShape,
        color = CardDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderDark)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Slate800Ring,
                    border = androidx.compose.foundation.BorderStroke(4.dp, PrimaryGreen)
                ) {
                    Text(
                        formatPlateForDisplay(session.plate),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "HORA ENTRADA",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.5f),
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        DateUtils.formatEntryDisplay(session.entryTime),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                }
            }
            HorizontalDivider(
                modifier = Modifier.padding(top = 16.dp),
                color = BorderDark,
                thickness = 1.dp
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(GreenAlpha10),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = PrimaryGreen
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "DURACIÓN",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White.copy(alpha = 0.5f),
                            letterSpacing = 0.5.sp
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                durationText,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(PrimaryGreen)
                                    .alpha(pulseAlpha)
                            )
                        }
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "MONTO A PAGAR",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.5f),
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        CurrencyUtils.formatCLP(currentAmount),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold,
                        color = PrimaryGreen
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptySessionsMessage() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.DirectionsCar,
            contentDescription = null,
            modifier = Modifier.size(56.dp),
            tint = Color.White.copy(alpha = 0.3f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "No hay vehículos estacionados",
            style = MaterialTheme.typography.titleSmall,
            color = Color.White.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )
    }
}
