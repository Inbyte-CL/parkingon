package com.inbyte.street.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.inbyte.street.R
import com.inbyte.street.ui.theme.PrimaryGreen

private val BrandDark = Color(0xFF11211A)
private val BrandCard = Color(0xFF1C2C25)
private val BrandBorder = Color(0xFF2A3B34)
private val GreenAlpha10 = PrimaryGreen.copy(alpha = 0.1f)
private val CardShape = RoundedCornerShape(20.dp)
private val QrShape = RoundedCornerShape(16.dp)

@Composable
fun SupportScreen(
    onBack: () -> Unit,
    currentRoute: String? = "support",
    onNavigateHome: () -> Unit = {},
    onNavigateAutos: () -> Unit = {},
    onNavigateSettings: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDark)
    ) {
        // ----- Header -----
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(BrandCard)
                .border(1.dp, BrandBorder)
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Surface(
                onClick = onBack,
                modifier = Modifier.size(40.dp),
                shape = CircleShape,
                color = Color.Transparent
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        Icons.Default.ArrowBack,
                        contentDescription = "Volver",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                androidx.compose.foundation.Image(
                    painter = painterResource(R.drawable.logo_parkingon),
                    contentDescription = null,
                    modifier = Modifier.size(28.dp)
                )
                Text(
                    "ParkingOn",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            Spacer(modifier = Modifier.size(40.dp))
        }

        // ----- Main content -----
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp)
                .padding(bottom = 72.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "¿Necesitas ayuda?",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "Escanea este código QR para contactar a nuestro equipo de soporte técnico.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(32.dp))

            // ----- QR card -----
            Surface(
                modifier = Modifier.fillMaxWidth(0.9f),
                shape = CardShape,
                color = BrandCard,
                border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(240.dp)
                            .clip(QrShape)
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(
                                        PrimaryGreen.copy(alpha = 0.15f),
                                        PrimaryGreen.copy(alpha = 0.03f)
                                    )
                                )
                            )
                            .border(1.dp, PrimaryGreen.copy(alpha = 0.3f), QrShape)
                            .padding(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.White)
                                .padding(12.dp)
                        ) {
                            androidx.compose.foundation.Image(
                                painter = painterResource(R.drawable.soporte_qr),
                                contentDescription = "Código QR de soporte",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Fit
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        "Contacto: +56 9 8583 0564",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.5f),
                        letterSpacing = 0.2.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = onBack,
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .heightIn(min = 52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen),
                shape = RoundedCornerShape(12.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
            ) {
                Text("Volver", fontWeight = FontWeight.Bold, color = BrandDark)
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

    // ----- Bottom nav -----
    AppBottomNav(
        modifier = Modifier.fillMaxWidth(),
        currentRoute = currentRoute,
        onNavigateHome = onNavigateHome,
        onNavigateAutos = onNavigateAutos,
        onNavigateSupport = { /* ya en Soporte */ },
        onNavigateSettings = onNavigateSettings,
        onLogout = onLogout
    )
    }
}
