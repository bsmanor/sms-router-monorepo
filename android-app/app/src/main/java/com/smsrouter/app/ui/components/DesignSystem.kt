package com.smsrouter.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smsrouter.app.ui.theme.AppTheme
import com.smsrouter.app.ui.theme.StatusTone

@Composable
fun AppSurfaceCard(
    modifier: Modifier = Modifier,
    borderStroke: BorderStroke? = BorderStroke(1.dp, AppTheme.colors.borderSubtle),
    shape: RoundedCornerShape = RoundedCornerShape(AppTheme.radius.lg),
    containerColor: Color = AppTheme.colors.surface,
    content: @Composable () -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        shape = shape,
        border = borderStroke,
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
    ) {
        Column(modifier = Modifier.padding(AppTheme.spacing.lg)) {
            content()
        }
    }
}

@Composable
fun AppStatusBadge(
    text: String,
    tone: StatusTone,
    modifier: Modifier = Modifier,
    leadingDot: Boolean = true
) {
    Box(
        modifier = modifier
            .background(tone.bg, shape = RoundedCornerShape(AppTheme.radius.xs))
            .border(1.dp, tone.border, shape = RoundedCornerShape(AppTheme.radius.xs))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (leadingDot) {
                Box(
                    modifier = Modifier
                        .size(5.dp)
                        .background(tone.text, shape = CircleShape)
                )
            }
            Text(
                text = text,
                color = tone.text,
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun AppLayerBadge(
    source: String,
    modifier: Modifier = Modifier
) {
    val tone = when (source) {
        "BROADCAST" -> AppTheme.colors.info
        "INBOX_DB" -> AppTheme.colors.brandAccent
        "RCS_NOTIF" -> AppTheme.colors.brandAccent
        "TEST" -> AppTheme.colors.warning.text
        else -> AppTheme.colors.textMuted
    }

    Box(
        modifier = modifier
            .background(AppTheme.colors.surfaceSubtle, shape = RoundedCornerShape(AppTheme.radius.xs))
            .border(1.dp, AppTheme.colors.borderSubtle, shape = RoundedCornerShape(AppTheme.radius.xs))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            text = source,
            color = if (tone is Color) tone else AppTheme.colors.textSecondary,
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun AppPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(44.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = AppTheme.colors.actionPrimary,
            contentColor = AppTheme.colors.actionPrimaryText,
            disabledContainerColor = AppTheme.colors.surfaceSubtle
        ),
        shape = RoundedCornerShape(AppTheme.radius.md)
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
        }
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun AppSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(44.dp),
        shape = RoundedCornerShape(AppTheme.radius.md),
        border = BorderStroke(1.dp, AppTheme.colors.borderSubtle),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = AppTheme.colors.surface,
            contentColor = AppTheme.colors.textPrimary
        )
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
        }
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    modifier: Modifier = Modifier,
    isPassword: Boolean = false,
    trailingAction: (@Composable () -> Unit)? = null,
    isMonospace: Boolean = false
) {
    var passwordVisible by remember { mutableStateOf(!isPassword) }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = label,
            color = AppTheme.colors.textPrimary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 6.dp)
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(
                    text = placeholder,
                    fontSize = 12.sp,
                    color = AppTheme.colors.textMuted
                )
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(AppTheme.radius.md),
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            textStyle = androidx.compose.ui.text.TextStyle(
                color = AppTheme.colors.textPrimary,
                fontSize = 12.sp,
                fontFamily = if (isMonospace) FontFamily.Monospace else FontFamily.Default
            ),
            trailingIcon = {
                if (isPassword) {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password",
                            tint = AppTheme.colors.textMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                } else if (trailingAction != null) {
                    trailingAction()
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = AppTheme.colors.surface,
                unfocusedContainerColor = AppTheme.colors.surfaceSubtle,
                focusedBorderColor = AppTheme.colors.borderFocus,
                unfocusedBorderColor = AppTheme.colors.borderSubtle
            )
        )
    }
}

@Composable
fun AppSectionHeader(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = AppTheme.colors.textPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.3).sp
            )
            Text(
                text = subtitle,
                color = AppTheme.colors.textMuted,
                fontSize = 11.sp
            )
        }
        if (action != null) {
            action()
        }
    }
}

@Composable
fun AppMetricTile(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    statusTone: StatusTone = AppTheme.colors.info
) {
    Box(
        modifier = modifier
            .background(AppTheme.colors.surfaceSubtle, shape = RoundedCornerShape(AppTheme.radius.md))
            .border(1.dp, AppTheme.colors.borderSubtle, shape = RoundedCornerShape(AppTheme.radius.md))
            .padding(12.dp)
    ) {
        Column {
            Text(
                text = label,
                color = AppTheme.colors.textMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                color = statusTone.text,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}
