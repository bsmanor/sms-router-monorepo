package com.smsrouter.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.concurrent.TimeUnit

sealed class UpdateStatus {
    object Idle : UpdateStatus()
    object Checking : UpdateStatus()
    data class UpdateAvailable(val versionName: String, val downloadUrl: String, val changelog: String) : UpdateStatus()
    object UpToDate : UpdateStatus()
    data class Downloading(val progress: Int) : UpdateStatus()
    data class ReadyToInstall(val apkFile: File) : UpdateStatus()
    data class Error(val message: String) : UpdateStatus()
}

class UpdateManager(private val context: Context) {

    companion object {
        const val GITHUB_REPO = "bsmanor/sms-router-monorepo"
        private const val RELEASES_API = "https://api.github.com/repos/$GITHUB_REPO/releases/latest"

        private val client: OkHttpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .followRedirects(true)
                .followSslRedirects(true)
                .build()
        }
    }

    suspend fun checkForUpdates(currentVersion: String): UpdateStatus = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(RELEASES_API)
                .header("Accept", "application/vnd.github.v3+json")
                .header("User-Agent", "SMS-Router-App")
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext UpdateStatus.Error("No releases found on GitHub yet (HTTP ${response.code})")
                }

                val bodyStr = response.body?.string() ?: return@withContext UpdateStatus.Error("Empty response")
                val json = JSONObject(bodyStr)
                val tagName = json.optString("tag_name", "").removePrefix("v")
                val body = json.optString("body", "Bug fixes and improvements")

                // Find APK asset in release
                val assets = json.optJSONArray("assets")
                var apkUrl: String? = null

                if (assets != null) {
                    for (i in 0 until assets.length()) {
                        val asset = assets.getJSONObject(i)
                        val name = asset.optString("name", "")
                        if (name.endsWith(".apk")) {
                            apkUrl = asset.optString("browser_download_url")
                            break
                        }
                    }
                }

                if (apkUrl == null) {
                    return@withContext UpdateStatus.Error("Latest release does not contain an APK asset")
                }

                if (isNewerVersion(tagName, currentVersion)) {
                    return@withContext UpdateStatus.UpdateAvailable(
                        versionName = tagName,
                        downloadUrl = apkUrl,
                        changelog = body
                    )
                } else {
                    return@withContext UpdateStatus.UpToDate
                }
            }
        } catch (e: Exception) {
            return@withContext UpdateStatus.Error(e.message ?: "Failed to check for updates")
        }
    }

    suspend fun downloadAndInstall(
        downloadUrl: String,
        onProgress: (Int) -> Unit
    ): UpdateStatus = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(downloadUrl)
                .header("User-Agent", "SMS-Router-App")
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext UpdateStatus.Error("Download failed with HTTP ${response.code}")
                }

                val body = response.body ?: return@withContext UpdateStatus.Error("Empty response body")
                val contentLength = body.contentLength()
                val baseDir = context.externalCacheDir ?: context.cacheDir
                val apkFile = File(baseDir, "sms-router-update.apk")
                if (apkFile.exists()) apkFile.delete()

                val inputStream: InputStream = body.byteStream()
                val outputStream = FileOutputStream(apkFile)

                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalBytesRead: Long = 0

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead
                    if (contentLength > 0) {
                        val progress = ((totalBytesRead * 100) / contentLength).toInt()
                        onProgress(progress)
                    }
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()

                if (apkFile.length() < 100_000L) {
                    return@withContext UpdateStatus.Error("Downloaded APK appears incomplete (${apkFile.length()} bytes)")
                }

                return@withContext UpdateStatus.ReadyToInstall(apkFile)
            }
        } catch (e: Exception) {
            return@withContext UpdateStatus.Error("Download failed: ${e.message}")
        }
    }

    fun promptInstall(apkFile: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.packageManager.canRequestPackageInstalls()) {
                Toast.makeText(
                    context,
                    "Please allow 'Install unknown apps' for SMS Router, then tap Install Now again",
                    Toast.LENGTH_LONG
                ).show()
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                return
            }
        }

        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile
        )

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        context.startActivity(intent)
    }

    private fun isNewerVersion(remote: String, local: String): Boolean {
        val rParts = remote.split(".").mapNotNull { it.toIntOrNull() }
        val lParts = local.split(".").mapNotNull { it.toIntOrNull() }
        val maxLen = maxOf(rParts.size, lParts.size)
        for (i in 0 until maxLen) {
            val r = rParts.getOrElse(i) { 0 }
            val l = lParts.getOrElse(i) { 0 }
            if (r > l) return true
            if (r < l) return false
        }
        return false
    }
}
