package com.smsrouter.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkRequest
import java.util.UUID
import java.util.concurrent.TimeUnit

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action
        Log.d(TAG, "onReceive triggered with action: $action")

        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != action &&
            Telephony.Sms.Intents.SMS_DELIVER_ACTION != action &&
            Telephony.Sms.Intents.DATA_SMS_RECEIVED_ACTION != action
        ) {
            return
        }

        // 1. Extract SMS Messages with fallback
        val messages: Array<SmsMessage>? = try {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing messages via Telephony intent helper", e)
            null
        } ?: extractMessagesFallback(intent)

        if (messages.isNullOrEmpty()) {
            Log.w(TAG, "No SMS messages found in intent extras")
            return
        }

        // 2. Group PDUs by sender in case multi-part SMS arrives together
        val groupedMessages = messages.groupBy {
            it.displayOriginatingAddress ?: it.originatingAddress ?: "UNKNOWN"
        }
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

            Log.i(TAG, "Intercepted SMS from $sender: ${fullBody.take(40)}...")

            // 3. Save pending entry to local storage
            val entry = SmsLogEntry(
                id = logId,
                sender = sender,
                body = fullBody,
                timestamp = timestamp,
                status = "PENDING",
                httpCode = 0
            )
            storage.addLog(entry)

            // 4. Enqueue expedited forward worker
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val inputData = Data.Builder()
                .putString(SmsForwardWorker.KEY_LOG_ID, logId)
                .putString(SmsForwardWorker.KEY_SENDER, sender)
                .putString(SmsForwardWorker.KEY_BODY, fullBody)
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

            // Make work expedited so Android doesn't defer execution
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                workRequestBuilder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            }

            val workRequest = workRequestBuilder.build()
            WorkManager.getInstance(context).enqueue(workRequest)
        }
    }

    private fun extractMessagesFallback(intent: Intent): Array<SmsMessage>? {
        return try {
            val bundle = intent.extras ?: return null
            val pdus = bundle.get("pdus") as? Array<*> ?: return null
            val format = bundle.getString("format")
            val list = mutableListOf<SmsMessage>()
            for (pdu in pdus) {
                if (pdu is ByteArray) {
                    val msg = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && format != null) {
                        SmsMessage.createFromPdu(pdu, format)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsMessage.createFromPdu(pdu)
                    }
                    if (msg != null) list.add(msg)
                }
            }
            if (list.isNotEmpty()) list.toTypedArray() else null
        } catch (e: Exception) {
            Log.e(TAG, "Fallback PDU extraction failed", e)
            null
        }
    }
}
