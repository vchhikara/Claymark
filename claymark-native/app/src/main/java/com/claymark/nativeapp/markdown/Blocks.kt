package com.claymark.nativeapp.markdown

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image as ComposeImage
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claymark.nativeapp.theme.ClaymarkColors
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.colors
import org.commonmark.ext.gfm.tables.TableBlock
import org.commonmark.ext.gfm.tables.TableBody
import org.commonmark.ext.gfm.tables.TableCell
import org.commonmark.ext.gfm.tables.TableHead
import org.commonmark.ext.gfm.tables.TableRow
import org.commonmark.ext.task.list.items.TaskListItemMarker
import org.commonmark.node.BlockQuote
import org.commonmark.node.BulletList
import org.commonmark.node.Code
import org.commonmark.node.Document
import org.commonmark.node.FencedCodeBlock
import org.commonmark.node.Heading
import org.commonmark.node.HtmlBlock
import org.commonmark.node.Image as MdImage
import org.commonmark.node.IndentedCodeBlock
import org.commonmark.node.ListItem
import org.commonmark.node.Node
import org.commonmark.node.OrderedList
import org.commonmark.node.Paragraph
import org.commonmark.node.Text as MdText
import org.commonmark.node.ThematicBreak

/**
 * The reading surface. Deliberately untouched by the claymorphism layer
 * except where chrome genuinely intrudes (the code-block container) — body
 * prose, headings, lists, quotes, and tables render exactly as
 * `claymark.css` specifies them.
 */
@Composable
fun MarkdownDocument(
    root: Node,
    modifier: Modifier = Modifier,
    onImageTapped: (ImagePayload) -> Unit = {},
) {
    Column(modifier = modifier.fillMaxWidth()) {
        var child = root.firstChild
        while (child != null) {
            RenderBlock(child, depth = 0, onImageTapped = onImageTapped)
            child = child.next
        }
    }
}

data class ImagePayload(val src: String, val alt: String?, val title: String?)

@Composable
private fun RenderBlock(node: Node, depth: Int, onImageTapped: (ImagePayload) -> Unit) {
    val c = colors
    when (node) {
        is Heading -> HeadingBlock(node)
        is Paragraph -> ParagraphBlock(node, onImageTapped)
        is BulletList -> ListBlock(node, ordered = false, depth = depth, onImageTapped = onImageTapped)
        is OrderedList -> ListBlock(node, ordered = true, depth = depth, onImageTapped = onImageTapped)
        is BlockQuote -> BlockQuoteBlock(node, depth, onImageTapped)
        is FencedCodeBlock -> FencedBlock(node)
        is IndentedCodeBlock -> CodeBlockView(
            code = node.literal.trimEnd('\n'),
            language = "",
            showChrome = false,
        )
        is ThematicBreak -> RuleBlock()
        is TableBlock -> TableView(node)

        // Raw HTML in a document is shown as text, not rendered. HTML in
        // untrusted documents is the primary attack surface; it is disabled
        // entirely, without an override.
        is HtmlBlock -> Text(
            text = node.literal.trimEnd('\n'),
            style = bodyStyle(c),
            modifier = Modifier.padding(vertical = Space.s2),
        )

        is Document -> {
            var child = node.firstChild
            while (child != null) {
                RenderBlock(child, depth, onImageTapped)
                child = child.next
            }
        }

        else -> {
            var child = node.firstChild
            while (child != null) {
                RenderBlock(child, depth, onImageTapped)
                child = child.next
            }
        }
    }
}

@Composable
internal fun bodyStyle(c: ClaymarkColors) = TextStyle(
    fontFamily = ClaymarkFonts.Body,
    fontSize = TypeScale.body,
    lineHeight = TypeScale.body * TypeScale.LEADING_BODY,
    color = c.textPrimary,
    textAlign = TextAlign.Start,
)

// ---- headings --------------------------------------------------------------

@Composable
private fun HeadingBlock(node: Heading) {
    val c = colors
    val (size, leading) = when (node.level) {
        1 -> TypeScale.h1 to TypeScale.LEADING_H1
        2 -> TypeScale.h2 to TypeScale.LEADING_H2
        3 -> TypeScale.h3 to TypeScale.LEADING_H3
        4 -> TypeScale.h4 to TypeScale.LEADING_H4
        5 -> TypeScale.h5 to TypeScale.LEADING_H5
        else -> TypeScale.h6 to TypeScale.LEADING_H6
    }
    Text(
        text = buildInlines(node, c),
        style = TextStyle(
            // Headings stay in the body serif at weight 600 — Claymark has no
            // separate display face anywhere.
            fontFamily = ClaymarkFonts.Body,
            fontSize = size,
            lineHeight = size * leading,
            fontWeight = FontWeight.SemiBold,
            color = c.textPrimary,
        ),
        modifier = Modifier.padding(top = Space.s6, bottom = Space.s3),
    )
}

// ---- paragraphs ------------------------------------------------------------

@Composable
private fun ParagraphBlock(node: Paragraph, onImageTapped: (ImagePayload) -> Unit) {
    val c = colors

    // CommonMark wraps a standalone `![alt](src)` in a paragraph, since an
    // image is inline per the spec. A sole-image paragraph is unwrapped so
    // the figure isn't nested inside a text block.
    soleImageOf(node)?.let { image ->
        FigureBlock(image, onImageTapped)
        return
    }

    val flat = collectText(node)
    if (MarkdownParser.hasInlineMath(flat) && node.firstChild is MdText && node.firstChild?.next == null) {
        // A plain-text paragraph carrying `$…$`: hand the whole paragraph to
        // KaTeX so the math sits on the same baseline as the prose around it.
        MathView(
            html = MathHtml.paragraphWithInlineMath(flat),
            textPrimary = c.textPrimary,
            danger = c.danger,
            modifier = Modifier.padding(vertical = Space.s2),
        )
        return
    }

    LinkableText(
        text = buildInlines(node, c),
        style = bodyStyle(c),
        modifier = Modifier.padding(vertical = Space.s2),
    )
}

private fun soleImageOf(node: Paragraph): MdImage? {
    val first = node.firstChild ?: return null
    if (first !is MdImage) return null
    return if (first.next == null) first else null
}

// ---- lists -----------------------------------------------------------------

@Composable
private fun ListBlock(
    node: Node,
    ordered: Boolean,
    depth: Int,
    onImageTapped: (ImagePayload) -> Unit,
) {
    val c = colors
    val start = (node as? OrderedList)?.markerStartNumber ?: 1
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = Space.s5, top = Space.s4, bottom = Space.s4),
    ) {
        var item = node.firstChild
        var index = start
        while (item != null) {
            if (item is ListItem) {
                ListItemRow(
                    item = item,
                    marker = if (ordered) orderedMarker(index, depth) else bulletMarker(depth),
                    depth = depth,
                    onImageTapped = onImageTapped,
                )
                index++
            }
            item = item.next
        }
    }
}

/** `.claymark-ul` nesting: disc, then circle, then square. */
private fun bulletMarker(depth: Int): String = when (depth % 3) {
    0 -> "\u2022"
    1 -> "\u25E6"
    else -> "\u25AA"
}

/** `.claymark-ol` nesting: decimal, then lower-alpha, then lower-roman. */
private fun orderedMarker(index: Int, depth: Int): String = when (depth % 3) {
    0 -> "$index."
    1 -> "${('a' + ((index - 1).coerceAtLeast(0) % 26))}."
    else -> "${toRoman(index).lowercase()}."
}

private fun toRoman(value: Int): String {
    if (value <= 0) return value.toString()
    val numerals = listOf(
        1000 to "M", 900 to "CM", 500 to "D", 400 to "CD", 100 to "C", 90 to "XC",
        50 to "L", 40 to "XL", 10 to "X", 9 to "IX", 5 to "V", 4 to "IV", 1 to "I",
    )
    var remaining = value
    val sb = StringBuilder()
    numerals.forEach { (n, symbol) ->
        while (remaining >= n) {
            sb.append(symbol)
            remaining -= n
        }
    }
    return sb.toString()
}

@Composable
private fun ListItemRow(
    item: ListItem,
    marker: String,
    depth: Int,
    onImageTapped: (ImagePayload) -> Unit,
) {
    val c = colors
    val task = taskMarkerOf(item)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Space.s1),
        verticalAlignment = Alignment.Top,
    ) {
        if (task != null) {
            // Task checkboxes are display-only: they show state but are not
            // clickable, because the document is a rendering, not a form.
            TaskCheckbox(checked = task.isChecked)
            Spacer(Modifier.width(Space.s2))
        } else {
            Text(
                text = marker,
                style = bodyStyle(c).copy(color = c.textSecondary),
                modifier = Modifier.width(Space.s5),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            var child = item.firstChild
            while (child != null) {
                when (child) {
                    is Paragraph -> LinkableText(
                        text = buildInlines(child, c),
                        style = bodyStyle(c),
                    )
                    is BulletList -> ListBlock(child, false, depth + 1, onImageTapped)
                    is OrderedList -> ListBlock(child, true, depth + 1, onImageTapped)
                    else -> RenderBlock(child, depth + 1, onImageTapped)
                }
                child = child.next
            }
        }
    }
}

private fun taskMarkerOf(item: ListItem): TaskListItemMarker? {
    val paragraph = item.firstChild ?: return null
    val first = paragraph.firstChild
    return first as? TaskListItemMarker
}

@Composable
private fun TaskCheckbox(checked: Boolean) {
    val c = colors
    Box(
        modifier = Modifier
            .padding(top = 5.dp)
            .size(16.dp)
            .clip(RoundedCornerShape(Radius.sm))
            .background(if (checked) c.textMuted else c.surfaceRaised),
        contentAlignment = Alignment.Center,
    ) {
        if (checked) {
            Text(
                text = "\u2713",
                color = c.surface,
                fontSize = 11.sp,
                fontFamily = ClaymarkFonts.Ui,
            )
        }
    }
}

// ---- quotes, rules ---------------------------------------------------------

@Composable
private fun BlockQuoteBlock(node: BlockQuote, depth: Int, onImageTapped: (ImagePayload) -> Unit) {
    val c = colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Space.s4)
            .height(IntrinsicSize.Min),
    ) {
        // border-left: var(--space-1) solid hsl(var(--quote-rule))
        Box(
            modifier = Modifier
                .width(Space.s1)
                .fillMaxHeight()
                .background(c.quoteRule),
        )
        Column(modifier = Modifier.padding(start = Space.s4)) {
            var child = node.firstChild
            while (child != null) {
                when (child) {
                    is Paragraph -> LinkableText(
                        text = buildInlines(child, c),
                        style = bodyStyle(c).copy(color = c.textSecondary),
                        modifier = Modifier.padding(vertical = Space.s2),
                    )
                    else -> RenderBlock(child, depth, onImageTapped)
                }
                child = child.next
            }
        }
    }
}

@Composable
private fun RuleBlock() {
    val c = colors
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Space.s6)
            .height(1.dp)
            .background(c.borderSubtle),
    )
}

// ---- code, math, diagrams --------------------------------------------------

@Composable
private fun FencedBlock(node: FencedCodeBlock) {
    val c = colors
    val info = node.info?.trim().orEmpty()
    val language = info.substringBefore(' ').trim()
    val meta = info.substringAfter(' ', "")
    val source = node.literal.trimEnd('\n')

    when {
        // Display math, normalised to a ```math fence by the parser — no
        // copy-button or language chrome, matching the web build's
        // `isMathBlock` branch.
        language == "math" -> MathView(
            html = MathHtml.displayBlock(source),
            textPrimary = c.textPrimary,
            danger = c.danger,
            modifier = Modifier.padding(vertical = Space.s4),
        )

        language == "mermaid" -> {
            var failed by remember(source) { mutableStateOf(false) }
            if (failed) {
                // Invalid syntax falls back to showing the diagram source as
                // a code block.
                CodeBlockView(code = source, language = "mermaid", showChrome = true)
            } else {
                Box(modifier = Modifier.padding(vertical = Space.s4)) {
                    MermaidView(
                        source = source,
                        isDark = c.isDark,
                        onFailed = { failed = true },
                    )
                }
            }
        }

        else -> CodeBlockView(
            code = source,
            language = language,
            showChrome = true,
            highlightedLines = Highlighter.parseHighlightedLines(meta),
        )
    }
}

// ---- images ----------------------------------------------------------------

@Composable
private fun FigureBlock(image: MdImage, onImageTapped: (ImagePayload) -> Unit) {
    val c = colors
    val safe = image.destination?.let { UrlPolicy.safeUrl(it, allowDataImage = true) }
    val alt = collectText(image)
    val title = image.title

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Space.s4),
    ) {
        val bytes = remember(safe) { safe?.let { UrlPolicy.decodeDataImage(it) } }
        val bitmap = remember(bytes) {
            bytes?.let {
                runCatching {
                    android.graphics.BitmapFactory.decodeByteArray(it, 0, it.size)
                }.getOrNull()
            }
        }

        if (bitmap != null) {
            ComposeImage(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = alt.ifEmpty { null },
                contentScale = ContentScale.FillWidth,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onImageTapped(ImagePayload(safe!!, alt, title)) },
            )
        } else {
            // A remote image cannot be fetched: the app holds no INTERNET
            // permission, because "documents cannot load remote resources" is
            // a product guarantee. The alt text stands in, which is the same
            // thing a blocked scheme produces in the web build.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(Radius.md))
                    .background(c.surfaceRaised)
                    .padding(Space.s4),
            ) {
                Text(
                    text = if (alt.isNotEmpty()) alt else "Image",
                    style = bodyStyle(c).copy(
                        color = c.textMuted,
                        fontSize = TypeScale.code,
                    ),
                )
            }
        }

        if (!title.isNullOrEmpty()) {
            Text(
                text = title,
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Body,
                    fontSize = TypeScale.code,
                    color = c.textMuted,
                    textAlign = TextAlign.Center,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = Space.s2),
            )
        }
    }
}

// ---- link-aware text -------------------------------------------------------

/**
 * Text that activates permitted link destinations. An absolute http(s) link
 * leaves the app through the system chooser — the native equivalent of the
 * web build's `target="_blank" rel="noopener noreferrer"` hardening. Nothing
 * navigates inside the app.
 */
@Composable
fun LinkableText(
    text: AnnotatedString,
    style: TextStyle,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var layout by remember { mutableStateOf<TextLayoutResult?>(null) }

    Text(
        text = text,
        style = style,
        onTextLayout = { layout = it },
        modifier = modifier
            .fillMaxWidth()
            .pointerInput(text) {
                detectTapGestures { position ->
                    val result = layout ?: return@detectTapGestures
                    val offset = result.getOffsetForPosition(position)
                    text.getStringAnnotations(LINK_TAG, offset, offset)
                        .firstOrNull()
                        ?.let { annotation ->
                            runCatching {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(annotation.item))
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(intent)
                            }
                        }
                }
            },
    )
}
