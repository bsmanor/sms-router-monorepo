package com.smsrouter.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    private lateinit var storage: StorageManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        storage = StorageManager.getInstance(this)

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F172A)
                ) {
                    MainScreen(
                        storage = storage,
                        onTriggerBatteryOptimization = { requestIgnoreBatteryOptimization() },
                        onSendTestPayload = { enqueueTestSms() },
                        onRetryItem = { logId -> retryLogItem(logId) }
                    )
                }
            }
        }
    }

    private fun requestIgnoreBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    startActivity(intent)
                }
            } else {
                Toast.makeText(this, "Battery optimizations already ignored", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun enqueueTestSms() {
        val testSender = "+1 (555) 948-2041"
        val testBody = "Test OTP: 684102. Your SMS Router configuration is valid and active."
        val timestamp = System.currentTimeMillis()
        val logId = UUID.randomUUID().toString()

        val entry = SmsLogEntry(
            id = logId,
            sender = testSender,
            body = testBody,
            timestamp = timestamp,
            status = "PENDING",
            httpCode = 0
        )
        storage.addLog(entry)

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val inputData = Data.Builder()
            .putString(SmsForwardWorker.KEY_LOG_ID, logId)
            .putString(SmsForwardWorker.KEY_SENDER, testSender)
            .putString(SmsForwardWorker.KEY_BODY, testBody)
            .putLong(SmsForwardWorker.KEY_TIMESTAMP, timestamp)
            .build()

        val workRequest = OneTimeWorkRequestBuilder<SmsForwardWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .setInputData(inputData)
            .build()

        WorkManager.getInstance(this).enqueue(workRequest)
        Toast.makeText(this, "Test SMS payload queued for delivery", Toast.LENGTH_SHORT).show()
    }

    private fun retryLogItem(logId: String) {
        val entry = storage.getLog(logId) ?: return
        storage.updateLogStatus(logId, "PENDING", 0)

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val inputData = Data.Builder()
            .putString(SmsForwardWorker.KEY_LOG_ID, logId)
            .putString(SmsForwardWorker.KEY_SENDER, entry.sender)
            .putString(SmsForwardWorker.KEY_BODY, entry.body)
            .putLong(SmsForwardWorker.KEY_TIMESTAMP, entry.timestamp)
            .build()

        val workRequest = OneTimeWorkRequestBuilder<SmsForwardWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .setInputData(inputData)
            .build()

        WorkManager.getInstance(this).enqueue(workRequest)
        Toast.makeText(this, "Retrying payload delivery...", Toast.LENGTH_SHORT).show()
    }
}

@Composable
fun MainScreen(
    storage: StorageManager,
    onTriggerBatteryOptimization: () -> Unit,
    onSendTestPayload: () -> Unit,
    onRetryItem: (String) -> Unit
) {
    val context = LocalContext.current
    var config by remember { mutableStateOf(storage.getConfig()) }
    var logs by remember { mutableStateOf(storage.getLogs()) }

    var endpointUrl by remember { mutableStateOf(config.endpointUrl) }
    var apiKey by remember { mutableStateOf(config.apiKey) }
    var hmacSecret by remember { mutableStateOf(config.hmacSecret) }
    var deviceId by remember { mutableStateOf(config.deviceId) }
    var isKeepAliveEnabled by remember { mutableStateOf(config.isKeepAliveEnabled) }

    var hasSmsPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECEIVE_SMS
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    var hasNotificationPermission by remember {
        mutableStateOf(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        hasSmsPermission = results[Manifest.permission.RECEIVE_SMS] ?: hasSmsPermission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasNotificationPermission = results[Manifest.permission.POST_NOTIFICATIONS] ?: hasNotificationPermission
        }
    }

    val refreshLogs = {
        logs = storage.getLogs()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "SMS Router Gateway",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Forward incoming messages securely via HMAC",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp
                    )
                }
            }
        }

        // Section 1: Server Configuration
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "1. Server Configuration",
                        color = Color(0xFF38BDF8),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = endpointUrl,
                        onValueChange = { endpointUrl = it },
                        label = { Text("Webhook Ingest URL") },
                        placeholder = { Text("https://<region>-<project>.cloudfunctions.net/ingestSms") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = apiKey,
                        onValueChange = { apiKey = it },
                        label = { Text("X-API-Key") },
                        placeholder = { Text("Paste API Key from Web Admin") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = hmacSecret,
                        onValueChange = { hmacSecret = it },
                        label = { Text("HMAC Secret") },
                        placeholder = { Text("Paste secret for SHA-256 signing") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = deviceId,
                        onValueChange = { deviceId = it },
                        label = { Text("Device Identifier") },
                        placeholder = { Text("e.g. Pixel-7-Main") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                val newConfig = AppConfig(
                                    endpointUrl = endpointUrl,
                                    apiKey = apiKey,
                                    hmacSecret = hmacSecret,
                                    deviceId = deviceId,
                                    isKeepAliveEnabled = isKeepAliveEnabled
                                )
                                storage.saveConfig(newConfig)
                                config = newConfig
                                Toast.makeText(context, "Configuration saved successfully", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                        ) {
                            Text("Save Config", color = Color.White)
                        }

                        OutlinedButton(
                            onClick = {
                                onSendTestPayload()
                                refreshLogs()
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Send Test SMS", color = Color(0xFF38BDF8))
                        }
                    }
                }
            }
        }

        // Section 2: Permissions & HyperOS / Android 13+ Health Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "2. System Health & Permissions",
                        color = Color(0xFF38BDF8),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    // Permission Badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("RECEIVE_SMS Permission:", color = Color.White, fontSize = 14.sp)
                        Badge(
                            text = if (hasSmsPermission) "GRANTED" else "DENIED",
                            isSuccess = hasSmsPermission
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("POST_NOTIFICATIONS:", color = Color.White, fontSize = 14.sp)
                        Badge(
                            text = if (hasNotificationPermission) "GRANTED" else "DENIED",
                            isSuccess = hasNotificationPermission
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    if (!hasSmsPermission || !hasNotificationPermission) {
                        Button(
                            onClick = {
                                val perms = mutableListOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    perms.add(Manifest.permission.POST_NOTIFICATIONS)
                                }
                                permissionLauncher.launch(perms.toTypedArray())
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706))
                        ) {
                            Text("Request Missing Permissions", color = Color.White)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Battery Optimization Button
                    OutlinedButton(
                        onClick = onTriggerBatteryOptimization,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Disable Battery Optimizations", color = Color(0xFFFBBF24))
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    // Keep-Alive Service Toggle
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Keep-Alive Foreground Service", color = Color.White, fontSize = 14.sp)
                            Text(
                                "Prevents OEM killers from terminating background SMS listener",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp
                            )
                        }
                        Switch(
                            checked = isKeepAliveEnabled,
                            onCheckedChange = { checked ->
                                isKeepAliveEnabled = checked
                                storage.setKeepAliveEnabled(checked)
                                if (checked) {
                                    KeepAliveService.startService(context)
                                } else {
                                    KeepAliveService.stopService(context)
                                }
                            }
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    // OEM Notice Box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF334155), shape = RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text(
                                text = "OEM Specific Directives:",
                                color = Color(0xFFFCD34D),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "• On Android 13+: Open App Info -> ⋮ -> 'Allow restricted settings' if permissions are grayed out.\n" +
                                        "• On Xiaomi HyperOS / MIUI: Open App Info -> Enable 'Autostart' & set 'Battery Saver' to 'No Restrictions'.\n" +
                                        "• On Samsung OneUI: Add SMS Router to 'Never sleeping apps'.",
                                color = Color(0xFFE2E8F0),
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }
        }

        // Section 3: Local Queue & History
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "3. Intercepted SMS History (${logs.size}/50)",
                    color = Color(0xFF38BDF8),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
                OutlinedButton(onClick = { refreshLogs() }) {
                    Text("Refresh", fontSize = 12.sp, color = Color(0xFF38BDF8))
                }
            }
        }

        if (logs.isEmpty()) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No SMS messages intercepted yet.\nClick 'Send Test SMS' above to verify pipeline.",
                            color = Color(0xFF94A3B8),
                            fontSize = 13.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }
        } else {
            items(logs, key = { it.id }) { log ->
                LogItemCard(
                    entry = log,
                    onRetry = {
                        onRetryItem(log.id)
                        refreshLogs()
                    }
                )
            }
        }
    }
}

@Composable
fun LogItemCard(entry: SmsLogEntry, onRetry: () -> Unit) {
    val dateFormat = remember { SimpleDateFormat("HH:mm:ss dd/MM", Locale.getDefault()) }
    val formattedDate = remember(entry.timestamp) {
        if (entry.timestamp > 0) dateFormat.format(Date(entry.timestamp)) else "N/A"
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = entry.sender,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formattedDate,
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                    StatusBadge(status = entry.status, httpCode = entry.httpCode)
                }
            }
            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = entry.body,
                color = Color(0xFFCBD5E1),
                fontSize = 13.sp,
                fontFamily = FontFamily.SansSerif
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (entry.httpCode > 0) "HTTP ${entry.httpCode}" else "Awaiting dispatch",
                    color = Color(0xFF64748B),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
                if (entry.status != "SUCCESS") {
                    Button(
                        onClick = onRetry,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Text("Retry Now", color = Color(0xFF38BDF8), fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun Badge(text: String, isSuccess: Boolean) {
    val bgColor = if (isSuccess) Color(0xFF065F46) else Color(0xFF991B1B)
    val textColor = if (isSuccess) Color(0xFF34D399) else Color(0xFFF87171)
    Box(
        modifier = Modifier
            .background(bgColor, shape = RoundedCornerShape(4.dp))
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(text = text, color = textColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun StatusBadge(status: String, httpCode: Int) {
    val (bgColor, textColor) = when (status) {
        "SUCCESS" -> Pair(Color(0xFF065F46), Color(0xFF34D399))
        "PENDING" -> Pair(Color(0xFF78350F), Color(0xFFFBBF24))
        "RETRYING" -> Pair(Color(0xFF1E3A8A), Color(0xFF60A5FA))
        else -> Pair(Color(0xFF991B1B), Color(0xFFF87171))
    }

    Box(
        modifier = Modifier
            .background(bgColor, shape = RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(text = status, color = textColor, fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}
