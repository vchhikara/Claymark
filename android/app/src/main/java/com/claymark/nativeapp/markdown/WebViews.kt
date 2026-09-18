package com.claymark.nativeapp.markdown

import android.annotation.SuppressLint
import android.graphics.Color as AndroidColor
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.ByteArrayInputStream

/**
 * The two rendering surfaces with no native Compose equivalent: KaTeX math
 * and Mermaid diagrams.
 *
 * Both run in a WebView, but that does not make this a WebView app. The
 * WebView is used the way an image decoder would be — it receives generated,
 * already-escaped content, has no navigation, no history, no chrome, and no
 * way to reach anything outside the APK:
 *
 *  - all subresources come from [WebViewAssetLoader] under a synthetic
 *    https://appassets.androidplatform.net origin;
 *  - every other request is answered with an empty 404 response, so even a
 *    malformed asset path cannot escape;
 *  - no INTERNET permission is declared, so the guarantee is enforced by the
 *    platform and not only by this client.
 */
private const val ASSET_ORIGIN = "https://appassets.androidplatform.net"

private class HeightBridge(
    private val heightCallback: (Float) -> Unit,
    private val errorCallback: (String) -> Unit,
) {
    @JavascriptInterface
    fun onHeight(pixels: Int) {
        heightCallback(pixels.toFloat())
    }

    @JavascriptInterface
    fun onError(message: String) {
        errorCallback(message)
    }
}

private fun assetClient(loader: WebViewAssetLoader, onReady: () -> Unit) = object : WebViewClient() {
    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest,
    ): WebResourceResponse? {
        val url = request.url
        if (url.toString().startsWith(ASSET_ORIGIN)) {
            return loader.shouldInterceptRequest(url)
        }
        // Everything else is refused outright. A document cannot load remote
        // resources; this is the same rule the URL policy enforces natively.
        return WebResourceResponse(
            "text/plain",
            "utf-8",
            404,
            "Blocked",
            emptyMap(),
            ByteArrayInputStream(ByteArray(0)),
        )
    }

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true

    override fun onPageFinished(view: WebView, url: String?) {
        onReady()
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun RenderHost(
    page: String,
    payload: () -> JSONObject,
    modifier: Modifier = Modifier,
    onError: (String) -> Unit = {},
) {
    val context = LocalContext.current
    // The page reports CSS pixels. With `initial-scale=1` and
    // `width=device-width`, one CSS pixel is one density-independent pixel,
    // so this is a dp value already — converting it again would scale the
    // block by the device density a second time.
    var heightDp by remember { mutableFloatStateOf(1f) }
    var ready by remember { mutableStateOf(false) }

    val loader = remember {
        WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
            .build()
    }

    val webView = remember {
        WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
            settings.mediaPlaybackRequiresUserGesture = true
            settings.textZoom = 100
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            setBackgroundColor(AndroidColor.TRANSPARENT)
            addJavascriptInterface(
                HeightBridge(
                    heightCallback = { heightDp = it },
                    errorCallback = onError,
                ),
                "ClaymarkBridge",
            )
        }
    }

    AndroidView(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp.coerceAtLeast(1f).dp),
        factory = {
            webView.webViewClient = assetClient(loader) { ready = true }
            webView.loadUrl("$ASSET_ORIGIN/assets/$page")
            webView
        },
        update = { view ->
            if (ready) {
                val json = payload().toString().replace("\\", "\\\\").replace("'", "\\'")
                view.evaluateJavascript("window.cmRender('$json')", null)
            }
        },
    )
}

/**
 * Display math ($$…$$), or a whole paragraph containing inline math.
 *
 * [html] is generated by [MathHtml] from the parsed AST — never document
 * markup.
 */
@Composable
fun MathView(
    html: String,
    textPrimary: Color,
    danger: Color,
    modifier: Modifier = Modifier,
) {
    RenderHost(
        page = "math.html",
        payload = {
            JSONObject()
                .put("html", html)
                .put("textPrimary", textPrimary.toCss())
                .put("danger", danger.toCss())
        },
        modifier = modifier,
    )
}

/**
 * A ```mermaid fence. Invalid syntax raises [onFailed], and the caller falls
 * back to showing the diagram source as a code block.
 */
@Composable
fun MermaidView(
    source: String,
    isDark: Boolean,
    onFailed: () -> Unit,
    modifier: Modifier = Modifier,
) {
    RenderHost(
        page = "mermaid.html",
        payload = {
            JSONObject()
                .put("source", source)
                .put("theme", if (isDark) "dark" else "default")
        },
        modifier = modifier,
        onError = { onFailed() },
    )
}

private fun Color.toCss(): String {
    val argb = this.toArgb()
    return String.format("#%06X", 0xFFFFFF and argb)
}

/** Escapes text for insertion into the generated math page. */
object MathHtml {
    fun escape(text: String): String = text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    /** A standalone display-math block. */
    fun displayBlock(tex: String): String =
        """<div class="cm-display" data-tex="${escape(tex)}" data-display="true"></div>"""

    /**
     * A paragraph whose text contains `$…$` spans. The non-math runs are
     * escaped text; the math runs become KaTeX targets. Keeping them in one
     * page is what preserves the line box — splitting a paragraph across two
     * renderers would break the measure and the baseline.
     */
    fun paragraphWithInlineMath(text: String): String {
        val sb = StringBuilder("<p style=\"margin:0\">")
        var last = 0
        MarkdownParser.inlineMathRegex().findAll(text).forEach { match ->
            sb.append(escape(text.substring(last, match.range.first)))
            sb.append("<span data-tex=\"")
                .append(escape(match.groupValues[1]))
                .append("\" data-display=\"false\"></span>")
            last = match.range.last + 1
        }
        sb.append(escape(text.substring(last)))
        sb.append("</p>")
        return sb.toString()
    }
}
