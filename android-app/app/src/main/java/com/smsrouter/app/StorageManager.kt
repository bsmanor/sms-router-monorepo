package com.smsrouter.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class AppConfig(
    val endpointUrl: String = "",
    val apiKey: String = "",
    val hmacSecret: String = "",
    val deviceId: String = "",
    val isKeepAliveEnabled: Boolean = false
)

data class SmsLogEntry(
    val id: String,
    val sender: String,
    val body: String,
    val timestamp: Long,
    val status: String, // PENDING, SUCCESS, RETRYING, FAILED
    val httpCode: Int
)

class StorageManager(context: Context) {
    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    companion object {
        private const val PREFS_NAME = "sms_router_prefs"
        private const val KEY_ENDPOINT_URL = "endpoint_url"
        private const val KEY_API_KEY = "api_key"
        private const val KEY_HMAC_SECRET = "hmac_secret"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_KEEP_ALIVE = "keep_alive_enabled"
        private const val KEY_LOGS_ARRAY = "logs_array"
        private const val MAX_LOGS = 50

        @Volatile
        private var instance: StorageManager? = null

        fun getInstance(context: Context): StorageManager {
            return instance ?: synchronized(this) {
                instance ?: StorageManager(context).also { instance = it }
            }
        }
    }

    fun getConfig(): AppConfig {
        return AppConfig(
            endpointUrl = prefs.getString(KEY_ENDPOINT_URL, "") ?: "",
            apiKey = prefs.getString(KEY_API_KEY, "") ?: "",
            hmacSecret = prefs.getString(KEY_HMAC_SECRET, "") ?: "",
            deviceId = prefs.getString(KEY_DEVICE_ID, android.os.Build.MODEL) ?: android.os.Build.MODEL,
            isKeepAliveEnabled = prefs.getBoolean(KEY_KEEP_ALIVE, false)
        )
    }

    fun saveConfig(config: AppConfig) {
        prefs.edit()
            .putString(KEY_ENDPOINT_URL, config.endpointUrl.trim())
            .putString(KEY_API_KEY, config.apiKey.trim())
            .putString(KEY_HMAC_SECRET, config.hmacSecret.trim())
            .putString(KEY_DEVICE_ID, config.deviceId.trim())
            .putBoolean(KEY_KEEP_ALIVE, config.isKeepAliveEnabled)
            .apply()
    }

    fun setKeepAliveEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_KEEP_ALIVE, enabled).apply()
    }

    @Synchronized
    fun getLogs(): List<SmsLogEntry> {
        val rawJson = prefs.getString(KEY_LOGS_ARRAY, "[]") ?: "[]"
        val result = mutableListOf<SmsLogEntry>()
        try {
            val jsonArray = JSONArray(rawJson)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                result.add(
                    SmsLogEntry(
                        id = obj.optString("id", ""),
                        sender = obj.optString("sender", ""),
                        body = obj.optString("body", ""),
                        timestamp = obj.optLong("timestamp", 0L),
                        status = obj.optString("status", "PENDING"),
                        httpCode = obj.optInt("httpCode", 0)
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }

    @Synchronized
    fun addLog(entry: SmsLogEntry) {
        val currentLogs = getLogs().toMutableList()
        currentLogs.add(0, entry)
        if (currentLogs.size > MAX_LOGS) {
            currentLogs.subList(MAX_LOGS, currentLogs.size).clear()
        }
        saveLogsList(currentLogs)
    }

    @Synchronized
    fun updateLogStatus(id: String, status: String, httpCode: Int) {
        val currentLogs = getLogs().toMutableList()
        var updated = false
        for (i in currentLogs.indices) {
            if (currentLogs[i].id == id) {
                currentLogs[i] = currentLogs[i].copy(status = status, httpCode = httpCode)
                updated = true
                break
            }
        }
        if (updated) {
            saveLogsList(currentLogs)
        }
    }

    @Synchronized
    fun getLog(id: String): SmsLogEntry? {
        return getLogs().firstOrNull { it.id == id }
    }

    private fun saveLogsList(logs: List<SmsLogEntry>) {
        val jsonArray = JSONArray()
        for (entry in logs) {
            val obj = JSONObject()
            obj.put("id", entry.id)
            obj.put("sender", entry.sender)
            obj.put("body", entry.body)
            obj.put("timestamp", entry.timestamp)
            obj.put("status", entry.status)
            obj.put("httpCode", entry.httpCode)
            jsonArray.put(obj)
        }
        prefs.edit().putString(KEY_LOGS_ARRAY, jsonArray.toString()).apply()
    }
}
