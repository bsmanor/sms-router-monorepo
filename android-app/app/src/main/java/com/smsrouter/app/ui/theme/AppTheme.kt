package com.smsrouter.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class StatusTone(
    val bg: Color,
    val border: Color,
    val text: Color
)

data class SmsRouterColorTokens(
    val canvas: Color,
    val surface: Color,
    val surfaceSubtle: Color,
    val surfaceElevated: Color,
    val surfaceCode: Color,

    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val textInverse: Color,

    val borderSubtle: Color,
    val borderStrong: Color,
    val borderFocus: Color,

    val actionPrimary: Color,
    val actionPrimaryText: Color,
    val actionPrimaryHover: Color,

    val brandAccent: Color,
    val brandAccentSubtle: Color,
    val brandAccentBorder: Color,

    val success: StatusTone,
    val warning: StatusTone,
    val danger: StatusTone,
    val info: StatusTone
)

data class SmsRouterSpacing(
    val xxs: Dp = 2.dp,
    val xs: Dp = 4.dp,
    val sm: Dp = 8.dp,
    val md: Dp = 12.dp,
    val lg: Dp = 16.dp,
    val xl: Dp = 20.dp,
    val xxl: Dp = 24.dp
)

data class SmsRouterRadius(
    val xs: Dp = 6.dp,
    val sm: Dp = 8.dp,
    val md: Dp = 12.dp,
    val lg: Dp = 16.dp,
    val xl: Dp = 20.dp,
    val pill: Dp = 999.dp
)

val BrightColorTokens = SmsRouterColorTokens(
    canvas = Color(0xFFF8FAFC),            // Slate 50
    surface = Color(0xFFFFFFFF),           // Pure Snow White
    surfaceSubtle = Color(0xFFF1F5F9),     // Slate 100
    surfaceElevated = Color(0xFFFFFFFF),
    surfaceCode = Color(0xFF0F172A),       // Slate 900 Code Canvas

    textPrimary = Color(0xFF0F172A),       // High contrast obsidian
    textSecondary = Color(0xFF334155),     // Slate 700
    textMuted = Color(0xFF64748B),         // Slate 500
    textInverse = Color(0xFFFFFFFF),

    borderSubtle = Color(0xFFE2E8F0),      // Slate 200
    borderStrong = Color(0xFFCBD5E1),      // Slate 300
    borderFocus = Color(0xFF2563EB),       // Vibrant Blue 600

    actionPrimary = Color(0xFF0F172A),     // Emil signature black button
    actionPrimaryText = Color(0xFFFFFFFF),
    actionPrimaryHover = Color(0xFF1E293B),

    brandAccent = Color(0xFF2563EB),       // Blue 600
    brandAccentSubtle = Color(0xFFEFF6FF), // Blue 50
    brandAccentBorder = Color(0xFFBFDBFE), // Blue 200

    success = StatusTone(
        bg = Color(0xFFECFDF5),
        border = Color(0xFFA7F3D0),
        text = Color(0xFF047857)
    ),
    warning = StatusTone(
        bg = Color(0xFFFFFBEB),
        border = Color(0xFFFDE68A),
        text = Color(0xFFB45309)
    ),
    danger = StatusTone(
        bg = Color(0xFFFFF1F2),
        border = Color(0xFFFECDD3),
        text = Color(0xFFBE123C)
    ),
    info = StatusTone(
        bg = Color(0xFFEFF6FF),
        border = Color(0xFFBFDBFE),
        text = Color(0xFF1D4ED8)
    )
)

val LocalColorTokens = staticCompositionLocalOf { BrightColorTokens }
val LocalSpacing = staticCompositionLocalOf { SmsRouterSpacing() }
val LocalRadius = staticCompositionLocalOf { SmsRouterRadius() }

object AppTheme {
    val colors: SmsRouterColorTokens
        @Composable
        get() = LocalColorTokens.current

    val spacing: SmsRouterSpacing
        @Composable
        get() = LocalSpacing.current

    val radius: SmsRouterRadius
        @Composable
        get() = LocalRadius.current
}

private val ForcedM3LightColorScheme = lightColorScheme(
    primary = BrightColorTokens.actionPrimary,
    onPrimary = BrightColorTokens.actionPrimaryText,
    primaryContainer = BrightColorTokens.surfaceSubtle,
    onPrimaryContainer = BrightColorTokens.textPrimary,
    secondary = BrightColorTokens.brandAccent,
    onSecondary = Color.White,
    background = BrightColorTokens.canvas,
    onBackground = BrightColorTokens.textPrimary,
    surface = BrightColorTokens.surface,
    onSurface = BrightColorTokens.textPrimary,
    surfaceVariant = BrightColorTokens.surfaceSubtle,
    onSurfaceVariant = BrightColorTokens.textMuted,
    outline = BrightColorTokens.borderSubtle,
    outlineVariant = BrightColorTokens.surfaceSubtle
)

@Composable
fun SmsRouterTheme(
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(
        LocalColorTokens provides BrightColorTokens,
        LocalSpacing provides SmsRouterSpacing(),
        LocalRadius provides SmsRouterRadius()
    ) {
        MaterialTheme(
            colorScheme = ForcedM3LightColorScheme,
            content = content
        )
    }
}
