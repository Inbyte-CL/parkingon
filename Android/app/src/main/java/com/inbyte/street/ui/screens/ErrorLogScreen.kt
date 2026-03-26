package com.inbyte.street.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.inbyte.street.ui.theme.BackgroundDarkGreen
import com.inbyte.street.ui.theme.CardDark
import com.inbyte.street.ui.theme.PrimaryGreen
import com.inbyte.street.utils.ErrorLogger

private val ColorError   = Color(0xFFFF6B6B)
private val ColorWarning = Color(0xFFFFB347)
private val ColorInfo    = Color(0xFF64B5F6)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ErrorLogScreen(onBack: () -> Unit) {
    val allLogs by ErrorLogger.logs.collectAsState()
    var selectedLevel by remember { mutableStateOf<ErrorLogger.Level?>(null) }
    var showClearConfirm by remember { mutableStateOf(false) }
    var expandedEntry by remember { mutableStateOf<ErrorLogger.LogEntry?>(null) }

    val filtered = remember(allLogs, selectedLevel) {
        if (selectedLevel == null) allLogs else allLogs.filter { it.level == selectedLevel }
    }

    if (showClearConfirm) {
        AlertDialog(
            onDismissRequest = { showClearConfirm = false },
            containerColor = CardDark,
            title = { Text("Borrar registros", color = Color.White, fontWeight = FontWeight.Bold) },
            text = { Text("¿Borrar todos los registros de errores?", color = Color.White.copy(alpha = 0.8f)) },
            confirmButton = {
                Button(
                    onClick = { ErrorLogger.clear(); showClearConfirm = false },
                    colors = ButtonDefaults.buttonColors(containerColor = ColorError)
                ) { Text("Borrar todo", fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showClearConfirm = false },
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                ) { Text("Cancelar") }
            },
            shape = RoundedCornerShape(16.dp)
        )
    }

    val expanded = expandedEntry
    if (expanded != null) {
        Dialog(
            onDismissRequest = { expandedEntry = null },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.96f)
                    .wrapContentHeight(),
                shape = RoundedCornerShape(16.dp),
                color = CardDark
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        LevelBadge(expanded.level)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            expanded.formattedTime,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.5f)
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        expanded.source,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryGreen
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = BackgroundDarkGreen.copy(alpha = 0.8f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 320.dp)
                    ) {
                        androidx.compose.foundation.rememberScrollState().let { scrollState ->
                            Box(
                                modifier = Modifier
                                    .padding(12.dp)
                                    .fillMaxWidth()
                                    .verticalScroll(scrollState)
                            ) {
                                Text(
                                    expanded.message,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 11.sp
                                    ),
                                    color = Color.White.copy(alpha = 0.9f)
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Button(
                        onClick = { expandedEntry = null },
                        modifier = Modifier.align(Alignment.End),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen)
                    ) {
                        Text("Cerrar", color = BackgroundDarkGreen, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    Scaffold(
        containerColor = BackgroundDarkGreen,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Registro de errores",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            "${filtered.size} entradas",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.5f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            ErrorLogger.e("TestError", "Error de prueba generado manualmente a las ${java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())}")
                            ErrorLogger.w("TestWarning", "Aviso de prueba: conexión lenta simulada")
                            ErrorLogger.i("TestInfo", "Log informativo de prueba")
                        }
                    ) {
                        Icon(
                            Icons.Default.BugReport,
                            contentDescription = "Generar errores de prueba",
                            tint = ColorWarning
                        )
                    }
                    IconButton(onClick = { showClearConfirm = true }, enabled = allLogs.isNotEmpty()) {
                        Icon(
                            Icons.Default.DeleteSweep,
                            contentDescription = "Borrar todo",
                            tint = if (allLogs.isNotEmpty()) ColorError else Color.White.copy(alpha = 0.3f)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BackgroundDarkGreen)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Filtros de nivel
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                LevelFilterChip(
                    label = "Todo",
                    count = allLogs.size,
                    selected = selectedLevel == null,
                    color = Color.White,
                    onClick = { selectedLevel = null }
                )
                LevelFilterChip(
                    label = "Error",
                    count = allLogs.count { it.level == ErrorLogger.Level.ERROR },
                    selected = selectedLevel == ErrorLogger.Level.ERROR,
                    color = ColorError,
                    onClick = { selectedLevel = ErrorLogger.Level.ERROR }
                )
                LevelFilterChip(
                    label = "Aviso",
                    count = allLogs.count { it.level == ErrorLogger.Level.WARNING },
                    selected = selectedLevel == ErrorLogger.Level.WARNING,
                    color = ColorWarning,
                    onClick = { selectedLevel = ErrorLogger.Level.WARNING }
                )
                LevelFilterChip(
                    label = "Info",
                    count = allLogs.count { it.level == ErrorLogger.Level.INFO },
                    selected = selectedLevel == ErrorLogger.Level.INFO,
                    color = ColorInfo,
                    onClick = { selectedLevel = ErrorLogger.Level.INFO }
                )
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.07f))

            if (filtered.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = PrimaryGreen.copy(alpha = 0.4f)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "Sin registros",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.4f)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(filtered, key = { "${it.timestamp}_${it.source}" }) { entry ->
                        LogEntryCard(entry = entry, onClick = { expandedEntry = entry })
                    }
                }
            }
        }
    }
}

@Composable
private fun LogEntryCard(entry: ErrorLogger.LogEntry, onClick: () -> Unit) {
    val levelColor = when (entry.level) {
        ErrorLogger.Level.ERROR   -> ColorError
        ErrorLogger.Level.WARNING -> ColorWarning
        ErrorLogger.Level.INFO    -> ColorInfo
    }
    Surface(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, levelColor.copy(alpha = 0.25f), RoundedCornerShape(10.dp)),
        shape = RoundedCornerShape(10.dp),
        color = CardDark.copy(alpha = 0.7f)
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LevelBadge(entry.level)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        entry.source,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryGreen
                    )
                }
                Text(
                    entry.formattedTime,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 10.sp
                )
            }
            Spacer(modifier = Modifier.height(5.dp))
            Text(
                entry.message,
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                color = Color.White.copy(alpha = 0.8f),
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            if (entry.message.length > 120) {
                Text(
                    "Toca para ver completo",
                    style = MaterialTheme.typography.labelSmall,
                    color = levelColor.copy(alpha = 0.7f),
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}

@Composable
private fun LevelBadge(level: ErrorLogger.Level) {
    val (label, color) = when (level) {
        ErrorLogger.Level.ERROR   -> "ERR" to ColorError
        ErrorLogger.Level.WARNING -> "AVS" to ColorWarning
        ErrorLogger.Level.INFO    -> "INF" to ColorInfo
    }
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = color.copy(alpha = 0.18f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = color,
            fontSize = 9.sp
        )
    }
}

@Composable
private fun LevelFilterChip(
    label: String,
    count: Int,
    selected: Boolean,
    color: Color,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (selected) color.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.06f),
        border = androidx.compose.foundation.BorderStroke(
            if (selected) 1.5.dp else 1.dp,
            if (selected) color else Color.White.copy(alpha = 0.12f)
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                color = if (selected) color else Color.White.copy(alpha = 0.6f)
            )
            if (count > 0) {
                Surface(shape = RoundedCornerShape(10.dp), color = color.copy(alpha = 0.3f)) {
                    Text(
                        "$count",
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = color,
                        fontSize = 9.sp
                    )
                }
            }
        }
    }
}
