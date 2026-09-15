package com.claymark.nativeapp.markdown

import org.commonmark.ext.autolink.AutolinkExtension
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension
import org.commonmark.ext.gfm.tables.TablesExtension
import org.commonmark.ext.task.list.items.TaskListItemsExtension
import org.commonmark.node.Node
import org.commonmark.parser.Parser

/**
 * CommonMark + GFM parsing, matching the shipped pipeline's plugin set:
 * remark-parse + remark-gfm (tables, task lists, strikethrough, autolinks)
 * + remark-math.
 *
 * Raw HTML passthrough is disabled entirely — the largest single class of
 * attack surface. commonmark-java still *parses* HtmlBlock/HtmlInline nodes;
 * the renderer displays their literal source as text, never as markup, which
 * is the same escaped-source-text treatment `htmlToText` gives it in
 * `src/pipeline/processor.ts`.
 */
object MarkdownParser {

    private val parser: Parser = Parser.builder()
        .extensions(
            listOf(
                TablesExtension.create(),
                StrikethroughExtension.create(),
                TaskListItemsExtension.create(),
                AutolinkExtension.create(),
            ),
        )
        .build()

    /**
     * remark-math turns `$$…$$` into a block `math` node and `$…$` into
     * `inlineMath`. commonmark-java has no math extension, so display math is
     * normalised into a fenced block tagged `math` before parsing — which is
     * exactly the hast shape remark-math itself produces
     * (`<pre><code class="language-math math-display">`), so the renderer's
     * branch on the info string is the same branch `isMathBlock` takes in
     * `src/components/map.tsx`.
     *
     * Inline `$…$` is left in the text and detected at render time, since it
     * has to stay inside its surrounding paragraph.
     */
    fun parse(source: String): Node = parser.parse(preprocessDisplayMath(source))

    /**
     * §2.4: word count off the already-parsed AST rather than the raw
     * source, so fence markers, heading `#`s, and link syntax never inflate
     * the count — only [org.commonmark.node.Text] and [org.commonmark.node.Code]
     * literal runs are prose a reader actually reads.
     */
    fun wordCount(root: Node): Int {
        var total = 0
        fun walk(node: Node) {
            val literal = when (node) {
                is org.commonmark.node.Text -> node.literal
                is org.commonmark.node.Code -> node.literal
                else -> null
            }
            if (literal != null) {
                total += literal.trim().split(Regex("\\s+")).count { it.isNotBlank() }
            }
            var child = node.firstChild
            while (child != null) {
                walk(child)
                child = child.next
            }
        }
        walk(root)
        return total
    }

    internal fun preprocessDisplayMath(source: String): String {
        val out = StringBuilder()
        val lines = source.split("\n")
        var i = 0
        var inFence = false
        var fenceMarker = ""

        while (i < lines.size) {
            val line = lines[i]
            val trimmed = line.trim()

            // Never rewrite anything inside a real code fence — a `$$` in a
            // shell example is not display math.
            if (!inFence && (trimmed.startsWith("```") || trimmed.startsWith("~~~"))) {
                inFence = true
                fenceMarker = trimmed.take(3)
                out.append(line).append('\n')
                i++
                continue
            }
            if (inFence) {
                if (trimmed.startsWith(fenceMarker)) inFence = false
                out.append(line).append('\n')
                i++
                continue
            }

            if (trimmed == "$$") {
                val body = StringBuilder()
                var j = i + 1
                var closed = false
                while (j < lines.size) {
                    if (lines[j].trim() == "$$") {
                        closed = true
                        break
                    }
                    body.append(lines[j]).append('\n')
                    j++
                }
                if (closed) {
                    out.append("```math\n").append(body).append("```\n")
                    i = j + 1
                    continue
                }
            }

            // Single-line `$$ … $$`.
            if (trimmed.length > 4 && trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
                val body = trimmed.substring(2, trimmed.length - 2).trim()
                if (body.isNotEmpty()) {
                    out.append("```math\n").append(body).append("\n```\n")
                    i++
                    continue
                }
            }

            out.append(line).append('\n')
            i++
        }
        return out.toString()
    }

    /** Matches an unescaped `$…$` span that isn't a currency figure. */
    private val INLINE_MATH = Regex("(?<!\\\\)\\$([^$\\n]+?)(?<!\\\\)\\$")

    fun hasInlineMath(text: String): Boolean = INLINE_MATH.containsMatchIn(text)

    fun inlineMathRegex(): Regex = INLINE_MATH
}
