package com.smsrouter.app

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
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
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
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
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkRequest
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.TimeUnit

// Emil Kowalski Design Tokens (Tactile Light Theme)
private val CanvasBackground = Color(0xFFF8FAFC) // Slate 50
private val SurfaceCard = Color(0xFFFFFFFF)       // Pure White
private val SurfaceCardSubtle = Color(0xFFF1F5F9) // Slate 100
private val StrokeSubtle = Color(0xFFE2E8F0)      // Slate 200
private val StrokeHover = Color(0xFFCBD5E1)       // Slate 300
private val TextDark = Color(0xFF0F172A)          // Slate 900
private val TextMuted = Color(0xFF64748B)         // Slate 500
private val TextSubtle = Color(0xFF94A3B8)        // Slate 400
private val AccentPrimary = Color(0xFF0F172A)     // Obsidian Black Button
private val AccentBlue = Color(0xFF2563EB)        // Royal Blue 600

// Status & Indicator Tints (Subtle, desaturated background with sharp text)
private val SuccessBg = Color(0xFFECFDF5)
private val SuccessBorder = Color(0xFFA7F3D0)
private val SuccessText = Color(0xFF065F46)

private val PendingBg = Color(0xFFFEF3C7)
private val PendingBorder = Color(0xFFFDE68A)
private val PendingText = Color(0xFF92400E)

private val RetryingBg = Color(0xFFEFF6FF)
private val RetryingBorder = Color(0xFFBFDBFE)
private val RetryingText = Color(0xFF1E40AF)

private val FailedBg = Color(0xFFFFF1F2)
private val FailedBorder = Color(0xFFFECDD3)
private val FailedText = Color(0xFF9F1239)

class MainActivity : ComponentActivity() {

    private lateinit var storage: StorageManager
    private lateinit var updateManager: UpdateManager
    private val appVersion = "1.0.1"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        storage = StorageManager.getInstance(this)
        updateManager = UpdateManager(this)

        setContent {
            MaterialTheme {
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = CanvasBackground,
                    contentWindowInsets = WindowInsets.safeDrawing
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        ModernAppScreen(
                            storage = storage,
                            updateManager = updateManager,
                            versionName = appVersion,
                            onTriggerBatteryOptimization = { requestIgnoreBatteryOptimization() },
                            onSendTestPayload = { enqueueTestSms() },
                            onRetryItem = { logId -> retryLogItem(logId) }
                        )
                    }
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
                Toast.makeText(this, "Battery optimizations already disabled", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun enqueueTestSms() {
        val testSender = "+1 (555) 839-2041"
        val testBody = "Verification code: 582910. Valid for 10 minutes. Your SMS Router is active."
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

        val workRequestBuilder = OneTimeWorkRequestBuilder<SmsForwardWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .setInputData(inputData)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            workRequestBuilder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
        }

        WorkManager.getInstance(this).enqueue(workRequestBuilder.build())
        Toast.makeText(this, "Test SMS queued for delivery", Toast.LENGTH_SHORT).show()
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

        val workRequestBuilder = OneTimeWorkRequestBuilder<SmsForwardWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .setInputData(inputData)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            workRequestBuilder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
        }

        WorkManager.getInstance(this).enqueue(workRequestBuilder.build())
        Toast.makeText(this, "Retrying payload delivery...", Toast.LENGTH_SHORT).show()
    }
}

enum class NavigationTab {
    CONFIG,
    HEALTH,
    LOGS
}

@Composable
fun ModernAppScreen(
    storage: StorageManager,
    updateManager: UpdateManager,
    versionName: String,
    onTriggerBatteryOptimization: () -> Unit,
    onSendTestPayload: () -> Unit,
    onRetryItem: (String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var selectedTab by remember { mutableStateOf(NavigationTab.CONFIG) }

    var config by remember { mutableStateOf(storage.getConfig()) }
    var logs by remember { mutableStateOf(storage.getLogs()) }

    var endpointUrl by remember { mutableStateOf(config.endpointUrl) }
    var apiKey by remember { mutableStateOf(config.apiKey) }
    var hmacSecret by remember { mutableStateOf(config.hmacSecret) }
    var deviceId by remember { mutableStateOf(config.deviceId) }
    var isKeepAliveEnabled by remember { mutableStateOf(config.isKeepAliveEnabled) }

    var updateStatus by remember { mutableStateOf<UpdateStatus>(UpdateStatus.Idle) }
    var downloadProgress by remember { mutableStateOf(0) }

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
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top App Bar / Brand Header
        item {
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(AccentPrimary, shape = RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "SR",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }

                    Column {
                        Text(
                            text = "SMS Router",
                            color = TextDark,
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = (-0.3).sp
                        )
                        Text(
                            text = "HMAC Signed Gateway",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    }
                }

                // Version Badge with update trigger
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(SurfaceCard)
                        .border(1.dp, StrokeSubtle, RoundedCornerShape(20.dp))
                        .clickable {
                            coroutineScope.launch {
                                updateStatus = UpdateStatus.Checking
                                val res = updateManager.checkForUpdates(versionName)
                                updateStatus = res
                                if (res is UpdateStatus.UpToDate) {
                                    Toast.makeText(context, "You are on the latest version (v$versionName)", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(SuccessText, shape = CircleShape)
                        )
                        Text(
                            text = "v$versionName",
                            color = TextDark,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        // Animated In-App Self Update Notification
        item {
            AnimatedVisibility(
                visible = updateStatus !is UpdateStatus.Idle && updateStatus !is UpdateStatus.UpToDate,
                enter = fadeIn() + slideInVertically(),
                exit = fadeOut() + slideOutVertically()
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = RetryingBg),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, RetryingBorder)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        when (val status = updateStatus) {
                            is UpdateStatus.Checking -> {
                                Text("Checking for new releases on GitHub...", color = RetryingText, fontSize = 13.sp)
                            }
                            is UpdateStatus.UpdateAvailable -> {
                                Text("New Version v${status.versionName} Available", fontWeight = FontWeight.Bold, color = RetryingText, fontSize = 14.sp)
                                Text(status.changelog, color = TextDark, fontSize = 12.sp, modifier = Modifier.padding(vertical = 4.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = {
                                        coroutineScope.launch {
                                            updateStatus = UpdateStatus.Downloading(0)
                                            val res = updateManager.downloadAndInstall(status.downloadUrl) { progress ->
                                                downloadProgress = progress
                                            }
                                            updateStatus = res
                                            if (res is UpdateStatus.ReadyToInstall) {
                                                updateManager.promptInstall(res.apkFile)
                                            }
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = AccentBlue),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Download & Update In-Place", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            is UpdateStatus.Downloading -> {
                                Text("Downloading APK: $downloadProgress%", color = RetryingText, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = downloadProgress / 100f,
                                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                    color = AccentBlue,
                                    trackColor = Color(0xFFDBEAFE)
                                )
                            }
                            is UpdateStatus.ReadyToInstall -> {
                                Text("Update ready to install!", color = SuccessText, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = { updateManager.promptInstall(status.apkFile) },
                                    colors = ButtonDefaults.buttonColors(containerColor = SuccessText),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Tap to Install Update", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            is UpdateStatus.Error -> {
                                Text(status.message, color = FailedText, fontSize = 12.sp)
                            }
                            else -> {}
                        }
                    }
                }
            }
        }

        // Tactile Segmented Navigation Bar (Emil Kowalski style)
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceCardSubtle, shape = RoundedCornerShape(12.dp))
                    .border(1.dp, StrokeSubtle, RoundedCornerShape(12.dp))
                    .padding(3.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    ModernSegmentItem(
                        title = "Gateway",
                        isSelected = selectedTab == NavigationTab.CONFIG,
                        modifier = Modifier.weight(1f),
                        onClick = { selectedTab = NavigationTab.CONFIG }
                    )
                    ModernSegmentItem(
                        title = "Diagnostics",
                        isSelected = selectedTab == NavigationTab.HEALTH,
                        modifier = Modifier.weight(1f),
                        onClick = { selectedTab = NavigationTab.HEALTH }
                    )
                    ModernSegmentItem(
                        title = "Logs (${logs.size})",
                        isSelected = selectedTab == NavigationTab.LOGS,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            selectedTab = NavigationTab.LOGS
                            refreshLogs()
                        }
                    )
                }
            }
        }

        // VIEW 1: GATEWAY CONFIGURATION
        if (selectedTab == NavigationTab.CONFIG) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, StrokeSubtle),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "Gateway Configuration",
                            color = TextDark,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Connects this phone to your Firebase Functions ingest endpoint",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(18.dp))

                        ModernInputField(
                            value = endpointUrl,
                            onValueChange = { endpointUrl = it },
                            label = "Ingest URL",
                            placeholder = "https://<region>-<project>.cloudfunctions.net/ingestSms"
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        ModernInputField(
                            value = apiKey,
                            onValueChange = { apiKey = it },
                            label = "API Key (X-API-Key)",
                            placeholder = "Paste key from Web Admin dashboard"
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        ModernInputField(
                            value = hmacSecret,
                            onValueChange = { hmacSecret = it },
                            label = "HMAC Secret Key (X-Signature)",
                            placeholder = "Secret used to sign raw JSON payload"
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        ModernInputField(
                            value = deviceId,
                            onValueChange = { deviceId = it },
                            label = "Device Name",
                            placeholder = "e.g. Xiaomi-15T-Pro"
                        )
                        Spacer(modifier = Modifier.height(22.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
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
                                    Toast.makeText(context, "Configuration saved", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.weight(1f).height(44.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentPrimary),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Save Settings", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }

                            OutlinedButton(
                                onClick = {
                                    onSendTestPayload()
                                    refreshLogs()
                                },
                                modifier = Modifier.weight(1f).height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, StrokeSubtle),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = SurfaceCardSubtle)
                            ) {
                                Text("Send Test SMS", color = TextDark, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }

        // VIEW 2: SYSTEM HEALTH & PERMISSIONS
        if (selectedTab == NavigationTab.HEALTH) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, StrokeSubtle),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "System Permissions & Battery",
                            color = TextDark,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Ensure 24/7 background cellular message interception",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(18.dp))

                        ModernPermissionItem(
                            title = "RECEIVE_SMS Permission",
                            isGranted = hasSmsPermission,
                            subtitle = "Intercepts incoming cellular SMS broadcasts"
                        )
                        Spacer(modifier = Modifier.height(10.dp))

                        ModernPermissionItem(
                            title = "POST_NOTIFICATIONS",
                            isGranted = hasNotificationPermission,
                            subtitle = "Foreground service notification on Android 13+"
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        if (!hasSmsPermission || !hasNotificationPermission) {
                            Button(
                                onClick = {
                                    val perms = mutableListOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                        perms.add(Manifest.permission.POST_NOTIFICATIONS)
                                    }
                                    permissionLauncher.launch(perms.toTypedArray())
                                },
                                modifier = Modifier.fillMaxWidth().height(42.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PendingText),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Grant Missing Permissions", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        OutlinedButton(
                            onClick = onTriggerBatteryOptimization,
                            modifier = Modifier.fillMaxWidth().height(42.dp),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, StrokeSubtle),
                            colors = ButtonDefaults.outlinedButtonColors(containerColor = SurfaceCardSubtle)
                        ) {
                            Text("Disable Battery Optimization", color = TextDark, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Keep-Alive Service Toggle
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SurfaceCardSubtle, shape = RoundedCornerShape(12.dp))
                                .border(1.dp, StrokeSubtle, RoundedCornerShape(12.dp))
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Foreground Keep-Alive Service", color = TextDark, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text("Prevents HyperOS / OneUI from killing the listener", color = TextMuted, fontSize = 11.sp)
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
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = AccentBlue,
                                    uncheckedThumbColor = Color.White,
                                    uncheckedTrackColor = StrokeHover
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // HyperOS Advice Card
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFEF9C3).copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0xFFFEF08A), RoundedCornerShape(12.dp))
                                .padding(14.dp)
                        ) {
                            Column {
                                Text("Xiaomi HyperOS Notice", fontWeight = FontWeight.Bold, color = Color(0xFF713F12), fontSize = 12.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "• App info -> Enable 'Autostart'\n" +
                                            "• Battery Saver -> Set to 'No Restrictions'\n" +
                                            "• Other permissions -> Allow 'Service SMS' & 'Receive SMS'\n" +
                                            "• Note: RCS chat messages bypass cellular SMS. Use real 2FA texts or disable RCS to test.",
                                    color = Color(0xFF854D0E),
                                    fontSize = 11.sp,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // VIEW 3: SMS QUEUE & LOGS
        if (selectedTab == NavigationTab.LOGS) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Cellular Messages",
                        color = TextDark,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    OutlinedButton(
                        onClick = { refreshLogs() },
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 2.dp),
                        modifier = Modifier.height(30.dp),
                        border = BorderStroke(1.dp, StrokeSubtle)
                    ) {
                        Text("Refresh", fontSize = 11.sp, color = TextDark)
                    }
                }
            }

            if (logs.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, StrokeSubtle)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(36.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("No Intercepted SMS", fontWeight = FontWeight.Bold, color = TextDark, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Incoming messages to your SIM card will appear here and dispatch immediately to Firebase.",
                                color = TextMuted,
                                fontSize = 12.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                items(logs, key = { it.id }) { log ->
                    ModernLogCard(
                        entry = log,
                        onRetry = {
                            onRetryItem(log.id)
                            refreshLogs()
                        }
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun ModernSegmentItem(
    title: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val bg by animateColorAsState(
        targetValue = if (isSelected) SurfaceCard else Color.Transparent,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow)
    )
    val textColor by animateColorAsState(if (isSelected) TextDark else TextMuted)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(9.dp))
            .background(bg)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            color = textColor,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
        )
    }
}

@Composable
fun ModernInputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            color = TextDark,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 6.dp)
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, fontSize = 12.sp, color = TextSubtle) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = SurfaceCard,
                unfocusedContainerColor = SurfaceCard,
                focusedBorderColor = AccentBlue,
                unfocusedBorderColor = StrokeSubtle,
                focusedTextColor = TextDark,
                unfocusedTextColor = TextDark
            )
        )
    }
}

@Composable
fun ModernPermissionItem(title: String, isGranted: Boolean, subtitle: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SurfaceCardSubtle, shape = RoundedCornerShape(10.dp))
            .border(1.dp, StrokeSubtle, RoundedCornerShape(10.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = TextDark, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = TextMuted, fontSize = 11.sp)
        }

        Box(
            modifier = Modifier
                .background(if (isGranted) SuccessBg else FailedBg, shape = RoundedCornerShape(6.dp))
                .border(1.dp, if (isGranted) SuccessBorder else FailedBorder, shape = RoundedCornerShape(6.dp))
                .padding(horizontal = 8.dp, vertical = 3.dp)
        ) {
            Text(
                text = if (isGranted) "GRANTED" else "DENIED",
                color = if (isGranted) SuccessText else FailedText,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun ModernLogCard(entry: SmsLogEntry, onRetry: () -> Unit) {
    val dateFormat = remember { SimpleDateFormat("HH:mm:ss • dd MMM", Locale.getDefault()) }
    val formattedDate = remember(entry.timestamp) {
        if (entry.timestamp > 0) dateFormat.format(Date(entry.timestamp)) else "N/A"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, StrokeSubtle),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = entry.sender,
                    color = TextDark,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formattedDate,
                        color = TextSubtle,
                        fontSize = 11.sp
                    )
                    ModernStatusPill(status = entry.status, httpCode = entry.httpCode)
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = entry.body,
                color = Color(0xFF334155),
                fontSize = 12.sp,
                lineHeight = 17.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (entry.httpCode > 0) "Status: HTTP ${entry.httpCode}" else "Pending delivery",
                    color = TextSubtle,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )

                if (entry.status != "SUCCESS") {
                    OutlinedButton(
                        onClick = onRetry,
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(26.dp),
                        border = BorderStroke(1.dp, StrokeSubtle)
                    ) {
                        Text("Retry", color = AccentBlue, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
fun ModernStatusPill(status: String, httpCode: Int) {
    val (bg, border, text) = when (status) {
        "SUCCESS" -> Triple(SuccessBg, SuccessBorder, SuccessText)
        "PENDING" -> Triple(PendingBg, PendingBorder, PendingText)
        "RETRYING" -> Triple(RetryingBg, RetryingBorder, RetryingText)
        else -> Triple(FailedBg, FailedBorder, FailedText)
    }

    Box(
        modifier = Modifier
            .background(bg, shape = RoundedCornerShape(6.dp))
            .border(1.dp, border, RoundedCornerShape(6.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(text = status, color = text, fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}
