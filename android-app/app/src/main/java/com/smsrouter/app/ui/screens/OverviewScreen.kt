package com.smsrouter.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smsrouter.app.SmsLogEntry
import com.smsrouter.app.ui.components.AppLayerBadge
import com.smsrouter.app.ui.components.AppMetricTile
import com.smsrouter.app.ui.components.AppPrimaryButton
import com.smsrouter.app.ui.components.AppSecondaryButton
import com.smsrouter.app.ui.components.AppSectionHeader
import com.smsrouter.app.ui.components.AppStatusBadge
import com.smsrouter.app.ui.components.AppSurfaceCard
import com.smsrouter.app.ui.theme.AppTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverviewScreen(
    logs: List<SmsLogEntry>,
    hasSmsPermission: Boolean,
    hasNotificationListener: Boolean,
    onSendTestSms: () -> Unit,
    onSyncInbox: () -> Unit,
    onRetryLog: (String) -> Unit
) {
    var selectedFilter by remember { mutableStateOf("ALL") }
    var inspectLog by remember { mutableStateOf<SmsLogEntry?>(null) }
    val sheetState = rememberModalBottomSheetState()

    val totalCount = logs.size
    val deliveredCount = logs.filter { it.status == "SUCCESS" }.size
    val pendingCount = logs.filter { it.status != "SUCCESS" }.size

    val filteredLogs = when (selectedFilter) {
        "SUCCESS" -> logs.filter { it.status == "SUCCESS" }
        "PENDING" -> logs.filter { it.status != "SUCCESS" }
        "BROADCAST" -> logs.filter { it.source == "BROADCAST" }
        "INBOX_DB" -> logs.filter { it.source == "INBOX_DB" }
        "RCS_NOTIF" -> logs.filter { it.source == "RCS_NOTIF" }
        else -> logs
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
            // System Readiness Hero Card
            AppSurfaceCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Gateway Operation Status",
                            color = AppTheme.colors.textPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (hasSmsPermission && hasNotificationListener)
                                "4/4 Interception layers active & primed"
                            else
                                "Action required in Capture tab",
                            color = AppTheme.colors.textMuted,
                            fontSize = 12.sp
                        )
                    }
                    AppStatusBadge(
                        text = if (hasSmsPermission && hasNotificationListener) "OPERATIONAL" else "CONFIG NEEDED",
                        tone = if (hasSmsPermission && hasNotificationListener) AppTheme.colors.success else AppTheme.colors.warning
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AppPrimaryButton(
                        text = "Send Test SMS",
                        onClick = onSendTestSms,
                        modifier = Modifier.weight(1f),
                        icon = Icons.Filled.Send
                    )
                    AppSecondaryButton(
                        text = "Sync Inbox DB",
                        onClick = onSyncInbox,
                        modifier = Modifier.weight(1f),
                        icon = Icons.Filled.Sync
                    )
                }
            }
        }

        // 3-Column KPI Metric Strip
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.sm)
            ) {
                AppMetricTile(
                    label = "Total Logs",
                    value = totalCount.toString(),
                    modifier = Modifier.weight(1f),
                    statusTone = AppTheme.colors.info
                )
                AppMetricTile(
                    label = "Dispatched",
                    value = deliveredCount.toString(),
                    modifier = Modifier.weight(1f),
                    statusTone = AppTheme.colors.success
                )
                AppMetricTile(
                    label = "Pending/Retry",
                    value = pendingCount.toString(),
                    modifier = Modifier.weight(1f),
                    statusTone = if (pendingCount > 0) AppTheme.colors.warning else AppTheme.colors.info
                )
            }
        }

        // Filter Pills & Header
        item {
            AppSectionHeader(
                title = "Live Intercepted Feed",
                subtitle = "Showing ${filteredLogs.size} messages captured by multi-layer coordinator"
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                listOf("ALL", "SUCCESS", "PENDING", "INBOX_DB", "RCS_NOTIF").forEach { filter ->
                    val isSelected = selectedFilter == filter
                    Box(
                        modifier = Modifier
                            .background(
                                if (isSelected) AppTheme.colors.actionPrimary else AppTheme.colors.surfaceSubtle,
                                shape = RoundedCornerShape(AppTheme.radius.pill)
                            )
                            .clickable { selectedFilter = filter }
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = filter,
                            color = if (isSelected) Color.White else AppTheme.colors.textSecondary,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Feed Items
        if (filteredLogs.isEmpty()) {
            item {
                AppSurfaceCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "No messages for selected filter",
                            color = AppTheme.colors.textPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Incoming SMS, RCS chats, or manual test messages will appear here live.",
                            color = AppTheme.colors.textMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        } else {
            items(filteredLogs, key = { it.id }) { log ->
                val dateFormat = remember { SimpleDateFormat("HH:mm:ss • dd MMM", Locale.getDefault()) }
                val formattedDate = remember(log.timestamp) {
                    if (log.timestamp > 0) dateFormat.format(Date(log.timestamp)) else "N/A"
                }

                AppSurfaceCard(
                    modifier = Modifier.clickable { inspectLog = log }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = log.sender,
                                color = AppTheme.colors.textPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            AppLayerBadge(source = log.source)
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = formattedDate,
                                color = AppTheme.colors.textMuted,
                                fontSize = 11.sp
                            )
                            AppStatusBadge(
                                text = log.status,
                                tone = when (log.status) {
                                    "SUCCESS" -> AppTheme.colors.success
                                    "PENDING" -> AppTheme.colors.warning
                                    else -> AppTheme.colors.danger
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = log.body,
                        color = AppTheme.colors.textSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        maxLines = 2
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (log.httpCode > 0) "Response: HTTP ${log.httpCode}" else "Direct HTTP Ingesting...",
                            color = AppTheme.colors.textMuted,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                        Icon(
                            imageVector = Icons.Filled.ChevronRight,
                            contentDescription = "Inspect",
                            tint = AppTheme.colors.textMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }

    // Modal BottomSheet for Log Inspection
    inspectLog?.let { entry ->
        ModalBottomSheet(
            onDismissRequest = { inspectLog = null },
            sheetState = sheetState,
            containerColor = AppTheme.colors.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppTheme.spacing.xl, vertical = AppTheme.spacing.md)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Message Inspection",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = AppTheme.colors.textPrimary
                        )
                        Text(
                            text = "ID: ${entry.id.take(8)}... • Layer: ${entry.source}",
                            fontSize = 11.sp,
                            color = AppTheme.colors.textMuted,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                    AppStatusBadge(
                        text = entry.status,
                        tone = if (entry.status == "SUCCESS") AppTheme.colors.success else AppTheme.colors.danger
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(AppTheme.colors.surfaceSubtle, shape = RoundedCornerShape(AppTheme.radius.md))
                        .padding(12.dp)
                ) {
                    Column {
                        Text("Sender Address:", color = AppTheme.colors.textMuted, fontSize = 11.sp)
                        Text(entry.sender, color = AppTheme.colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Payload Body:", color = AppTheme.colors.textMuted, fontSize = 11.sp)
                        Text(entry.body, color = AppTheme.colors.textSecondary, fontSize = 12.sp, lineHeight = 17.sp)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (entry.status != "SUCCESS") {
                    AppPrimaryButton(
                        text = "Retry Direct HTTP Dispatch",
                        onClick = {
                            onRetryLog(entry.id)
                            inspectLog = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        icon = Icons.Filled.Refresh
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }

                AppSecondaryButton(
                    text = "Close",
                    onClick = { inspectLog = null },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(30.dp))
            }
        }
    }
}
