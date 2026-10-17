package com.smsrouter.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit

object SmsIngestCoordinator {
    private const val TAG = "SmsIngestCoordinator"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Central entry point for all 4 capture layers:
     * 1. Static Manifest BroadcastReceiver (BROADCAST)
     * 2. Dynamic Foreground BroadcastReceiver (DYNAMIC_BROADCAST)
     * 3. ContentObserver / Inbox Poller on content://sms/inbox (INBOX)
     * 4. NotificationListenerService for RCS & MIUI Protected OTPs (RCS_NOTIF)
     */
    @Synchronized
    fun ingestAndForward(
        context: Context,
        sender: String,
        body: String,
        timestamp: Long = System.currentTimeMillis(),
        source: String = "BROADCAST",
        skipDeduplication: Boolean = false,
        onComplete: (() -> Unit)? = null
    ) {
        val appContext = context.applicationContext
        val storage = StorageManager.getInstance(appContext)

        val cleanSender = sender.trim().ifEmpty { "UNKNOWN" }
        val cleanBody = body.trim()
        if (cleanBody.isEmpty()) {
            onComplete?.invoke()
            return
        }

        if (!skipDeduplication && storage.isDuplicate(cleanSender, cleanBody, timestamp)) {
            Log.d(TAG, "Ignored duplicate message from $cleanSender via $source")
            onComplete?.invoke()
            return
        }

        val logId = UUID.randomUUID().toString()
        val entry = SmsLogEntry(
            id = logId,
            sender = cleanSender,
            body = cleanBody,
            timestamp = timestamp,
            status = "PENDING",
            httpCode = 0,
            source = source
        )
        storage.addLog(entry)
        Log.i(TAG, "Captured message [$source] from $cleanSender (id=$logId)")

        // Immediate direct HTTP dispatch on IO thread to bypass Xiaomi HyperOS JobScheduler throttling
        scope.launch {
            try {
                val deliveredImmediately = performDirectHttpPost(
                    context = appContext,
                    logId = logId,
                    sender = cleanSender,
                    body = cleanBody,
                    timestamp = timestamp
                )
                if (!deliveredImmediately) {
                    enqueueWorkManagerFallback(
                        context = appContext,
                        logId = logId,
                        sender = cleanSender,
                        body = cleanBody,
                        timestamp = timestamp
                    )
                }
            } finally {
                onComplete?.invoke()
            }
        }
    }

    /**
     * Performs an immediate synchronous HTTP POST to Firebase.
     * Returns true if terminal (2xx or 4xx), false if retry is needed via WorkManager.
     */
    fun performDirectHttpPost(
        context: Context,
        logId: String,
        sender: String,
        body: String,
        timestamp: Long
    ): Boolean {
        val storage = StorageManager.getInstance(context)
        val config = storage.getConfig()

        if (config.endpointUrl.isBlank()) {
            storage.updateLogStatus(logId, "FAILED", 400)
            return true
        }

        val jsonPayload = JSONObject().apply {
            put("sender", sender)
            put("body", body)
            put("timestamp", timestamp)
            put("deviceId", config.deviceId)
        }.toString()

        val hmac = HmacUtils.computeHmacSha256(jsonPayload, config.hmacSecret)
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = jsonPayload.toRequestBody(mediaType)

        val request = Request.Builder()
            .url(config.endpointUrl)
            .addHeader("Content-Type", "application/json")
            .addHeader("X-API-Key", config.apiKey)
            .addHeader("X-Signature", hmac)
            .post(requestBody)
            .build()

        return try {
            httpClient.newCall(request).execute().use { response ->
                val code = response.code
                if (code in 200..299) {
                    storage.updateLogStatus(logId, "SUCCESS", code)
                    true
                } else if (code in 400..499) {
                    storage.updateLogStatus(logId, "FAILED", code)
                    true
                } else {
                    storage.updateLogStatus(logId, "RETRYING", code)
                    false
                }
            }
        } catch (e: IOException) {
            Log.w(TAG, "Direct HTTP POST network error, falling back to WorkManager: ${e.message}")
            storage.updateLogStatus(logId, "RETRYING", 0)
            false
        } catch (e: Exception) {
            Log.e(TAG, "Direct HTTP POST unexpected error: ${e.message}", e)
            storage.updateLogStatus(logId, "FAILED", 0)
            true
        }
    }

    fun enqueueWorkManagerFallback(
        context: Context,
        logId: String,
        sender: String,
        body: String,
        timestamp: Long
    ) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val inputData = Data.Builder()
            .putString(SmsForwardWorker.KEY_LOG_ID, logId)
            .putString(SmsForwardWorker.KEY_SENDER, sender)
            .putString(SmsForwardWorker.KEY_BODY, body)
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

        WorkManager.getInstance(context).enqueue(workRequestBuilder.build())
    }

    /**
     * Queries content://sms/inbox directly for any newly arrived SMS messages.
     * Works even when Xiaomi HyperOS / MIUI suppresses the SMS_RECEIVED broadcast!
     */
    fun scanInboxForNewMessages(context: Context, manualForceLatest: Boolean = false): Int {
        val hasReadSms = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasReadSms) {
            return 0
        }

        val storage = StorageManager.getInstance(context)
        val lastTimestamp = storage.getLastInboxTimestamp()
        var newestSeenTimestamp = lastTimestamp
        var capturedCount = 0

        var cursor: Cursor? = null
        try {
            val inboxUri = Uri.parse("content://sms/inbox")
            val projection = arrayOf("_id", "address", "body", "date")
            val selection = if (manualForceLatest) null else "date > ?"
            val selectionArgs = if (manualForceLatest) null else arrayOf(lastTimestamp.toString())
            val sortOrder = if (manualForceLatest) "date DESC LIMIT 3" else "date ASC"

            cursor = context.contentResolver.query(
                inboxUri,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )

            if (cursor != null && cursor.moveToFirst()) {
                val addressIdx = cursor.getColumnIndex("address")
                val bodyIdx = cursor.getColumnIndex("body")
                val dateIdx = cursor.getColumnIndex("date")

                do {
                    val sender = if (addressIdx >= 0) cursor.getString(addressIdx) ?: "UNKNOWN" else "UNKNOWN"
                    val body = if (bodyIdx >= 0) cursor.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx >= 0) cursor.getLong(dateIdx) else System.currentTimeMillis()

                    if (date > newestSeenTimestamp) {
                        newestSeenTimestamp = date
                    }

                    if (body.isNotBlank() && !storage.isDuplicate(sender, body, date, windowMs = 120_000L)) {
                        capturedCount++
                        ingestAndForward(
                            context = context,
                            sender = sender,
                            body = body,
                            timestamp = date,
                            source = "INBOX_DB",
                            skipDeduplication = true
                        )
                    }
                } while (cursor.moveToNext())
            }

            if (newestSeenTimestamp > lastTimestamp) {
                storage.setLastInboxTimestamp(newestSeenTimestamp)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning SMS inbox database: ${e.message}", e)
        } finally {
            cursor?.close()
        }

        return capturedCount
    }
}
