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
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountTree
import androidx.compose.material.icons.filled.CellTower
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.smsrouter.app.ui.components.AppStatusBadge
import com.smsrouter.app.ui.screens.ArchitectureScreen
import com.smsrouter.app.ui.screens.CaptureEngineScreen
import com.smsrouter.app.ui.screens.GatewayConfigScreen
import com.smsrouter.app.ui.screens.OverviewScreen
import com.smsrouter.app.ui.theme.AppTheme
import com.smsrouter.app.ui.theme.SmsRouterTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class AppNavTab(val title: String, val icon: ImageVector) {
    OVERVIEW("Overview", Icons.Filled.Dashboard),
    CAPTURE("Capture", Icons.Filled.CellTower),
    CONFIG("Config", Icons.Filled.Settings),
    ARCHITECTURE("Architecture", Icons.Filled.AccountTree)
}

class MainActivity : ComponentActivity() {

    private lateinit var storage: StorageManager
    private lateinit var updateManager: UpdateManager
    private val appVersion = "2.0.0"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        storage = StorageManager.getInstance(this)
        updateManager = UpdateManager(this)

        storage.getLastInboxTimestamp()
        if (storage.getConfig().isKeepAliveEnabled) {
            KeepAliveService.startService(this)
        }

        setContent {
            SmsRouterTheme {
                MainAppShell(
                    storage = storage,
                    updateManager = updateManager,
                    versionName = appVersion,
                    onTriggerBatteryOptimization = { requestIgnoreBatteryOptimization() },
                    onOpenNotificationAccess = { openNotificationListenerSettings() },
                    onOpenAppSettings = { openAppSettings() },
                    onSendTestPayload = { enqueueTestSms() },
                    onRetryItem = { logId -> retryLogItem(logId) }
                )
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

    private fun openNotificationListenerSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            startActivity(intent)
            Toast.makeText(
                this,
                "Enable 'SMS Router' to capture RCS & MIUI-protected OTPs",
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Unable to open Notification Access settings", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openAppSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        } catch (_: Exception) {}
    }

    private fun enqueueTestSms() {
        val testSender = "+1 (555) 839-2041"
        val testBody = "Verification code: 582910. Valid for 10 minutes. Multi-Layer v2.0.0 Active."
        val timestamp = System.currentTimeMillis()

        SmsIngestCoordinator.ingestAndForward(
            context = applicationContext,
            sender = testSender,
            body = testBody,
            timestamp = timestamp,
            source = "TEST",
            skipDeduplication = true
        )
        Toast.makeText(this, "Test SMS dispatched via direct HTTP engine", Toast.LENGTH_SHORT).show()
    }

    private fun retryLogItem(logId: String) {
        val entry = storage.getLog(logId) ?: return
        SmsIngestCoordinator.ingestAndForward(
            context = applicationContext,
            sender = entry.sender,
            body = entry.body,
            timestamp = entry.timestamp,
            source = entry.source,
            skipDeduplication = true
        )
        Toast.makeText(this, "Retrying direct HTTP delivery...", Toast.LENGTH_SHORT).show()
    }
}

@Composable
fun MainAppShell(
    storage: StorageManager,
    updateManager: UpdateManager,
    versionName: String,
    onTriggerBatteryOptimization: () -> Unit,
    onOpenNotificationAccess: () -> Unit,
    onOpenAppSettings: () -> Unit,
    onSendTestPayload: () -> Unit,
    onRetryItem: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()
    var selectedTab by remember { mutableStateOf(AppNavTab.OVERVIEW) }

    var config by remember { mutableStateOf(storage.getConfig()) }
    var logs by remember { mutableStateOf(storage.getLogs()) }
    var updateStatus by remember { mutableStateOf<UpdateStatus>(UpdateStatus.Idle) }
    var downloadProgress by remember { mutableStateOf(0) }

    fun checkReceiveSms(): Boolean = ContextCompat.checkSelfPermission(
        context, Manifest.permission.RECEIVE_SMS
    ) == PackageManager.PERMISSION_GRANTED

    fun checkReadSms(): Boolean = ContextCompat.checkSelfPermission(
        context, Manifest.permission.READ_SMS
    ) == PackageManager.PERMISSION_GRANTED

    fun checkPostNotif(): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        ContextCompat.checkSelfPermission(
            context, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    } else true

    var hasReceiveSms by remember { mutableStateOf(checkReceiveSms()) }
    var hasReadSms by remember { mutableStateOf(checkReadSms()) }
    var hasNotificationPermission by remember { mutableStateOf(checkPostNotif()) }
    var hasNotificationAccess by remember {
        mutableStateOf(SmsNotificationListener.isNotificationAccessEnabled(context))
    }
    var isKeepAliveEnabled by remember { mutableStateOf(config.isKeepAliveEnabled) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                hasReceiveSms = checkReceiveSms()
                hasReadSms = checkReadSms()
                hasNotificationPermission = checkPostNotif()
                hasNotificationAccess = SmsNotificationListener.isNotificationAccessEnabled(context)
                logs = storage.getLogs()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(2500L)
            logs = storage.getLogs()
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        hasReceiveSms = results[Manifest.permission.RECEIVE_SMS] ?: checkReceiveSms()
        hasReadSms = results[Manifest.permission.READ_SMS] ?: checkReadSms()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasNotificationPermission = results[Manifest.permission.POST_NOTIFICATIONS] ?: checkPostNotif()
        }
    }

    val refreshLogs = { logs = storage.getLogs() }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = AppTheme.colors.canvas,
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            // Persistent Top Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppTheme.colors.surface)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(AppTheme.colors.actionPrimary, shape = RoundedCornerShape(AppTheme.radius.sm)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("SR", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("SMS Router", color = AppTheme.colors.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("v$versionName Gateway", color = AppTheme.colors.textMuted, fontSize = 10.sp)
                    }
                }

                AppStatusBadge(
                    text = if (hasReceiveSms && hasNotificationAccess) "READY (4/4)" else "ATTN NEEDED",
                    tone = if (hasReceiveSms && hasNotificationAccess) AppTheme.colors.success else AppTheme.colors.warning
                )
            }
        },
        bottomBar = {
            // Modern Material 3 Bottom Navigation Bar
            NavigationBar(
                containerColor = AppTheme.colors.surface,
                contentColor = AppTheme.colors.textPrimary,
                tonalElevation = 4.dp
            ) {
                AppNavTab.values().forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = {
                            selectedTab = tab
                            refreshLogs()
                        },
                        icon = {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.title,
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        label = {
                            Text(
                                text = tab.title,
                                fontSize = 11.sp,
                                fontWeight = if (selectedTab == tab) FontWeight.Bold else FontWeight.Medium
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AppTheme.colors.brandAccent,
                            selectedTextColor = AppTheme.colors.brandAccent,
                            unselectedIconColor = AppTheme.colors.textMuted,
                            unselectedTextColor = AppTheme.colors.textMuted,
                            indicatorColor = AppTheme.colors.brandAccentSubtle
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (selectedTab) {
                AppNavTab.OVERVIEW -> OverviewScreen(
                    logs = logs,
                    hasSmsPermission = hasReceiveSms,
                    hasNotificationListener = hasNotificationAccess,
                    onSendTestSms = {
                        onSendTestPayload()
                        refreshLogs()
                    },
                    onSyncInbox = {
                        coroutineScope.launch {
                            SmsIngestCoordinator.scanInboxForNewMessages(context.applicationContext, manualForceLatest = true)
                            refreshLogs()
                            Toast.makeText(context, "Inbox DB scanned", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onRetryLog = { logId ->
                        onRetryItem(logId)
                        refreshLogs()
                    }
                )
                AppNavTab.CAPTURE -> CaptureEngineScreen(
                    hasReceiveSms = hasReceiveSms,
                    hasReadSms = hasReadSms,
                    hasNotificationAccess = hasNotificationAccess,
                    hasPostNotification = hasNotificationPermission,
                    isKeepAliveActive = isKeepAliveEnabled,
                    onToggleKeepAlive = { active ->
                        isKeepAliveEnabled = active
                        storage.setKeepAliveEnabled(active)
                        if (active) KeepAliveService.startService(context) else KeepAliveService.stopService(context)
                    },
                    onRequestPermissions = {
                        val perms = mutableListOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            perms.add(Manifest.permission.POST_NOTIFICATIONS)
                        }
                        permissionLauncher.launch(perms.toTypedArray())
                    },
                    onOpenNotificationSettings = onOpenNotificationAccess,
                    onDisableBatteryOpt = onTriggerBatteryOptimization,
                    onOpenAppSettings = onOpenAppSettings
                )
                AppNavTab.CONFIG -> GatewayConfigScreen(
                    config = config,
                    installedVersion = versionName,
                    updateStatus = updateStatus,
                    downloadProgress = downloadProgress,
                    onSaveConfig = { newCfg ->
                        storage.saveConfig(newCfg)
                        config = newCfg
                        Toast.makeText(context, "Credentials saved", Toast.LENGTH_SHORT).show()
                    },
                    onSendTestSms = {
                        onSendTestPayload()
                        refreshLogs()
                    },
                    onCheckUpdate = {
                        coroutineScope.launch {
                            updateStatus = UpdateStatus.Checking
                            val res = updateManager.checkForUpdates(versionName)
                            updateStatus = res
                            if (res is UpdateStatus.UpToDate) {
                                Toast.makeText(context, "App is up to date (v$versionName)", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    onDownloadUpdate = { downloadUrl ->
                        coroutineScope.launch {
                            updateStatus = UpdateStatus.Downloading(0)
                            val res = updateManager.downloadAndInstall(downloadUrl) { progress ->
                                downloadProgress = progress
                            }
                            updateStatus = res
                            if (res is UpdateStatus.ReadyToInstall) {
                                updateManager.promptInstall(res.apkFile)
                            }
                        }
                    },
                    onPromptInstall = { apkFile ->
                        updateManager.promptInstall(apkFile)
                    }
                )
                AppNavTab.ARCHITECTURE -> ArchitectureScreen()
            }
        }
    }
}
