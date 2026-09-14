package com.claymark.nativeapp.markdown

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.unit.dp
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors
import com.claymark.nativeapp.ui.ClayButton
import kotlinx.coroutines.delay

/**
 * Port of `CodeBlock.tsx` + `.claymark-codeblock` in claymark.css.
 *
 * The header sits inside the same visual box as the code, in normal flow
 * above it — not floating over the top-right corner. That was a real
 * on-device fix: an absolutely-positioned copy button landed directly on top
 * of code text on a narrow viewport whenever the first line ran long.
 *
 * Horizontal overflow scrolls within the block. The page never scrolls
 * sideways — a hard product rule, not a preference.
 */
@Composable
fun CodeBlockView(
    code: String,
    language: String,
    showChrome: Boolean,
    highlightedLines: Set<Int> = emptySet(),
    modifier: Modifier = Modifier,
) {
    val c = colors
    val scroll = rememberScrollState()

    val palette = if (c.isDark) Highlighter.GithubDarkDimmed else Highlighter.GithubLight
    val highlighted: AnnotatedString = remember(code, language, c.isDark) {
        Highlighter.highlight(code, language.ifBlank { null }, palette)
    }

    val codeStyle = TextStyle(
        fontFamily = ClaymarkFonts.Mono,
        fontSize = TypeScale.codeBlock,
        lineHeight = TypeScale.codeBlock * 1.5f,
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = Space.s4)
            // Chrome, so it takes the clay treatment. The fill is still
            // --surface-code; the modifier only adds depth around it.
            .clayRaised(base = c.surfaceCode, colors = c, radius = Radius.md, elevation = 4.dp)
            .border(1.dp, c.borderDefault, RoundedCornerShape(Radius.md))
            .padding(start = Space.s4, end = Space.s4, top = Space.s3, bottom = Space.s4),
    ) {
        if (showChrome) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = Space.s2),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = language,
                    style = TextStyle(
                        fontFamily = ClaymarkFonts.Mono,
                        fontSize = TypeScale.code,
                        color = c.textSecondary,
                    ),
                )
                CopyButton(text = code)
            }
        }

        Box(modifier = Modifier.horizontalScroll(scroll)) {
            if (highlightedLines.isEmpty()) {
                Text(text = highlighted, style = codeStyle)
            } else {
                HighlightedLines(highlighted, code, highlightedLines, codeStyle)
            }
        }
    }
}

/**
 * Fence meta `{2,4-6}`. rehype-pretty-code emits `data-highlighted-line` per
 * matched line and leaves the rendering to CSS; the equivalent here is a
 * tinted row behind the line.
 */
@Composable
private fun HighlightedLines(
    highlighted: AnnotatedString,
    raw: String,
    lines: Set<Int>,
    style: TextStyle,
) {
    val c = colors
    Column {
        var offset = 0
        raw.split("\n").forEachIndexed { index, line ->
            val start = offset
            val end = (offset + line.length).coerceAtMost(highlighted.length)
            val slice = if (start <= end) highlighted.subSequence(start, end) else buildAnnotatedString { }
            val isMarked = lines.contains(index + 1)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .then(
                        if (isMarked) Modifier.background(c.surfaceRaised) else Modifier,
                    ),
            ) {
                Text(text = slice, style = style)
            }
            offset = end + 1
        }
    }
}

/**
 * Port of `CopyButton.tsx`. Copies exactly the fence source — no line
 * numbers, no highlighting artifacts.
 */
@Composable
fun CopyButton(text: String) {
    val context = LocalContext.current
    var copied by remember { mutableStateOf(false) }

    LaunchedEffect(copied) {
        if (copied) {
            delay(2000)
            copied = false
        }
    }

    ClayButton(
        label = if (copied) "Copied" else "Copy",
        compact = true,
        onClick = {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("Markdown code", text))
            copied = true
        },
    )
}
