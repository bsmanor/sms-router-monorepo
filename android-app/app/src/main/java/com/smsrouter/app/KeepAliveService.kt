package com.smsrouter.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Telephony
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class KeepAliveService : Service() {

    companion object {
        private const val TAG = "KeepAliveService"
        const val CHANNEL_ID = "sms_router_keep_alive"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.smsrouter.app.ACTION_START_KEEP_ALIVE"
        const val ACTION_STOP = "com.smsrouter.app.ACTION_STOP_KEEP_ALIVE"

        fun startService(context: Context) {
            try {
                val intent = Intent(context, KeepAliveService::class.java).apply {
                    action = ACTION_START
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start KeepAliveService", e)
            }
        }

        fun stopService(context: Context) {
            try {
                val intent = Intent(context, KeepAliveService::class.java).apply {
                    action = ACTION_STOP
                }
                context.startService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop KeepAliveService", e)
            }
        }
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var dynamicSmsReceiver: SmsReceiver? = null
    private var smsContentObserver: ContentObserver? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        registerDynamicBroadcastReceiver()
        registerSmsDatabaseObserver()
        startPeriodicInboxScanner()
    }

    private fun registerDynamicBroadcastReceiver() {
        try {
            val receiver = SmsReceiver()
            val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION).apply {
                priority = 999
            }
            ContextCompat.registerReceiver(
                this,
                receiver,
                filter,
                ContextCompat.RECEIVER_EXPORTED
            )
            dynamicSmsReceiver = receiver
            Log.i(TAG, "Dynamic SmsReceiver registered with priority 999")
        } catch (e: Exception) {
            Log.e(TAG, "Error registering dynamic SmsReceiver", e)
        }
    }

    private fun registerSmsDatabaseObserver() {
        try {
            val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
                override fun onChange(selfChange: Boolean, uri: Uri?) {
                    super.onChange(selfChange, uri)
                    serviceScope.launch {
                        delay(400) // Allow provider transaction to commit
                        SmsIngestCoordinator.scanInboxForNewMessages(applicationContext)
                    }
                }
            }
            contentResolver.registerContentObserver(
                Uri.parse("content://sms"),
                true,
                observer
            )
            smsContentObserver = observer
            Log.i(TAG, "Registered ContentObserver on content://sms")
        } catch (e: Exception) {
            Log.e(TAG, "Error registering ContentObserver on content://sms", e)
        }
    }

    private fun startPeriodicInboxScanner() {
        serviceScope.launch {
            // Initialize watermark on startup
            StorageManager.getInstance(applicationContext).getLastInboxTimestamp()
            while (isActive) {
                try {
                    SmsIngestCoordinator.scanInboxForNewMessages(applicationContext)
                } catch (e: Exception) {
                    Log.e(TAG, "Periodic inbox scan error", e)
                }
                delay(4000L)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = buildForegroundNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        try {
            dynamicSmsReceiver?.let { unregisterReceiver(it) }
        } catch (_: Exception) {}
        try {
            smsContentObserver?.let { contentResolver.unregisterContentObserver(it) }
        } catch (_: Exception) {}
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SMS Router Multi-Layer Engine",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains 4-layer SMS/RCS interception against Xiaomi HyperOS restrictions"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS Router Active (4-Layer Engine)")
            .setContentText("Monitoring Broadcasts, Inbox DB & Messaging Notifications")
            .setSmallIcon(R.drawable.ic_launcher_vector)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }
}
