package com.smsrouter.app

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class SmsForwardWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val KEY_LOG_ID = "log_id"
        const val KEY_SENDER = "sender"
        const val KEY_BODY = "body"
        const val KEY_TIMESTAMP = "timestamp"

        private val httpClient: OkHttpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .build()
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val storage = StorageManager.getInstance(applicationContext)
        val config = storage.getConfig()

        val logId = inputData.getString(KEY_LOG_ID) ?: ""
        var sender = inputData.getString(KEY_SENDER) ?: ""
        var body = inputData.getString(KEY_BODY) ?: ""
        var timestamp = inputData.getLong(KEY_TIMESTAMP, 0L)

        // If data wasn't in inputData, look up from local ring buffer
        if (logId.isNotEmpty() && (sender.isEmpty() || body.isEmpty() || timestamp == 0L)) {
            val existing = storage.getLog(logId)
            if (existing != null) {
                sender = existing.sender
                body = existing.body
                timestamp = existing.timestamp
            }
        }

        if (timestamp == 0L) {
            timestamp = System.currentTimeMillis()
        }

        if (config.endpointUrl.isBlank()) {
            if (logId.isNotEmpty()) {
                storage.updateLogStatus(logId, "FAILED", 400)
            }
            return@withContext Result.failure()
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

        try {
            httpClient.newCall(request).execute().use { response ->
                val code = response.code
                if (code in 200..299) {
                    if (logId.isNotEmpty()) {
                        storage.updateLogStatus(logId, "SUCCESS", code)
                    }
                    Result.success()
                } else if (code in 400..499) {
                    // Client error (e.g. 401 Unauthorized, 400 Bad Request) - do not infinite retry
                    if (logId.isNotEmpty()) {
                        storage.updateLogStatus(logId, "FAILED", code)
                    }
                    Result.failure()
                } else {
                    // Server error 5xx - retry
                    if (logId.isNotEmpty()) {
                        storage.updateLogStatus(logId, "RETRYING", code)
                    }
                    Result.retry()
                }
            }
        } catch (e: IOException) {
            // Network failure or timeout - retry
            if (logId.isNotEmpty()) {
                storage.updateLogStatus(logId, "RETRYING", 0)
            }
            Result.retry()
        } catch (e: Exception) {
            if (logId.isNotEmpty()) {
                storage.updateLogStatus(logId, "FAILED", 0)
            }
            Result.failure()
        }
    }

    override suspend fun getForegroundInfo(): androidx.work.ForegroundInfo {
        val notification = androidx.core.app.NotificationCompat.Builder(
            applicationContext,
            KeepAliveService.CHANNEL_ID
        )
            .setContentTitle("SMS Router")
            .setContentText("Forwarding SMS payload...")
            .setSmallIcon(R.drawable.ic_launcher_vector)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
            .build()
        return androidx.work.ForegroundInfo(1002, notification)
    }
}
