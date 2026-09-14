package com.claymark.nativeapp.markdown

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import com.claymark.nativeapp.theme.ClaymarkColors
import com.claymark.nativeapp.theme.ClaymarkFonts
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
): AnnotatedString {
    val builder = AnnotatedString.Builder()
    appendInlines(builder, parent, colors, baseWeight)
    return builder.toAnnotatedString()
}

private fun appendInlines(
    builder: AnnotatedString.Builder,
    parent: Node,
    colors: ClaymarkColors,
    baseWeight: FontWeight,
) {
    var child = parent.firstChild
    while (child != null) {
        appendNode(builder, child, colors, baseWeight)
        child = child.next
    }
}

private fun appendNode(
    builder: AnnotatedString.Builder,
    node: Node,
    colors: ClaymarkColors,
    baseWeight: FontWeight,
) {
    when (node) {
        is Text -> builder.append(node.literal)

        is Emphasis -> builder.withSpan(SpanStyle(fontStyle = FontStyle.Italic)) {
            appendInlines(builder, node, colors, baseWeight)
        }

        // `.claymark-strong` is weight 700, not 600 — a heading's 600 and a
        // bold run's 700 are different values in claymark.css.
        is StrongEmphasis -> builder.withSpan(SpanStyle(fontWeight = FontWeight.Bold)) {
            appendInlines(builder, node, colors, baseWeight)
        }

        is Strikethrough -> builder.withSpan(SpanStyle(textDecoration = TextDecoration.LineThrough)) {
            appendInlines(builder, node, colors, baseWeight)
        }

        is Code -> builder.withSpan(inlineCodeStyle(node.literal, colors)) {
            builder.append(node.literal)
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
                    appendInlines(builder, node, colors, baseWeight)
                }
                builder.pop()
            } else {
                appendInlines(builder, node, colors, baseWeight)
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

        else -> appendInlines(builder, node, colors, baseWeight)
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

fun inlineCodeStyle(literal: String, colors: ClaymarkColors): SpanStyle =
    if (isReference(literal)) {
        // `.claymark-code-ref` — plain, no pill.
        SpanStyle(
            fontFamily = ClaymarkFonts.Mono,
            fontSize = TypeScale.body * 0.85f,
            color = colors.codeRef,
        )
    } else {
        // `.claymark-code-inline` — the pill. Compose paints a span
        // background as a flat rectangle with no padding or radius, so this
        // is the closest available equivalent to the CSS pill.
        SpanStyle(
            fontFamily = ClaymarkFonts.Mono,
            fontSize = TypeScale.body * 0.85f,
            color = colors.codeInline,
            background = colors.pillBg,
        )
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
