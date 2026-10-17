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
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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

// 100% FORCED BRIGHT LIGHT THEME TOKENS (Emil Kowalski Style)
private val BrightBgCanvas = Color(0xFFF8FAFC)       // Crisp clean off-white
private val PureWhite = Color(0xFFFFFFFF)            // Pure snow white
private val BrightSurfaceSubtle = Color(0xFFF1F5F9)  // Soft slate container
private val BrightBorder = Color(0xFFE2E8F0)         // Subtle 1px outline
private val BrightBorderFocus = Color(0xFF2563EB)    // Vibrant Blue
private val BrightTextTitle = Color(0xFF0F172A)      // High contrast deep obsidian
private val BrightTextBody = Color(0xFF1E293B)       // Sharp legible text
private val BrightTextMuted = Color(0xFF64748B)      // Calm secondary
private val BrightTextPlaceholder = Color(0xFF94A3B8)
private val PrimaryButtonColor = Color(0xFF0F172A)   // Emil signature black button
private val PrimaryButtonText = Color(0xFFFFFFFF)

// Soft Status Badge Tints
private val MintBg = Color(0xFFECFDF5)
private val MintBorder = Color(0xFFA7F3D0)
private val MintText = Color(0xFF047857)

private val AmberBg = Color(0xFFFEF3C7)
private val AmberBorder = Color(0xFFFDE68A)
private val AmberText = Color(0xFFB45309)

private val BlueBg = Color(0xFFEFF6FF)
private val BlueBorder = Color(0xFFBFDBFE)
private val BlueText = Color(0xFF1D4ED8)

private val RoseBg = Color(0xFFFFF1F2)
private val RoseBorder = Color(0xFFFECDD3)
private val RoseText = Color(0xFFBE123C)

// Explicit Material 3 Light Color Scheme (Overrides system dark mode)
private val ForcedLightColorScheme = lightColorScheme(
    primary = PrimaryButtonColor,
    onPrimary = PrimaryButtonText,
    primaryContainer = BrightSurfaceSubtle,
    onPrimaryContainer = BrightTextTitle,
    secondary = Color(0xFF2563EB),
    onSecondary = Color.White,
    background = BrightBgCanvas,
    onBackground = BrightTextTitle,
    surface = PureWhite,
    onSurface = BrightTextTitle,
    surfaceVariant = BrightSurfaceSubtle,
    onSurfaceVariant = BrightTextMuted,
    outline = BrightBorder,
    outlineVariant = Color(0xFFF1F5F9)
)

class MainActivity : ComponentActivity() {

    private lateinit var storage: StorageManager
    private lateinit var updateManager: UpdateManager
    private val appVersion = "1.0.2"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        storage = StorageManager.getInstance(this)
        updateManager = UpdateManager(this)

        setContent {
            // Strictly enforce light color scheme
            MaterialTheme(colorScheme = ForcedLightColorScheme) {
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    containerColor = BrightBgCanvas,
                    contentWindowInsets = WindowInsets.safeDrawing
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(BrightBgCanvas)
                            .padding(innerPadding)
                    ) {
                        BrightAppScreen(
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

enum class BrightTab {
    CONFIG,
    HEALTH,
    LOGS
}

@Composable
fun BrightAppScreen(
    storage: StorageManager,
    updateManager: UpdateManager,
    versionName: String,
    onTriggerBatteryOptimization: () -> Unit,
    onSendTestPayload: () -> Unit,
    onRetryItem: (String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var selectedTab by remember { mutableStateOf(BrightTab.CONFIG) }

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
            .background(BrightBgCanvas)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // PROMINENT APP VERSION & STATUS HERO CARD
        item {
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = PureWhite),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, BrightBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(PrimaryButtonColor, shape = RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("SR", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Column {
                                Text(
                                    text = "SMS Router Gateway",
                                    color = BrightTextTitle,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = (-0.3).sp
                                )
                                Text(
                                    text = "HMAC Signed SMS Interceptor",
                                    color = BrightTextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        // PROMINENT INSTALLED VERSION BADGE
                        Box(
                            modifier = Modifier
                                .background(MintBg, shape = RoundedCornerShape(8.dp))
                                .border(1.dp, MintBorder, shape = RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .background(MintText, shape = CircleShape)
                                )
                                Text(
                                    text = "v$versionName",
                                    color = MintText,
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // ONE-CLICK IN-APP UPDATE ACTION ROW
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(BrightSurfaceSubtle, shape = RoundedCornerShape(10.dp))
                            .border(1.dp, BrightBorder, RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "In-App Self Updater",
                                color = BrightTextTitle,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Installs new updates directly without downloading files",
                                color = BrightTextMuted,
                                fontSize = 11.sp
                            )
                        }

                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    updateStatus = UpdateStatus.Checking
                                    val res = updateManager.checkForUpdates(versionName)
                                    updateStatus = res
                                    if (res is UpdateStatus.UpToDate) {
                                        Toast.makeText(context, "App is already up to date (v$versionName)", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = PureWhite),
                            border = BorderStroke(1.dp, BrightBorder),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text("Check Update", color = BrightTextTitle, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // IN-APP AUTO-UPDATE BANNER (Appears when new version is available)
        item {
            AnimatedVisibility(
                visible = updateStatus !is UpdateStatus.Idle && updateStatus !is UpdateStatus.UpToDate,
                enter = fadeIn() + slideInVertically(),
                exit = fadeOut() + slideOutVertically()
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = PureWhite),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.5.dp, Color(0xFF3B82F6)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        when (val status = updateStatus) {
                            is UpdateStatus.Checking -> {
                                Text("Connecting to GitHub to verify releases...", color = BrightTextBody, fontSize = 13.sp)
                            }
                            is UpdateStatus.UpdateAvailable -> {
                                Text("New Version v${status.versionName} Ready to Install", fontWeight = FontWeight.Bold, color = Color(0xFF1D4ED8), fontSize = 14.sp)
                                Text(status.changelog, color = BrightTextBody, fontSize = 12.sp, modifier = Modifier.padding(vertical = 4.dp))
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
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Download & Update In-Place", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            is UpdateStatus.Downloading -> {
                                Text("Downloading Update: $downloadProgress%", color = Color(0xFF1D4ED8), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = downloadProgress / 100f,
                                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                    color = Color(0xFF2563EB),
                                    trackColor = Color(0xFFDBEAFE)
                                )
                            }
                            is UpdateStatus.ReadyToInstall -> {
                                Text("Download complete! Ready to update.", color = MintText, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = { updateManager.promptInstall(status.apkFile) },
                                    colors = ButtonDefaults.buttonColors(containerColor = MintText),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Tap to Install Now", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            is UpdateStatus.Error -> {
                                Text(status.message, color = RoseText, fontSize = 12.sp)
                            }
                            else -> {}
                        }
                    }
                }
            }
        }

        // TACTILE SEGMENTED NAVIGATION PILLS (Emil Kowalski Style)
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PureWhite, shape = RoundedCornerShape(12.dp))
                    .border(1.dp, BrightBorder, RoundedCornerShape(12.dp))
                    .padding(3.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    BrightSegmentItem(
                        title = "Gateway Setup",
                        isSelected = selectedTab == BrightTab.CONFIG,
                        modifier = Modifier.weight(1f),
                        onClick = { selectedTab = BrightTab.CONFIG }
                    )
                    BrightSegmentItem(
                        title = "Diagnostics",
                        isSelected = selectedTab == BrightTab.HEALTH,
                        modifier = Modifier.weight(1f),
                        onClick = { selectedTab = BrightTab.HEALTH }
                    )
                    BrightSegmentItem(
                        title = "Logs (${logs.size})",
                        isSelected = selectedTab == BrightTab.LOGS,
                        modifier = Modifier.weight(1f),
                        onClick = {
                            selectedTab = BrightTab.LOGS
                            refreshLogs()
                        }
                    )
                }
            }
        }

        // TAB 1: GATEWAY CONFIGURATION
        if (selectedTab == BrightTab.CONFIG) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = PureWhite),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, BrightBorder),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "Server Configuration",
                            color = BrightTextTitle,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Configures HTTP POST delivery to your Cloud Function",
                            color = BrightTextMuted,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(18.dp))

                        BrightInputField(
                            value = endpointUrl,
                            onValueChange = { endpointUrl = it },
                            label = "Webhook Ingest URL",
                            placeholder = "https://<region>-<project>.cloudfunctions.net/ingestSms"
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        BrightInputField(
                            value = apiKey,
                            onValueChange = { apiKey = it },
                            label = "API Key (X-API-Key)",
                            placeholder = "Paste key from Web Admin dashboard"
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        BrightInputField(
                            value = hmacSecret,
                            onValueChange = { hmacSecret = it },
                            label = "HMAC Secret (X-Signature)",
                            placeholder = "Cryptographic secret for SHA-256 signing"
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        BrightInputField(
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
                                    Toast.makeText(context, "Settings saved", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.weight(1f).height(44.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryButtonColor),
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
                                border = BorderStroke(1.dp, BrightBorder),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = BrightSurfaceSubtle)
                            ) {
                                Text("Send Test SMS", color = BrightTextTitle, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }

        // TAB 2: SYSTEM HEALTH & PERMISSIONS
        if (selectedTab == BrightTab.HEALTH) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = PureWhite),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, BrightBorder),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "Permission & Battery Health",
                            color = BrightTextTitle,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Ensures background cellular SMS broadcasts are not blocked",
                            color = BrightTextMuted,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(18.dp))

                        BrightPermissionItem(
                            title = "RECEIVE_SMS Permission",
                            isGranted = hasSmsPermission,
                            subtitle = "Intercepts cellular SMS broadcasts"
                        )
                        Spacer(modifier = Modifier.height(10.dp))

                        BrightPermissionItem(
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
                                colors = ButtonDefaults.buttonColors(containerColor = AmberText),
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
                            border = BorderStroke(1.dp, BrightBorder),
                            colors = ButtonDefaults.outlinedButtonColors(containerColor = BrightSurfaceSubtle)
                        ) {
                            Text("Disable Battery Optimization", color = BrightTextTitle, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Keep-Alive Service Switch
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(BrightSurfaceSubtle, shape = RoundedCornerShape(12.dp))
                                .border(1.dp, BrightBorder, RoundedCornerShape(12.dp))
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Foreground Keep-Alive Service", color = BrightTextTitle, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text("Prevents HyperOS / OneUI from killing the listener", color = BrightTextMuted, fontSize = 11.sp)
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
                                    checkedThumbColor = PureWhite,
                                    checkedTrackColor = Color(0xFF2563EB),
                                    uncheckedThumbColor = PureWhite,
                                    uncheckedTrackColor = Color(0xFFCBD5E1)
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Xiaomi HyperOS Notice
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFEF9C3).copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0xFFFEF08A), RoundedCornerShape(12.dp))
                                .padding(14.dp)
                        ) {
                            Column {
                                Text("Xiaomi HyperOS Directives", fontWeight = FontWeight.Bold, color = Color(0xFF713F12), fontSize = 12.sp)
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

        // TAB 3: SMS QUEUE & LOGS
        if (selectedTab == BrightTab.LOGS) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Cellular Messages",
                        color = BrightTextTitle,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    OutlinedButton(
                        onClick = { refreshLogs() },
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 2.dp),
                        modifier = Modifier.height(30.dp),
                        border = BorderStroke(1.dp, BrightBorder),
                        colors = ButtonDefaults.outlinedButtonColors(containerColor = PureWhite)
                    ) {
                        Text("Refresh", fontSize = 11.sp, color = BrightTextTitle)
                    }
                }
            }

            if (logs.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = PureWhite),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, BrightBorder)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(36.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("No Intercepted SMS", fontWeight = FontWeight.Bold, color = BrightTextTitle, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Incoming messages to your SIM card will appear here and dispatch immediately to Firebase.",
                                color = BrightTextMuted,
                                fontSize = 12.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                items(logs, key = { it.id }) { log ->
                    BrightLogCard(
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
fun BrightSegmentItem(
    title: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val bg by animateColorAsState(
        targetValue = if (isSelected) PrimaryButtonColor else Color.Transparent,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow)
    )
    val textColor by animateColorAsState(if (isSelected) Color.White else BrightTextMuted)

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
fun BrightInputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            color = BrightTextTitle,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 6.dp)
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, fontSize = 12.sp, color = BrightTextPlaceholder) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = PureWhite,
                unfocusedContainerColor = PureWhite,
                focusedBorderColor = BrightBorderFocus,
                unfocusedBorderColor = BrightBorder,
                focusedTextColor = BrightTextBody,
                unfocusedTextColor = BrightTextBody
            )
        )
    }
}

@Composable
fun BrightPermissionItem(title: String, isGranted: Boolean, subtitle: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BrightSurfaceSubtle, shape = RoundedCornerShape(10.dp))
            .border(1.dp, BrightBorder, RoundedCornerShape(10.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = BrightTextTitle, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = BrightTextMuted, fontSize = 11.sp)
        }

        Box(
            modifier = Modifier
                .background(if (isGranted) MintBg else RoseBg, shape = RoundedCornerShape(6.dp))
                .border(1.dp, if (isGranted) MintBorder else RoseBorder, shape = RoundedCornerShape(6.dp))
                .padding(horizontal = 8.dp, vertical = 3.dp)
        ) {
            Text(
                text = if (isGranted) "GRANTED" else "DENIED",
                color = if (isGranted) MintText else RoseText,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun BrightLogCard(entry: SmsLogEntry, onRetry: () -> Unit) {
    val dateFormat = remember { SimpleDateFormat("HH:mm:ss • dd MMM", Locale.getDefault()) }
    val formattedDate = remember(entry.timestamp) {
        if (entry.timestamp > 0) dateFormat.format(Date(entry.timestamp)) else "N/A"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PureWhite),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, BrightBorder),
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
                    color = BrightTextTitle,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formattedDate,
                        color = BrightTextMuted,
                        fontSize = 11.sp
                    )
                    BrightStatusPill(status = entry.status, httpCode = entry.httpCode)
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = entry.body,
                color = BrightTextBody,
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
                    color = BrightTextMuted,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )

                if (entry.status != "SUCCESS") {
                    OutlinedButton(
                        onClick = onRetry,
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(26.dp),
                        border = BorderStroke(1.dp, BrightBorder),
                        colors = ButtonDefaults.outlinedButtonColors(containerColor = BrightSurfaceSubtle)
                    ) {
                        Text("Retry", color = Color(0xFF2563EB), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
fun BrightStatusPill(status: String, httpCode: Int) {
    val (bg, border, text) = when (status) {
        "SUCCESS" -> Triple(MintBg, MintBorder, MintText)
        "PENDING" -> Triple(AmberBg, AmberBorder, AmberText)
        "RETRYING" -> Triple(BlueBg, BlueBorder, BlueText)
        else -> Triple(RoseBg, RoseBorder, RoseText)
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
