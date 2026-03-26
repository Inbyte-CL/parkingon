package com.inbyte.street.ui.theme

import androidx.compose.ui.graphics.Color

// Primary: Indigo (saturado para exterior)
val Indigo50 = Color(0xFFEEF2FF)
val Indigo100 = Color(0xFFE0E7FF)
val Indigo500 = Color(0xFF6366F1)
val Indigo600 = Color(0xFF4F46E5)
val Indigo700 = Color(0xFF4338CA)
val Indigo800 = Color(0xFF3730A3)
val Indigo900 = Color(0xFF312E81)

// Secondary / Teal (saturado para exterior)
val Teal50 = Color(0xFFF0FDFA)
val Teal200 = Color(0xFF99F6E4)
val Teal500 = Color(0xFF14B8A6)
val Teal600 = Color(0xFF0D9488)
val Teal700 = Color(0xFF0F766E)
val Teal800 = Color(0xFF115E59)

// Neutral
val Slate50 = Color(0xFFF8FAFC)
val Slate100 = Color(0xFFF1F5F9)
val Slate200 = Color(0xFFE2E8F0)
val Slate300 = Color(0xFFCBD5E1)
val Slate400 = Color(0xFF94A3B8)
val Slate500 = Color(0xFF64748B)
val Slate600 = Color(0xFF475569)
val Slate700 = Color(0xFF334155)
val Slate800 = Color(0xFF1E293B)
val Slate900 = Color(0xFF0F172A)
val NearBlack = Color(0xFF020617)  // Casi negro: máximo contraste al sol

// Semantic
val Success = Color(0xFF059669)
val SuccessContainer = Color(0xFFD1FAE5)
val ErrorContainer = Color(0xFFFECACA)
val WarningContainer = Color(0xFFFEF3C7)

// Tema claro optimizado para USO EN CALLE / SOL
// - Texto casi negro para máxima legibilidad con reflejos
// - Colores primarios y de acento saturados (no pasteles) para que no se lavan con el sol
// - Bordes y contornos oscuros para que se distingan con brillo
// - Fondos que eviten deslumbramiento pero mantengan contraste
val PrimaryLight = Indigo800           // Indigo oscuro y saturado, resiste al sol
val OnPrimaryLight = Color.White
val PrimaryContainerLight = Indigo100
val OnPrimaryContainerLight = Indigo900
val SecondaryLight = Teal700           // Teal fuerte, visible al sol
val OnSecondaryLight = Color.White
val SecondaryContainerLight = Teal200 // Teal medio, no pastel
val OnSecondaryContainerLight = Teal800
val TertiaryLight = Color(0xFF5B21B6) // Violeta saturado
val OnTertiaryLight = Color.White
val ErrorLightMain = Color(0xFFDC2626) // Rojo vivo, muy visible
val OnErrorLight = Color.White
val ErrorContainerLight = Color(0xFFFECACA)
val OnErrorContainerLight = Color(0xFF991B1B)
val BackgroundLight = Slate100        // Gris muy claro: menos reflejo que blanco puro
val OnBackgroundLight = NearBlack     // Texto casi negro
val SurfaceLight = Color.White        // Cards blancas, texto oscuro = máximo contraste
val OnSurfaceLight = NearBlack        // Texto principal casi negro
val OnSurfaceVariantLight = Slate700  // Texto secundario oscuro
val OutlineLight = Slate500           // Bordes bien visibles con brillo
val OutlineVariantLight = Slate400
val SurfaceVariantLight = Slate100    // Tarjetas secundarias

// SecurePark-style (pantalla principal operador y listados)
val PrimaryGreen = Color(0xFF21DE92)
val BackgroundDarkGreen = Color(0xFF11211A)
val Slate800Ring = Color(0xFF1F2937)
val CardDark = Color(0xFF1A2C24)
val BorderDark = Color(0xFF2A3D34)

// Dark theme
val PrimaryDark = Indigo100
val OnPrimaryDark = Indigo900
val PrimaryContainerDark = Indigo700
val OnPrimaryContainerDark = Indigo50
val SecondaryDark = Teal50
val OnSecondaryDark = Teal700
val BackgroundDark = Slate900
val OnBackgroundDark = Slate50
val SurfaceDark = Slate800
val OnSurfaceDark = Slate50
val OnSurfaceVariantDark = Slate400
val OutlineDark = Slate600
