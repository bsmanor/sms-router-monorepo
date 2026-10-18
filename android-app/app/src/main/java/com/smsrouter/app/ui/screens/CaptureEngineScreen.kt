package com.smsrouter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryAlert
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smsrouter.app.ui.components.AppPrimaryButton
import com.smsrouter.app.ui.components.AppSecondaryButton
import com.smsrouter.app.ui.components.AppSectionHeader
import com.smsrouter.app.ui.components.AppStatusBadge
import com.smsrouter.app.ui.components.AppSurfaceCard
import com.smsrouter.app.ui.theme.AppTheme

@Composable
fun CaptureEngineScreen(
    hasReceiveSms: Boolean,
    hasReadSms: Boolean,
    hasNotificationAccess: Boolean,
    hasPostNotification: Boolean,
    isKeepAliveActive: Boolean,
    onToggleKeepAlive: (Boolean) -> Unit,
    onRequestPermissions: () -> Unit,
    onOpenNotificationSettings: () -> Unit,
    onDisableBatteryOpt: () -> Unit,
    onOpenAppSettings: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.canvas)
            .padding(horizontal = AppTheme.spacing.lg),
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.md)
    ) {
        item {
            Spacer(modifier = Modifier.height(AppTheme.spacing.sm))
            AppSectionHeader(
                title = "4-Layer Interception Status",
                subtitle = "Ensures zero missed messages against HyperOS broadcast suppression & RCS"
            )
        }

        // Layer 1 & 2: Broadcast
        item {
            AppSurfaceCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Layer 1 & 2: Cellular Broadcast",
                            color = AppTheme.colors.textPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Priority 999 Static Receiver + Dynamic Foreground Receiver",
                            color = AppTheme.colors.textMuted,
                            fontSize = 11.sp
                        )
                    }
                    AppStatusBadge(
                        text = if (hasReceiveSms) "ACTIVE" else "DENIED",
                        tone = if (hasReceiveSms) AppTheme.colors.success else AppTheme.colors.danger
                    )
                }
            }
        }

        // Layer 3: System Inbox DB
        item {
            AppSurfaceCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Layer 3: Inbox Database Observer",
                            color = AppTheme.colors.textPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Watches content://sms + 4-sec poller for silent 2FA writes",
                            color = AppTheme.colors.textMuted,
                            fontSize = 11.sp
                        )
                    }
                    AppStatusBadge(
                        text = if (hasReadSms) "ACTIVE" else "DENIED",
                        tone = if (hasReadSms) AppTheme.colors.success else AppTheme.colors.danger
                    )
                }
            }
        }

        // Layer 4: Notification Listener
        item {
            AppSurfaceCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Layer 4: RCS & OTP Notification Listener",
                            color = AppTheme.colors.textPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Catches Google Messages RCS Chats and MIUI-protected verification codes",
                            color = AppTheme.colors.textMuted,
                            fontSize = 11.sp
                        )
                    }
                    AppStatusBadge(
                        text = if (hasNotificationAccess) "ACTIVE" else "DISABLED",
                        tone = if (hasNotificationAccess) AppTheme.colors.success else AppTheme.colors.warning
                    )
                }
                if (!hasNotificationAccess) {
                    Spacer(modifier = Modifier.height(10.dp))
                    AppPrimaryButton(
                        text = "Enable Notification Access",
                        onClick = onOpenNotificationSettings,
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Filled.Notifications
                    )
                }
            }
        }

        // Foreground Service Switch
        item {
            AppSurfaceCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Keep-Alive Foreground Engine",
                            color = AppTheme.colors.textPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Runs dynamic receiver, ContentObserver, and poller continuously",
                            color = AppTheme.colors.textMuted,
                            fontSize = 11.sp
                        )
                    }
                    Switch(
                        checked = isKeepAliveActive,
                        onCheckedChange = onToggleKeepAlive,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = AppTheme.colors.brandAccent,
                            uncheckedThumbColor = Color.White,
                            uncheckedTrackColor = AppTheme.colors.borderStrong
                        )
                    )
                }
            }
        }

        // Permission Grant & Battery Optimization Actions
        item {
            AppSurfaceCard {
                Text(
                    text = "System Permission & Power Management",
                    fontWeight = FontWeight.Bold,
                    color = AppTheme.colors.textPrimary,
                    fontSize = 13.sp
                )
                Text(
                    text = "Ensure Android does not put SMS Router into deep sleep.",
                    color = AppTheme.colors.textMuted,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                if (!hasReceiveSms || !hasReadSms || !hasPostNotification) {
                    AppPrimaryButton(
                        text = "Grant Missing Runtime Permissions",
                        onClick = onRequestPermissions,
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Filled.Security
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
                AppSecondaryButton(
                    text = "Disable Battery Optimization",
                    onClick = onDisableBatteryOpt,
                    modifier = Modifier.fillMaxWidth(),
                    icon = Icons.Filled.BatteryAlert
                )
            }
        }

        // HyperOS / Android 14 Checklist
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppTheme.colors.warning.bg, shape = RoundedCornerShape(AppTheme.radius.lg))
                    .padding(AppTheme.spacing.lg)
            ) {
                Column {
                    Text(
                        text = "Xiaomi 15T Pro (HyperOS) Setup Checklist",
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.colors.warning.text,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "1. Notification Access: If greyed out as 'Restricted setting', open App Info -> 3 dots top right -> Allow restricted settings.\n" +
                                "2. App Permissions: Enable 'Read SMS' and 'Service SMS'.\n" +
                                "3. Battery & Background: Enable 'Autostart' and set Battery Saver to 'No restrictions'.",
                        color = AppTheme.colors.warning.text,
                        fontSize = 11.sp,
                        lineHeight = 16.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    AppSecondaryButton(
                        text = "Open App Info Settings",
                        onClick = onOpenAppSettings,
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Filled.Settings
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
