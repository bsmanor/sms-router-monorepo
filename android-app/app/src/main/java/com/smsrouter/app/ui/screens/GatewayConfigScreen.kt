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
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.ContentPaste
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smsrouter.app.AppConfig
import com.smsrouter.app.UpdateStatus
import com.smsrouter.app.ui.components.AppPrimaryButton
import com.smsrouter.app.ui.components.AppSecondaryButton
import com.smsrouter.app.ui.components.AppSectionHeader
import com.smsrouter.app.ui.components.AppStatusBadge
import com.smsrouter.app.ui.components.AppSurfaceCard
import com.smsrouter.app.ui.components.AppTextField
import com.smsrouter.app.ui.theme.AppTheme
import java.io.File

@Composable
fun GatewayConfigScreen(
    config: AppConfig,
    installedVersion: String,
    updateStatus: UpdateStatus,
    downloadProgress: Int,
    onSaveConfig: (AppConfig) -> Unit,
    onSendTestSms: () -> Unit,
    onCheckUpdate: () -> Unit,
    onDownloadUpdate: (String) -> Unit,
    onPromptInstall: (File) -> Unit
) {
    var endpointUrl by remember { mutableStateOf(config.endpointUrl) }
    var apiKey by remember { mutableStateOf(config.apiKey) }
    var hmacSecret by remember { mutableStateOf(config.hmacSecret) }
    var deviceId by remember { mutableStateOf(config.deviceId) }
    val clipboardManager = LocalClipboardManager.current

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
                title = "Gateway Credentials",
                subtitle = "Configures authenticated HMAC-SHA256 direct HTTP dispatch to Cloud Functions"
            )
        }

        // Credentials Form
        item {
            AppSurfaceCard {
                AppTextField(
                    value = endpointUrl,
                    onValueChange = { endpointUrl = it },
                    label = "Webhook Ingest URL",
                    placeholder = "https://us-central1-sms-router-797c4.cloudfunctions.net/ingestSms",
                    isMonospace = true,
                    trailingAction = {
                        Text(
                            text = "PASTE",
                            color = AppTheme.colors.brandAccent,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(AppTheme.colors.brandAccentSubtle)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))

                AppTextField(
                    value = apiKey,
                    onValueChange = { apiKey = it },
                    label = "API Key (X-API-Key)",
                    placeholder = "Paste API Key from Web Admin",
                    isPassword = true
                )
                Spacer(modifier = Modifier.height(12.dp))

                AppTextField(
                    value = hmacSecret,
                    onValueChange = { hmacSecret = it },
                    label = "HMAC Secret (X-Signature)",
                    placeholder = "Cryptographic secret for SHA-256 signing",
                    isPassword = true
                )
                Spacer(modifier = Modifier.height(12.dp))

                AppTextField(
                    value = deviceId,
                    onValueChange = { deviceId = it },
                    label = "Device Identifier",
                    placeholder = "Xiaomi-15T-Pro"
                )
                Spacer(modifier = Modifier.height(18.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AppPrimaryButton(
                        text = "Save Settings",
                        onClick = {
                            val newCfg = AppConfig(
                                endpointUrl = endpointUrl,
                                apiKey = apiKey,
                                hmacSecret = hmacSecret,
                                deviceId = deviceId,
                                isKeepAliveEnabled = config.isKeepAliveEnabled
                            )
                            onSaveConfig(newCfg)
                        },
                        modifier = Modifier.weight(1f),
                        icon = Icons.Filled.Save
                    )
                    AppSecondaryButton(
                        text = "Send Test SMS",
                        onClick = onSendTestSms,
                        modifier = Modifier.weight(1f),
                        icon = Icons.Filled.Send
                    )
                }
            }
        }

        // In-App Self Updater
        item {
            AppSectionHeader(
                title = "In-App Self Updater",
                subtitle = "Pulls signed APK releases from GitHub with persistent PKCS12 certificate"
            )
        }

        item {
            AppSurfaceCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Installed APK Version",
                            color = AppTheme.colors.textPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "v$installedVersion • Persistent Keystore Verified",
                            color = AppTheme.colors.textMuted,
                            fontSize = 11.sp
                        )
                    }
                    AppStatusBadge(
                        text = "v$installedVersion",
                        tone = AppTheme.colors.success
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                when (val status = updateStatus) {
                    is UpdateStatus.Checking -> {
                        Text("Verifying latest GitHub release assets...", color = AppTheme.colors.textMuted, fontSize = 12.sp)
                    }
                    is UpdateStatus.UpdateAvailable -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(AppTheme.colors.brandAccentSubtle, shape = RoundedCornerShape(AppTheme.radius.md))
                                .padding(12.dp)
                        ) {
                            Column {
                                Text(
                                    text = "Version v${status.versionName} is ready to install!",
                                    color = AppTheme.colors.brandAccent,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = status.changelog,
                                    color = AppTheme.colors.textSecondary,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                AppPrimaryButton(
                                    text = "Download & Install Update",
                                    onClick = { onDownloadUpdate(status.downloadUrl) },
                                    modifier = Modifier.fillMaxWidth(),
                                    icon = Icons.Filled.CloudDownload
                                )
                            }
                        }
                    }
                    is UpdateStatus.Downloading -> {
                        Text("Downloading update: $downloadProgress%", color = AppTheme.colors.brandAccent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = downloadProgress / 100f,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = AppTheme.colors.brandAccent,
                            trackColor = AppTheme.colors.brandAccentBorder
                        )
                    }
                    is UpdateStatus.ReadyToInstall -> {
                        AppPrimaryButton(
                            text = "Tap to Install v2.0.0 Now",
                            onClick = { onPromptInstall(status.apkFile) },
                            modifier = Modifier.fillMaxWidth(),
                            icon = Icons.Filled.CloudDownload
                        )
                    }
                    is UpdateStatus.Error -> {
                        Text(status.message, color = AppTheme.colors.danger.text, fontSize = 11.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        AppSecondaryButton(
                            text = "Check Again",
                            onClick = onCheckUpdate,
                            modifier = Modifier.fillMaxWidth(),
                            icon = Icons.Filled.Refresh
                        )
                    }
                    else -> {
                        AppSecondaryButton(
                            text = "Check GitHub for Updates",
                            onClick = onCheckUpdate,
                            modifier = Modifier.fillMaxWidth(),
                            icon = Icons.Filled.Refresh
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
