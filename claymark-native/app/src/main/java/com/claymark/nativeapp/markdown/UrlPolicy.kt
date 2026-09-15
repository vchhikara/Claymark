package com.claymark.nativeapp.markdown

import java.net.URI
import java.net.URLDecoder

/**
 * Port of `src/pipeline/plugins/url-policy.ts` and `plugins/links.ts`.
 *
 * This is the trust boundary, not a feature toggle. A destination that does
 * not pass [safeUrl] has its href/src dropped entirely — the link text still
 * renders, it just isn't activatable.
 */
object UrlPolicy {

    private val SAFE_PROTOCOLS = setOf("http", "https", "mailto")
    private val SAFE_DATA_IMAGE =
        Regex("^data:image/(png|jpeg|gif|webp)[;,]", RegexOption.IGNORE_CASE)
    private val SCHEME = Regex("^[a-zA-Z][a-zA-Z0-9+.-]*:")

    /**
     * Returns the original value when the destination is permitted, or null.
     *
     * The percent-escape probe below matters: micromark percent-encodes
     * control characters inside link destinations, so a payload like
     * `java%09script:` arrives with an innocuous-looking scheme position.
     * When the text before the first separator colon carries percent escapes
     * or control characters, decide on its *decoded* form rather than on
     * what a URL parser sees. commonmark-java normalises destinations the
     * same way, so the same probe is needed here.
     */
    fun safeUrl(value: String, allowDataImage: Boolean): String? {
        val cleaned = value.replace(Regex("[\\t\\n\\r]"), "").trim()

        val probe = value.replace(Regex("\\s"), "")
        val colon = probe.indexOf(':')
        val separators = listOf('/', '?', '#').map { probe.indexOf(it) }.filter { it > -1 }
        val firstSeparator = separators.minOrNull() ?: Int.MAX_VALUE

        if (colon > -1 && colon < firstSeparator) {
            var head = probe.substring(0, colon)
            if (Regex("[%\\u0000-\\u001F\\u007F]").containsMatchIn(head)) {
                head = try {
                    URLDecoder.decode(head, "UTF-8")
                } catch (_: Exception) {
                    return null
                }
                val scheme = head.replace(Regex("[^a-zA-Z0-9+.-]"), "").lowercase()
                if (scheme == "data") {
                    val decodedProbe = head + ":" + probe.substring(colon + 1)
                    return if (allowDataImage && SAFE_DATA_IMAGE.containsMatchIn(decodedProbe)) value else null
                }
                return if (scheme in SAFE_PROTOCOLS) value else null
            }
        }

        val scheme = schemeOf(cleaned) ?: return value // relative — inherits the page, which is local
        if (scheme == "data") {
            return if (allowDataImage && SAFE_DATA_IMAGE.containsMatchIn(cleaned)) value else null
        }
        return if (scheme in SAFE_PROTOCOLS) value else null
    }

    private fun schemeOf(value: String): String? {
        if (!SCHEME.containsMatchIn(value)) return null
        return value.substringBefore(':').lowercase()
    }

    /**
     * Port of `linkHardening`. In a browser this set `target=_blank` +
     * `rel="noopener noreferrer"`. There is no such thing on Android, so the
     * equivalent guarantee is: an absolute http(s) link leaves the app
     * entirely, via the system chooser, and never navigates anything inside
     * it. This reports whether a destination is that kind of link.
     */
    fun isExternal(href: String?): Boolean {
        if (href == null) return false
        val trimmed = href.trim()
        if (!SCHEME.containsMatchIn(trimmed)) return false
        return try {
            val scheme = URI(trimmed).scheme?.lowercase()
            scheme == "http" || scheme == "https"
        } catch (_: Exception) {
            false
        }
    }

    /** Decodes a permitted `data:image/...` URL to raw bytes, or null. */
    fun decodeDataImage(value: String): ByteArray? {
        if (!SAFE_DATA_IMAGE.containsMatchIn(value)) return null
        val comma = value.indexOf(',')
        if (comma < 0) return null
        val meta = value.substring(0, comma)
        val payload = value.substring(comma + 1)
        return try {
            if (meta.contains(";base64", ignoreCase = true)) {
                android.util.Base64.decode(payload, android.util.Base64.DEFAULT)
            } else {
                URLDecoder.decode(payload, "UTF-8").toByteArray(Charsets.ISO_8859_1)
            }
        } catch (_: Exception) {
            null
        }
    }
}
