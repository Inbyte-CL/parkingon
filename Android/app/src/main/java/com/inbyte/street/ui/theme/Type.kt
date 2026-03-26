package com.inbyte.street.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private fun scaleSp(value: Float, scale: Float) = (value * scale).sp

/** Tipografía base (escala 1.0) */
private fun baseTypography() = Typography(
    displayLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.25).sp
    ),
    displayMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 36.sp
    ),
    displaySmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 32.sp
    ),
    headlineLarge = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp
    ),
    headlineSmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    titleSmall = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp
    ),
    bodySmall = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
    labelMedium = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    ),
    labelSmall = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    )
)

/** Tipografía escalada para accesibilidad (scale: 1f = normal, 1.75f = +75%) */
fun scaledTypography(scale: Float): Typography {
    if (scale <= 0f || scale == 1f) return baseTypography()
    val s = scale.coerceIn(1f, 2f)
    val t = baseTypography()
    return Typography(
        displayLarge = t.displayLarge.copy(fontSize = scaleSp(32f, s), lineHeight = scaleSp(40f, s)),
        displayMedium = t.displayMedium.copy(fontSize = scaleSp(28f, s), lineHeight = scaleSp(36f, s)),
        displaySmall = t.displaySmall.copy(fontSize = scaleSp(24f, s), lineHeight = scaleSp(32f, s)),
        headlineLarge = t.headlineLarge.copy(fontSize = scaleSp(22f, s), lineHeight = scaleSp(28f, s)),
        headlineMedium = t.headlineMedium.copy(fontSize = scaleSp(20f, s), lineHeight = scaleSp(26f, s)),
        headlineSmall = t.headlineSmall.copy(fontSize = scaleSp(18f, s), lineHeight = scaleSp(24f, s)),
        titleLarge = t.titleLarge.copy(fontSize = scaleSp(18f, s), lineHeight = scaleSp(24f, s)),
        titleMedium = t.titleMedium.copy(fontSize = scaleSp(16f, s), lineHeight = scaleSp(22f, s)),
        titleSmall = t.titleSmall.copy(fontSize = scaleSp(14f, s), lineHeight = scaleSp(20f, s)),
        bodyLarge = t.bodyLarge.copy(fontSize = scaleSp(16f, s), lineHeight = scaleSp(24f, s)),
        bodyMedium = t.bodyMedium.copy(fontSize = scaleSp(14f, s), lineHeight = scaleSp(20f, s)),
        bodySmall = t.bodySmall.copy(fontSize = scaleSp(12f, s), lineHeight = scaleSp(16f, s)),
        labelLarge = t.labelLarge.copy(fontSize = scaleSp(14f, s), lineHeight = scaleSp(20f, s)),
        labelMedium = t.labelMedium.copy(fontSize = scaleSp(12f, s), lineHeight = scaleSp(16f, s)),
        labelSmall = t.labelSmall.copy(fontSize = scaleSp(11f, s), lineHeight = scaleSp(16f, s))
    )
}

val Typography = baseTypography()
