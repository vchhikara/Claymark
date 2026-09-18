package com.claymark.nativeapp.markdown

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * HANDOFF-2.md §5's named highest-value first test target: `UrlPolicy` is
 * the actual trust boundary between untrusted, streamed Markdown and what
 * gets rendered as an activatable link/image source. Scoped to `safeUrl`
 * and `isExternal` — both pure `java.net`/regex logic; `decodeDataImage`
 * touches `android.util.Base64` and would need Robolectric or an
 * instrumented test to exercise, out of scope for this first pass.
 */
class UrlPolicyTest {

    @Test
    fun `allows plain https and http`() {
        assertEquals("https://example.com", UrlPolicy.safeUrl("https://example.com", allowDataImage = false))
        assertEquals("http://example.com", UrlPolicy.safeUrl("http://example.com", allowDataImage = false))
    }

    @Test
    fun `allows mailto`() {
        assertEquals("mailto:a@b.com", UrlPolicy.safeUrl("mailto:a@b.com", allowDataImage = false))
    }

    @Test
    fun `allows relative and fragment destinations`() {
        assertEquals("/docs/page", UrlPolicy.safeUrl("/docs/page", allowDataImage = false))
        assertEquals("#heading", UrlPolicy.safeUrl("#heading", allowDataImage = false))
    }

    @Test
    fun `blocks javascript scheme`() {
        assertNull(UrlPolicy.safeUrl("javascript:alert(1)", allowDataImage = false))
    }

    @Test
    fun `blocks javascript hidden behind percent-encoded control characters`() {
        // The exact payload shape UrlPolicy.kt's doc comment calls out:
        // micromark/commonmark-java percent-encode control chars inside a
        // link destination, so a naive scheme check sees "java%09script"
        // and not the decoded "java<TAB>script" it actually is.
        assertNull(UrlPolicy.safeUrl("java%09script:alert(1)", allowDataImage = false))
    }

    @Test
    fun `blocks file scheme`() {
        assertNull(UrlPolicy.safeUrl("file:///etc/passwd", allowDataImage = false))
    }

    @Test
    fun `blocks data urls by default`() {
        assertNull(UrlPolicy.safeUrl("data:image/png;base64,AAAA", allowDataImage = false))
    }

    @Test
    fun `allows safe data-image urls only when explicitly permitted`() {
        val url = "data:image/png;base64,AAAA"
        assertEquals(url, UrlPolicy.safeUrl(url, allowDataImage = true))
        assertNull(UrlPolicy.safeUrl(url, allowDataImage = false))
    }

    @Test
    fun `blocks non-image data urls even when data-image is allowed`() {
        assertNull(UrlPolicy.safeUrl("data:text/html,<script>1</script>", allowDataImage = true))
    }

    @Test
    fun `strips embedded control characters before evaluating`() {
        assertEquals(
            "https://example.com",
            UrlPolicy.safeUrl("https://example\n.com".replace("\n", ""), allowDataImage = false),
        )
    }

    @Test
    fun `isExternal is true only for absolute http-https`() {
        assert(UrlPolicy.isExternal("https://example.com"))
        assert(UrlPolicy.isExternal("http://example.com"))
        assert(!UrlPolicy.isExternal("/docs/page"))
        assert(!UrlPolicy.isExternal("mailto:a@b.com"))
        assert(!UrlPolicy.isExternal(null))
    }
}
