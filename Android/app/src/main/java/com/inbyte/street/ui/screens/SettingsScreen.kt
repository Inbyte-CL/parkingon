package com.inbyte.street.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.inbyte.street.ui.theme.BackgroundDarkGreen
import com.inbyte.street.ui.theme.CardDark
import com.inbyte.street.ui.theme.PrimaryGreen
import com.inbyte.street.ui.theme.Slate800Ring
import com.inbyte.street.ui.viewmodel.ShiftViewModel
import com.inbyte.street.utils.ErrorLogger
import kotlinx.coroutines.launch

private val CardShape = RoundedCornerShape(16.dp)
private val GreenAlpha10 = PrimaryGreen.copy(alpha = 0.1f)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    currentTextScale: Float,
    onTextScaleChange: (Float) -> Unit,
    onBack: () -> Unit,
    currentRoute: String? = "settings",
    onNavigateHome: () -> Unit = {},
    onNavigateAutos: () -> Unit = {},
    onNavigateSupport: () -> Unit = {},
    onNavigateSettings: () -> Unit = {},
    onLogout: () -> Unit = {},
    shiftViewModel: ShiftViewModel? = null,
    onCloseShift: () -> Unit = {},
    onOpenErrorLog: () -> Unit = {}
) {
    val logCount by ErrorLogger.logs.collectAsState()
    val errorCount = logCount.count { it.level == ErrorLogger.Level.ERROR }
    var selectedScale by remember(currentTextScale) { mutableStateOf(currentTextScale) }
    var isUploading by remember { mutableStateOf(false) }
    var uploadResult by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = BackgroundDarkGreen,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Ajustes",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BackgroundDarkGreen)
            )
        },
        bottomBar = {
            AppBottomNav(
                currentRoute = currentRoute,
                onNavigateHome = onNavigateHome,
                onNavigateAutos = onNavigateAutos,
                onNavigateSupport = onNavigateSupport,
                onNavigateSettings = onNavigateSettings,
                onLogout = onLogout
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp)
        ) {
            // ── Tamaño del texto ───────────────────────────────────────
            Text(
                "Tamaño del texto",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Afecta a todos los textos de la aplicación para mejorar la legibilidad.",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.7f)
            )
            Spacer(modifier = Modifier.height(20.dp))

            SettingsOptionRow(
                title = "Normal",
                subtitle = "Tamaño estándar",
                selected = selectedScale <= 1f,
                onClick = { selectedScale = 1f; onTextScaleChange(1f) }
            )
            Spacer(modifier = Modifier.height(12.dp))
            SettingsOptionRow(
                title = "Grande",
                subtitle = "Texto un 75% más grande",
                selected = selectedScale > 1f,
                onClick = { selectedScale = 1.75f; onTextScaleChange(1.75f) }
            )

            Spacer(modifier = Modifier.height(32.dp))
            HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(24.dp))

            // ── Diagnóstico ────────────────────────────────────────────
            Text(
                "Diagnóstico",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Registros internos de la aplicación para identificar problemas.",
                style = MaterialTheme.typography.bodySmall,
                color = Color.White.copy(alpha = 0.7f)
            )
            Spacer(modifier = Modifier.height(16.dp))

            Surface(
                onClick = onOpenErrorLog,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = CardDark.copy(alpha = 0.6f),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (errorCount > 0) Color(0xFFFF6B6B).copy(alpha = 0.4f)
                    else Color.White.copy(alpha = 0.08f)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.BugReport,
                        contentDescription = null,
                        tint = if (errorCount > 0) Color(0xFFFF6B6B) else Color.White.copy(alpha = 0.5f),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Registro de errores",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            when {
                                logCount.isEmpty() -> "Sin registros"
                                uploadResult != null -> uploadResult!!
                                else -> "${logCount.size} entradas" +
                                    if (errorCount > 0) " · $errorCount error${if (errorCount != 1) "es" else ""}" else ""
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = when {
                                uploadResult?.startsWith("✓") == true -> PrimaryGreen.copy(alpha = 0.9f)
                                uploadResult?.startsWith("✗") == true -> Color(0xFFFF6B6B).copy(alpha = 0.8f)
                                errorCount > 0 -> Color(0xFFFF6B6B).copy(alpha = 0.8f)
                                else -> Color.White.copy(alpha = 0.5f)
                            }
                        )
                    }
                    // Botón subir logs a Supabase
                    IconButton(
                        onClick = {
                            if (isUploading || logCount.isEmpty()) return@IconButton
                            isUploading = true
                            uploadResult = null
                            scope.launch {
                                try {
                                    val (uploaded, _) = ErrorLogger.uploadToSupabase()
                                    uploadResult = "✓ $uploaded registros subidos"
                                } catch (e: Exception) {
                                    uploadResult = "✗ ${e.message?.take(60) ?: "Error de conexión"}"
                                    ErrorLogger.w("SettingsScreen", "uploadToSupabase failed: ${e.message}")
                                } finally {
                                    isUploading = false
                                }
                            }
                        },
                        modifier = Modifier.size(40.dp),
                        enabled = !isUploading && logCount.isNotEmpty()
                    ) {
                        if (isUploading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = PrimaryGreen
                            )
                        } else {
                            Icon(
                                Icons.Default.CloudUpload,
                                contentDescription = "Subir logs",
                                tint = if (logCount.isNotEmpty()) PrimaryGreen
                                       else Color.White.copy(alpha = 0.2f),
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.3f),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsOptionRow(
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        color = if (selected) GreenAlpha10 else Slate800Ring.copy(alpha = 0.5f),
        border = androidx.compose.foundation.BorderStroke(
            if (selected) 2.dp else 1.dp,
            if (selected) PrimaryGreen else Color.White.copy(alpha = 0.08f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.6f)
                )
            }
            if (selected) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    tint = PrimaryGreen,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
