package com.smsrouter.app

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Layer 4 Capture: Intercepts incoming SMS & RCS Chat notifications from Google Messages,
 * Xiaomi Messaging, and Samsung Messages.
 * This catches RCS messages (which bypass cellular SMS_RECEIVED and content://sms)
 * as well as Xiaomi HyperOS protected verification messages!
 */
class SmsNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "SmsNotificationListener"

        private val MESSAGING_PACKAGES = setOf(
            "com.google.android.apps.messaging", // Google Messages (SMS + RCS)
            "com.android.mms",                   // Xiaomi / AOSP Messaging
            "com.miui.smsextra",                 // Xiaomi MIUI SMS Extra
            "com.samsung.android.messaging",     // Samsung Messages
            "com.android.messaging"
        )

        fun isNotificationAccessEnabled(context: Context): Boolean {
            return try {
                val flat = Settings.Secure.getString(
                    context.contentResolver,
                    "enabled_notification_listeners"
                ) ?: return false
                val cn = ComponentName(context, SmsNotificationListener::class.java)
                flat.contains(cn.flattenToString()) || flat.contains(context.packageName)
            } catch (e: Exception) {
                false
            }
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return

        if (pkg !in MESSAGING_PACKAGES) {
            return
        }

        val notification = sbn.notification ?: return

        // Ignore ongoing notifications or group summaries to avoid duplicates
        if ((notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) return
        if ((notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return

        val extras = notification.extras ?: return
        val sender = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: return

        val body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: return

        // Ignore generic system status prompts from the messaging app
        val lowerBody = body.lowercase()
        if (lowerBody.contains("doing work in the background") ||
            lowerBody.contains("messages is doing work") ||
            lowerBody.contains("new messages")
        ) {
            return
        }

        Log.i(TAG, "Captured messaging notification from $pkg: sender=$sender")
        SmsIngestCoordinator.ingestAndForward(
            context = applicationContext,
            sender = sender,
            body = body,
            timestamp = sbn.postTime.takeIf { it > 0 } ?: System.currentTimeMillis(),
            source = "RCS_NOTIF"
        )
    }
}
