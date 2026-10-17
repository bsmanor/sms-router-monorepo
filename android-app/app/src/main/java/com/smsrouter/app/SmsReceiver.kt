package com.smsrouter.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import java.util.UUID
import java.util.concurrent.TimeUnit

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent.action) {
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) {
            return
        }

        // Group PDUs by sender in case multi-part SMS arrives together
        val groupedMessages = messages.groupBy { it.displayOriginatingAddress ?: it.originatingAddress ?: "UNKNOWN" }
        val storage = StorageManager.getInstance(context)

        for ((sender, parts) in groupedMessages) {
            val bodyBuilder = StringBuilder()
            var timestamp = System.currentTimeMillis()

            for (part in parts) {
                bodyBuilder.append(part.displayMessageBody ?: part.messageBody ?: "")
                if (part.timestampMillis > 0) {
                    timestamp = part.timestampMillis
                }
            }

            val fullBody = bodyBuilder.toString()
            val logId = UUID.randomUUID().toString()

            val entry = SmsLogEntry(
                id = logId,
                sender = sender,
                body = fullBody,
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
                .putString(SmsForwardWorker.KEY_SENDER, sender)
                .putString(SmsForwardWorker.KEY_BODY, fullBody)
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

            WorkManager.getInstance(context).enqueue(workRequest)
        }
    }
}
