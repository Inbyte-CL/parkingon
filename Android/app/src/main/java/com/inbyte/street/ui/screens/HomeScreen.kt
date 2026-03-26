package com.inbyte.street.ui.screens

import android.util.Log
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.inbyte.street.R
import androidx.navigation.compose.currentBackStackEntryAsState
import com.inbyte.street.ui.theme.BackgroundDarkGreen
import com.inbyte.street.ui.theme.PrimaryGreen
import com.inbyte.street.ui.theme.Slate800Ring
import com.inbyte.street.ui.viewmodel.ShiftViewModel
import com.inbyte.street.ui.viewmodel.HomeViewModel
import com.inbyte.street.utils.CurrencyUtils
import com.inbyte.street.utils.formatTariffLabel
import java.text.SimpleDateFormat
import java.util.Locale

private val CardShape = RoundedCornerShape(16.dp)
private val ButtonShape = RoundedCornerShape(12.dp)
private val GreenAlpha10 = PrimaryGreen.copy(alpha = 0.1f)
private val GreenAlpha20 = PrimaryGreen.copy(alpha = 0.2f)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onLogout: () -> Unit,
    onOpenShift: () -> Unit = {},
    onCloseShift: () -> Unit = {},
    onCreateSession: () -> Unit = {},
    onRegisterExit: () -> Unit = {},
    onViewActiveSessions: () -> Unit = {},
    onOpenSupport: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    shiftViewModel: ShiftViewModel? = null,
    homeViewModel: HomeViewModel? = null,
    navController: NavHostController? = null,
    currentRoute: String? = null,
    textScale: Float = 1f
) {
    val hasActiveShift = (shiftViewModel?.hasActiveShift?.collectAsState()?.value) ?: false
    val lastSyncTime = shiftViewModel?.lastSyncTime?.collectAsState()?.value
    val userInfo = homeViewModel?.userInfo?.collectAsState()?.value
    val occupancy = homeViewModel?.occupancy?.collectAsState()?.value

    var refreshCounter by remember { mutableStateOf(0) }
    val currentBackStackEntry by navController?.currentBackStackEntryAsState() ?: remember { mutableStateOf(null) }
    val currentRoute = currentBackStackEntry?.destination?.route

    LaunchedEffect(currentRoute) {
        if (currentRoute == "home") refreshCounter++
    }
    LaunchedEffect(refreshCounter) {
        if (currentRoute == "home" && refreshCounter > 0) shiftViewModel?.refreshShiftStatus()
    }
    LaunchedEffect(refreshCounter) {
        if (refreshCounter > 0) homeViewModel?.loadOccupancy()
    }
    LaunchedEffect(Unit) {
        homeViewModel?.loadOccupancy()
    }

    Scaffold(
        containerColor = BackgroundDarkGreen
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 8.dp)
                    .padding(top = 24.dp, bottom = 120.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // ----- Header -----
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            androidx.compose.foundation.Image(
                                painter = painterResource(R.drawable.logo_parkingon),
                                contentDescription = null,
                                modifier = Modifier.size(40.dp),
                                contentScale = ContentScale.Fit
                            )
                            Text(
                                "ParkingOn",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = PrimaryGreen,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            userInfo?.parkingName ?: "—",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Row(
                            modifier = Modifier.padding(top = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Op: ${userInfo?.displayName ?: "—"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .size(4.dp)
                                    .clip(CircleShape)
                                    .background(PrimaryGreen.copy(alpha = 0.4f))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(9999.dp),
                                color = GreenAlpha10,
                                border = androidx.compose.foundation.BorderStroke(1.dp, GreenAlpha20)
                            ) {
                                Text(
                                    if (hasActiveShift) "Activo" else "Sin turno",
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = PrimaryGreen,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                    if (textScale <= 1f) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = GreenAlpha10,
                            border = androidx.compose.foundation.BorderStroke(1.dp, GreenAlpha20)
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                horizontalAlignment = Alignment.End
                            ) {
                                Text(
                                    "TARIFA ACTUAL",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = PrimaryGreen.copy(alpha = 0.8f),
                                    letterSpacing = 0.5.sp
                                )
                                Text(
                                    if (userInfo != null && (userInfo.pricePerMinute != null || (userInfo.pricingMode == "per_segment" && userInfo.segmentAmount != null)))
                                        formatTariffLabel(
                                            userInfo.pricePerMinute ?: 0.0,
                                            userInfo.pricingMode,
                                            userInfo.segmentAmount,
                                            userInfo.segmentMinutes
                                        )
                                    else "—",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                if (userInfo?.maxDailyAmount != null) {
                                    Text(
                                        "Tope máx. ${CurrencyUtils.formatCLP(userInfo.maxDailyAmount)}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White.copy(alpha = 0.8f)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // ----- Gauge de ocupación -----
                val occupied = occupancy?.occupiedSpaces ?: 0
                val total = occupancy?.totalSpaces ?: 1
                val pct = occupancy?.occupancyPercentage ?: 0.0

                OccupancyGauge(
                    occupied = occupied,
                    total = total,
                    percentage = pct
                )

                Spacer(modifier = Modifier.height(24.dp))

                // ----- Turno activo / Abrir turno -----
                if (hasActiveShift) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Button(
                            onClick = onCreateSession,
                            modifier = Modifier.weight(1f).heightIn(min = 100.dp),
                            shape = ButtonShape,
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                            contentPadding = PaddingValues(12.dp)
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(BackgroundDarkGreen.copy(alpha = 0.2f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Login,
                                        contentDescription = null,
                                        modifier = Modifier.size(28.dp),
                                        tint = BackgroundDarkGreen
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "Entrada",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = BackgroundDarkGreen
                                )
                                Text(
                                    "REGISTRAR VEHÍCULO",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = BackgroundDarkGreen.copy(alpha = 0.7f),
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                        Button(
                            onClick = onRegisterExit,
                            modifier = Modifier.weight(1f).heightIn(min = 100.dp),
                            shape = ButtonShape,
                            colors = ButtonDefaults.buttonColors(containerColor = Slate800Ring),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                            contentPadding = PaddingValues(12.dp)
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(GreenAlpha10),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Logout,
                                        contentDescription = null,
                                        modifier = Modifier.size(28.dp),
                                        tint = PrimaryGreen
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "Salida",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    "PROCESAR PAGO",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White.copy(alpha = 0.6f),
                                    letterSpacing = 0.5.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // ----- Cards de navegación -----
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onViewActiveSessions),
                        shape = CardShape,
                        color = Slate800Ring.copy(alpha = 0.5f),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            Color.White.copy(alpha = 0.08f)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(GreenAlpha10),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.DirectionsCar,
                                        contentDescription = null,
                                        tint = PrimaryGreen,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column(modifier = Modifier.weight(1f, fill = false)) {
                                    Text(
                                        "Ver vehículos estacionados",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        maxLines = 2
                                    )
                                    Text(
                                        "Gestionar $occupied sesiones activas",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.White.copy(alpha = 0.5f),
                                        maxLines = 2
                                    )
                                }
                            }
                            Icon(
                                Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.4f),
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = onCloseShift,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        shape = ButtonShape,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            MaterialTheme.colorScheme.error.copy(alpha = 0.5f)
                        )
                    ) {
                        Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Cerrar turno", style = MaterialTheme.typography.titleSmall)
                    }
                } else {
                    Button(
                        onClick = onOpenShift,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
                        shape = ButtonShape,
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Abrir turno", style = MaterialTheme.typography.titleMedium)
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = Slate800Ring.copy(alpha = 0.5f)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Info,
                                contentDescription = null,
                                modifier = Modifier.size(24.dp),
                                tint = PrimaryGreen
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                "Abre un turno para registrar entradas y procesar pagos.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    }
                }
            }

            // ----- Bottom nav: Inicio, Autos, Ajustes, Salir (4 ítems simétricos) -----
            AppBottomNav(
                modifier = Modifier.align(Alignment.BottomCenter),
                currentRoute = currentRoute,
                onNavigateHome = { /* ya en Home */ },
                onNavigateAutos = onViewActiveSessions,
                onNavigateSupport = onOpenSupport,
                onNavigateSettings = onOpenSettings,
                onLogout = onLogout
            )
        }
    }
}

@Composable
private fun OccupancyGauge(
    occupied: Int,
    total: Int,
    percentage: Double
) {
    val strokeWidth = 18.dp
    val size = 200.dp
    val sweepDegrees = (percentage / 100.0 * 360.0).toFloat().coerceIn(0f, 360f)

    Box(
        modifier = Modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokePx = strokeWidth.toPx()
            val radius = (size.toPx() - strokePx) / 2f
            // Fondo (gris)
            drawArc(
                color = Slate800Ring,
                startAngle = 90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = Offset(strokePx / 2f, strokePx / 2f),
                size = androidx.compose.ui.geometry.Size(radius * 2f, radius * 2f),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = strokePx, cap = StrokeCap.Round)
            )
            // Progreso (verde)
            if (sweepDegrees > 0f) {
                drawArc(
                    color = PrimaryGreen,
                    startAngle = 90f,
                    sweepAngle = -sweepDegrees,
                    useCenter = false,
                    topLeft = Offset(strokePx / 2f, strokePx / 2f),
                    size = androidx.compose.ui.geometry.Size(radius * 2f, radius * 2f),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = strokePx, cap = StrokeCap.Round)
                )
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "Ocupadas",
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.7f),
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "$occupied / $total",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                "plazas totales",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White.copy(alpha = 0.5f),
                letterSpacing = 0.5.sp
            )
        }
        Surface(
            modifier = Modifier.align(Alignment.BottomCenter).offset(y = 6.dp),
            shape = RoundedCornerShape(9999.dp),
            color = Slate800Ring,
            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
        ) {
            Text(
                "${String.format("%.0f", percentage)}% CAPACIDAD",
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = PrimaryGreen
            )
        }
    }
}

/** Barra inferior compartida: Inicio, Autos, Soporte, Ajustes, Salir. */
@Composable
fun AppBottomNav(
    modifier: Modifier = Modifier,
    currentRoute: String?,
    onNavigateHome: () -> Unit,
    onNavigateAutos: () -> Unit,
    onNavigateSupport: () -> Unit,
    onNavigateSettings: () -> Unit,
    onLogout: () -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = BackgroundDarkGreen.copy(alpha = 0.9f),
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp)
                .padding(horizontal = 4.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            NavItem(modifier = Modifier.weight(1f), icon = Icons.Default.Home, label = "Inicio", selected = currentRoute == "home", onClick = onNavigateHome)
            NavItem(modifier = Modifier.weight(1f), icon = Icons.Default.DirectionsCar, label = "Autos", selected = currentRoute == "active_sessions", onClick = onNavigateAutos)
            NavItem(modifier = Modifier.weight(1f), icon = Icons.Filled.QrCode2, label = "Soporte", selected = currentRoute == "support", onClick = onNavigateSupport)
            NavItem(modifier = Modifier.weight(1f), icon = Icons.Default.Settings, label = "Ajustes", selected = currentRoute == "settings", onClick = onNavigateSettings)
            NavItem(modifier = Modifier.weight(1f), icon = Icons.Default.Logout, label = "Salir", selected = false, onClick = onLogout)
        }
    }
}

@Composable
private fun NavItem(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: (() -> Unit)? = null
) {
    val clickModifier = if (onClick != null) {
        Modifier.padding(4.dp).clickable(onClick = onClick)
    } else {
        Modifier.padding(4.dp)
    }
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.then(clickModifier)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (selected) PrimaryGreen else Color.White.copy(alpha = 0.4f),
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = if (selected) PrimaryGreen else Color.White.copy(alpha = 0.4f)
        )
    }
}
