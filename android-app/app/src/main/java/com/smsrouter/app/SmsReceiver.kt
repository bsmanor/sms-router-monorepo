package com.smsrouter.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import java.util.concurrent.atomic.AtomicInteger

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action
        Log.d(TAG, "onReceive triggered with action: $action")

        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != action &&
            Telephony.Sms.Intents.SMS_DELIVER_ACTION != action
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
            Log.w(TAG, "No SMS messages found in intent extras, triggering inbox scan")
            SmsIngestCoordinator.scanInboxForNewMessages(context)
            return
        }

        // 2. Group PDUs by sender in case multi-part SMS arrives together
        val groupedMessages = messages.groupBy {
            it.displayOriginatingAddress ?: it.originatingAddress ?: "UNKNOWN"
        }

        val pendingResult = try {
            goAsync()
        } catch (e: Exception) {
            null
        }
        val remaining = AtomicInteger(groupedMessages.size)

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

            SmsIngestCoordinator.ingestAndForward(
                context = context,
                sender = sender,
                body = fullBody,
                timestamp = timestamp,
                source = "BROADCAST",
                onComplete = {
                    if (remaining.decrementAndGet() <= 0) {
                        try {
                            pendingResult?.finish()
                        } catch (_: Exception) {
                        }
                    }
                }
            )
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
