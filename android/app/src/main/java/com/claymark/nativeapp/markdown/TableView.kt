package com.claymark.nativeapp.markdown

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.claymark.nativeapp.theme.ClayInsets
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayPot
import com.claymark.nativeapp.theme.colors
import org.commonmark.ext.gfm.tables.TableBlock
import org.commonmark.ext.gfm.tables.TableBody
import org.commonmark.ext.gfm.tables.TableCell
import org.commonmark.ext.gfm.tables.TableHead
import org.commonmark.ext.gfm.tables.TableRow
import org.commonmark.node.Node

/**
 * Port of `Table.tsx` + `.claymark-table*`.
 *
 * The shipped design comes from shadcn/ui's Table primitive re-expressed
 * against Claymark's tokens: row-separator borders rather than a full grid,
 * tighter padding than full prose, and code-sized type.
 *
 * Wide tables scroll horizontally inside their own container. The page never
 * scrolls sideways.
 */
@Composable
fun TableView(block: TableBlock, modifier: Modifier = Modifier) {
    val c = colors
    val scroll = rememberScrollState()
    val textMeasurer = rememberTextMeasurer()
    val density = LocalDensity.current

    val head = remember(block) { rowsOf(block, header = true) }
    val body = remember(block) { rowsOf(block, header = false) }
    val columnCount = ((head + body).maxOfOrNull { it.size } ?: 0)
    if (columnCount == 0) return

    // Compose has no auto table layout, so column widths are derived from
    // the actual rendered width of the longest cell in each column (measured
    // against this table's real fonts/weights, not a char-count guess — a
    // guess systematically misjudges the proportional body serif). Anything
    // wider than the viewport scrolls inside this container; a generous cap
    // keeps one long prose cell from forcing every other column offscreen.
    val widths = remember(head, body) {
        (0 until columnCount).map { index ->
            val headerWidth = head.mapNotNull { it.getOrNull(index) }.maxOfOrNull { cell ->
                textMeasurer.measure(cell.text, cellStyle(c.textPrimary, isHeader = true)).size.width
            } ?: 0
            val bodyWidth = body.mapNotNull { it.getOrNull(index) }.maxOfOrNull { cell ->
                textMeasurer.measure(cell.text, cellStyle(c.textPrimary, isHeader = false)).size.width
            } ?: 0
            val contentPx = maxOf(headerWidth, bodyWidth)
            val contentDp = with(density) { contentPx.toDp() }
            (contentDp + Space.s3 * 2).coerceIn(40.dp, 320.dp)
        }
    }

    Column(
        modifier = modifier
            .padding(vertical = Space.s4)
            .clayPot(
                base = c.surface,
                colors = c,
                radius = Radius.md,
                insets = ClayInsets(horizontal = 0.75.dp, vertical = 0.75.dp),
            )
            // Interior breathing room so the first/last row and the
            // left/right-most cell text never sit flush against the pot's
            // raised rim.
            .padding(Space.s2),
    ) {
        val totalWidth = remember(widths) { widths.fold(0.dp) { acc, w -> acc + w } }
        Column(modifier = Modifier.horizontalScroll(scroll)) {
            head.forEach { row ->
                TableRowView(row, widths, totalWidth, isHeader = true)
            }
            body.forEachIndexed { index, row ->
                TableRowView(row, widths, totalWidth, isHeader = false, isLast = index == body.lastIndex)
            }
        }
    }
}

private data class Cell(val text: String, val node: TableCell, val alignment: TextAlign?)

private fun cellStyle(color: androidx.compose.ui.graphics.Color, isHeader: Boolean) = TextStyle(
    fontFamily = ClaymarkFonts.Body,
    fontSize = TypeScale.code,
    color = color,
    fontWeight = if (isHeader) FontWeight.SemiBold else FontWeight.Normal,
)

@Composable
private fun TableRowView(
    row: List<Cell>,
    widths: List<Dp>,
    totalWidth: Dp,
    isHeader: Boolean,
    isLast: Boolean = false,
) {
    val c = colors
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            row.forEachIndexed { index, cell ->
                // shadcn's `<TableHead>`/`<TableCell>` (`.claymark-th`/
                // `.claymark-td`) both left-align by default — only an
                // explicit `:---:`/`---:` column alignment in the source
                // overrides that, matching claymark.css.
                val style = cellStyle(c.textPrimary, isHeader).copy(
                    textAlign = cell.alignment ?: TextAlign.Start,
                )
                val run = remember(cell.node, c) { buildInlines(cell.node, c) }
                Box(
                    modifier = Modifier
                        .width(widths.getOrElse(index) { 120.dp })
                        .padding(
                            horizontal = Space.s3,
                            vertical = if (isHeader) Space.s3 else Space.s2,
                        ),
                ) {
                    Text(
                        text = run.text,
                        inlineContent = run.inlineContent,
                        style = style,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
        // shadcn: `border-b` on every row, `[&_tr:last-child]:border-0` on body.
        // Same clayPot rim/sink alphas as the table's outer lip, so inner and
        // outer borders read as one consistent engraved treatment rather than
        // a flat line sitting inside a raised frame.
        if (!isLast) {
            val rimAlpha = if (c.isDark) 0.16f else 0.85f
            val sinkAlpha = if (c.isDark) 0.45f else 0.08f
            Column(modifier = Modifier.width(totalWidth)) {
                Box(
                    modifier = Modifier
                        .width(totalWidth)
                        .height(1.dp)
                        .background(Color.White.copy(alpha = rimAlpha)),
                )
                Box(
                    modifier = Modifier
                        .width(totalWidth)
                        .height(1.dp)
                        .background(Color.Black.copy(alpha = sinkAlpha)),
                )
            }
        }
    }
}

private fun rowsOf(block: TableBlock, header: Boolean): List<List<Cell>> {
    val section: Node? = generateSequence(block.firstChild) { it.next }
        .firstOrNull { if (header) it is TableHead else it is TableBody }
    section ?: return emptyList()

    return generateSequence(section.firstChild) { it.next }
        .filterIsInstance<TableRow>()
        .map { row ->
            generateSequence(row.firstChild) { it.next }
                .filterIsInstance<TableCell>()
                .map { cell ->
                    Cell(
                        text = collectText(cell),
                        node = cell,
                        // No explicit `:---:`/`---:` marker in the source
                        // means "no alignment specified" — the caller falls
                        // back to the CSS default (left), not a centered
                        // guess.
                        alignment = when (cell.alignment) {
                            TableCell.Alignment.LEFT -> TextAlign.Start
                            TableCell.Alignment.RIGHT -> TextAlign.End
                            TableCell.Alignment.CENTER -> TextAlign.Center
                            else -> null
                        },
                    )
                }
                .toList()
        }
        .toList()
}
