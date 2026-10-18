package com.smsrouter.app.ui.screens

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Dataset
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
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
fun ArchitectureScreen() {
    val context = LocalContext.current

    val openUrl: (String) -> Unit = { url ->
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            context.startActivity(intent)
        } catch (_: Exception) {}
    }

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
                title = "System Architecture & Goals",
                subtitle = "Complete design blueprint for the SMS Router Gateway monorepo"
            )
        }

        // Mission Card
        item {
            AppSurfaceCard {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Devices,
                        contentDescription = null,
                        tint = AppTheme.colors.brandAccent,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Why SMS Router Gateway Exists",
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.colors.textPrimary,
                        fontSize = 14.sp
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "SMS Router Gateway bridges the cellular telecom network with modern programmable cloud microservices. By combining a 4-layer Android interception engine with Firebase Cloud Functions v2 and HMAC-SHA256 cryptography, it ensures verification codes, 2FA alerts, and cellular events are dispatched to your server in real time.",
                    color = AppTheme.colors.textSecondary,
                    fontSize = 12.sp,
                    lineHeight = 17.sp
                )
            }
        }

        // 5-Stage Data Flow Pipeline
        item {
            AppSurfaceCard {
                Text(
                    text = "5-Stage Data Pipeline",
                    fontWeight = FontWeight.Bold,
                    color = AppTheme.colors.textPrimary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(10.dp))

                listOf(
                    "1. Inbound Event" to "Cellular SMS, HyperOS OTP, or Google Messages RCS Chat arrives on SIM.",
                    "2. 4-Layer Interception" to "Broadcast, ContentObserver, 4s Poller, or NotificationListener intercepts with 60s deduplication.",
                    "3. Direct HTTP Dispatch" to "Immediate high-priority OkHttp POST with HMAC-SHA256 signature (bypassing HyperOS WorkManager delays).",
                    "4. Cloud Function Ingest" to "Node.js 20 ingestSms function verifies signature in constant time and checks sequential priority rules.",
                    "5. Target Webhook & Audit" to "Renders custom Mustache template, fires HTTP request to destination, and logs audit trace in Firestore."
                ).forEachIndexed { idx, (step, desc) ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .background(AppTheme.colors.surfaceSubtle, shape = RoundedCornerShape(AppTheme.radius.md))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text(step, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AppTheme.colors.brandAccent)
                            Text(desc, fontSize = 11.sp, color = AppTheme.colors.textSecondary, lineHeight = 15.sp)
                        }
                    }
                }
            }
        }

        // Monorepo Directory Structure
        item {
            AppSurfaceCard {
                Text(
                    text = "Monorepo Directory Structure",
                    fontWeight = FontWeight.Bold,
                    color = AppTheme.colors.textPrimary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                listOf(
                    "/android-app" to "Kotlin + Jetpack Compose + Material 3 client gateway",
                    "/functions" to "Cloud Functions v2 (ingestSms, simulateRules, replayWebhook)",
                    "/web-ui" to "React 18 + Vite + Tailwind CSS operations console",
                    "/.github/workflows" to "CI/CD for APK compilation (Java 17) & Hosting deployment"
                ).forEach { (dir, desc) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(dir, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AppTheme.colors.textPrimary)
                        Text(desc, fontSize = 11.sp, color = AppTheme.colors.textMuted)
                    }
                }
            }
        }

        // Ecosystem Links
        item {
            AppSectionHeader(
                title = "Live Resources & Endpoints",
                subtitle = "Direct links to production infrastructure and repositories"
            )
        }

        item {
            AppSurfaceCard {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppSecondaryButton(
                        text = "Open Web Admin (https://sms-router.web.app)",
                        onClick = { openUrl("https://sms-router.web.app") },
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Filled.Language
                    )
                    AppSecondaryButton(
                        text = "GitHub Monorepo (bsmanor/sms-router-monorepo)",
                        onClick = { openUrl("https://github.com/bsmanor/sms-router-monorepo") },
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Filled.Code
                    )
                    AppSecondaryButton(
                        text = "GitHub Releases & APK Downloads",
                        onClick = { openUrl("https://github.com/bsmanor/sms-router-monorepo/releases") },
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Filled.OpenInBrowser
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}
