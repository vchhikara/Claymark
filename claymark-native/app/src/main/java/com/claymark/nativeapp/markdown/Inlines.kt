package com.claymark.nativeapp.markdown

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.InlineTextContent
import androidx.compose.foundation.text.appendInlineContent
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.Placeholder
import androidx.compose.ui.text.PlaceholderVerticalAlign
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.em
import com.claymark.nativeapp.theme.ClaymarkColors
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.TypeScale
import org.commonmark.ext.gfm.strikethrough.Strikethrough
import org.commonmark.node.Code
import org.commonmark.node.Emphasis
import org.commonmark.node.HardLineBreak
import org.commonmark.node.HtmlInline
import org.commonmark.node.Image
import org.commonmark.node.Link
import org.commonmark.node.Node
import org.commonmark.node.SoftLineBreak
import org.commonmark.node.StrongEmphasis
import org.commonmark.node.Text

/** Annotation tag carrying a permitted link destination. */
const val LINK_TAG = "claymark-link"

/**
 * The result of flattening a run of inline content: the text itself, plus
 * any inline-code "pills" that had to be laid out as inline Composables
 * (see [inlinePillContent] for why a [SpanStyle] background alone can't
 * produce a pill) — pass [inlineContent] straight through to the [Text]
 * (or [LinkableText]) call that renders [text].
 */
data class InlineRun(
    val text: AnnotatedString,
    val inlineContent: Map<String, InlineTextContent>,
)

/**
 * Builds the AnnotatedString for a run of inline content.
 *
 * Mirrors `src/components/map.tsx`'s inline entries plus `Link.tsx`,
 * `Inline.tsx`, and `InlineCode.tsx`. Every destination passes through
 * [UrlPolicy.safeUrl] first; a rejected href leaves the text rendered but
 * inert, which is what dropping the `href` property does in the web build.
 */
fun buildInlines(
    parent: Node,
    colors: ClaymarkColors,
    baseWeight: FontWeight = FontWeight.Normal,
): InlineRun {
    val builder = AnnotatedString.Builder()
    val inlineContent = mutableMapOf<String, InlineTextContent>()
    val pillIndex = intArrayOf(0)
    appendInlines(builder, parent, colors, baseWeight, inlineContent, pillIndex)
    return InlineRun(builder.toAnnotatedString(), inlineContent)
}

private fun appendInlines(
    builder: AnnotatedString.Builder,
    parent: Node,
    colors: ClaymarkColors,
    baseWeight: FontWeight,
    inlineContent: MutableMap<String, InlineTextContent>,
    pillIndex: IntArray,
) {
    var child = parent.firstChild
    while (child != null) {
        appendNode(builder, child, colors, baseWeight, inlineContent, pillIndex)
        child = child.next
    }
}

private fun appendNode(
    builder: AnnotatedString.Builder,
    node: Node,
    colors: ClaymarkColors,
    baseWeight: FontWeight,
    inlineContent: MutableMap<String, InlineTextContent>,
    pillIndex: IntArray,
) {
    when (node) {
        is Text -> builder.append(node.literal)

        is Emphasis -> builder.withSpan(SpanStyle(fontStyle = FontStyle.Italic)) {
            appendInlines(builder, node, colors, baseWeight, inlineContent, pillIndex)
        }

        // `.claymark-strong` is weight 700, not 600 — a heading's 600 and a
        // bold run's 700 are different values in claymark.css.
        is StrongEmphasis -> builder.withSpan(SpanStyle(fontWeight = FontWeight.Bold)) {
            appendInlines(builder, node, colors, baseWeight, inlineContent, pillIndex)
        }

        is Strikethrough -> builder.withSpan(SpanStyle(textDecoration = TextDecoration.LineThrough)) {
            appendInlines(builder, node, colors, baseWeight, inlineContent, pillIndex)
        }

        is Code -> {
            if (isReference(node.literal)) {
                // `.claymark-code-ref` — plain, no pill; a flat SpanStyle is
                // all this case needs.
                builder.withSpan(inlineCodeStyle(node.literal, colors)) {
                    builder.append(node.literal)
                }
            } else {
                // `.claymark-code-inline` — the pill. A SpanStyle background
                // paints a flat, unpadded, square-cornered rectangle behind
                // the glyphs; there is no way to get CSS's padded, rounded
                // pill out of it. An inline-content placeholder swaps in a
                // real Composable (Box + rounded clip + background) instead.
                val id = "pill${pillIndex[0]++}"
                inlineContent[id] = inlinePillContent(node.literal, colors)
                builder.appendInlineContent(id, node.literal)
            }
        }

        is Link -> {
            val safe = node.destination?.let { UrlPolicy.safeUrl(it, allowDataImage = false) }
            if (safe != null) {
                builder.pushStringAnnotation(LINK_TAG, safe)
                builder.withSpan(
                    SpanStyle(
                        color = colors.link,
                        textDecoration = TextDecoration.Underline,
                    ),
                ) {
                    appendInlines(builder, node, colors, baseWeight, inlineContent, pillIndex)
                }
                builder.pop()
            } else {
                appendInlines(builder, node, colors, baseWeight, inlineContent, pillIndex)
            }
        }

        // An inline image (one that isn't the sole content of its paragraph)
        // degrades to its alt text. The block renderer handles the standalone
        // case as a figure, which is the only shape the web build renders
        // differently from surrounding prose.
        is Image -> {
            val alt = collectText(node)
            if (alt.isNotEmpty()) {
                builder.withSpan(SpanStyle(color = colors.textMuted)) { builder.append(alt) }
            }
        }

        // Raw HTML is shown as text, not rendered. No override.
        is HtmlInline -> builder.append(node.literal)

        is SoftLineBreak -> builder.append(" ")
        is HardLineBreak -> builder.append("\n")

        else -> appendInlines(builder, node, colors, baseWeight, inlineContent, pillIndex)
    }
}

private inline fun AnnotatedString.Builder.withSpan(style: SpanStyle, block: () -> Unit) {
    pushStyle(style)
    block()
    pop()
}

/**
 * Port of `InlineCode.tsx`'s heuristic.
 *
 * A path (anything containing "/") or a bare `word.ext` filename renders as a
 * plain reference — no pill — so it doesn't compete visually with literal
 * values. Everything else, including unit-suffixed values like `0.85em` that
 * would otherwise look like a filename, keeps the pill treatment.
 */
private val UNIT_SUFFIX = Regex("(?:em|rem|px|%|deg|vh|vw|ms|fr)$", RegexOption.IGNORE_CASE)
private val FILENAME = Regex("^[A-Za-z0-9_-]+\\.[A-Za-z0-9]{1,4}(:\\d+)?$")

fun isReference(text: String): Boolean {
    val trimmed = text.trim()
    if (trimmed.contains("/")) return true
    return FILENAME.matches(trimmed) && !UNIT_SUFFIX.containsMatchIn(trimmed)
}

/** `.claymark-code-ref` — plain reference styling, no pill. */
fun inlineCodeStyle(literal: String, colors: ClaymarkColors): SpanStyle = SpanStyle(
    fontFamily = ClaymarkFonts.Mono,
    fontSize = TypeScale.body * 0.85f,
    color = colors.codeRef,
)

/**
 * `.claymark-code-inline` as an inline-content placeholder: a real rounded,
 * padded Box behind the mono text, rather than the flat rectangle a
 * [SpanStyle] background produces. Width is estimated from the literal's
 * character count — monospace, so this is exact for the glyphs themselves,
 * plus the pill's own horizontal padding.
 */
private fun inlinePillContent(literal: String, colors: ClaymarkColors): InlineTextContent {
    // ~0.6em average advance width for the mono face at this size, plus
    // Space.s2-equivalent padding (~0.5em) on each side.
    val widthEm = (literal.length * 0.6f + 1.0f).coerceAtLeast(1.6f)
    return InlineTextContent(
        placeholder = Placeholder(
            width = widthEm.em,
            height = 1.4.em,
            placeholderVerticalAlign = PlaceholderVerticalAlign.TextCenter,
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(Radius.sm))
                .background(colors.pillBg),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = literal,
                color = colors.codeInline,
                fontFamily = ClaymarkFonts.Mono,
                fontSize = TypeScale.body * 0.85f,
            )
        }
    }
}

/** Flattens a node's text content, used for alt text and heading anchors. */
fun collectText(node: Node): String {
    val sb = StringBuilder()
    fun walk(current: Node) {
        var child = current.firstChild
        while (child != null) {
            when (child) {
                is Text -> sb.append(child.literal)
                is Code -> sb.append(child.literal)
                is HtmlInline -> sb.append(child.literal)
                is SoftLineBreak -> sb.append(' ')
                is HardLineBreak -> sb.append('\n')
                else -> walk(child)
            }
            child = child.next
        }
    }
    walk(node)
    return sb.toString()
}

/** Port of `Heading.tsx`'s slugify, so anchors match the web build. */
fun slugify(text: String): String = text
    .trim()
    .lowercase()
    .replace(Regex("[^a-z0-9\\s-]"), "")
    .replace(Regex("[\\s_]+"), "-")
    .replace(Regex("-{2,}"), "-")
    .trim('-')
