package com.smsrouter.app

import java.nio.charset.StandardCharsets
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object HmacUtils {
    @JvmStatic
    fun computeHmacSha256(payload: String, secret: String): String {
        val algorithm = "HmacSHA256"
        val secretKeySpec = SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), algorithm)
        val mac = Mac.getInstance(algorithm)
        mac.init(secretKeySpec)
        val hashBytes = mac.doFinal(payload.toByteArray(StandardCharsets.UTF_8))
        val sb = StringBuilder(hashBytes.size * 2)
        for (b in hashBytes) {
            sb.append(String.format("%02x", b.toInt() and 0xff))
        }
        return sb.toString().lowercase()
    }
}
