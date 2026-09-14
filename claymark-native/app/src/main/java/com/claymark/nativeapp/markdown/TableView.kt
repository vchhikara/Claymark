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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
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

    val head = remember(block) { rowsOf(block, header = true) }
    val body = remember(block) { rowsOf(block, header = false) }
    val columnCount = ((head + body).maxOfOrNull { it.size } ?: 0)
    if (columnCount == 0) return

    // Compose has no auto table layout, so column widths are derived from the
    // longest cell in each column and clamped. Anything wider than the
    // viewport scrolls inside this container.
    val widths = remember(head, body) {
        (0 until columnCount).map { index ->
            val longest = (head + body)
                .mapNotNull { it.getOrNull(index) }
                .maxOfOrNull { it.text.length } ?: 0
            (longest.coerceIn(6, 44) * 8).dp
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = Space.s4),
    ) {
        Column(modifier = Modifier.horizontalScroll(scroll)) {
            head.forEach { row ->
                TableRowView(row, widths, isHeader = true)
            }
            body.forEachIndexed { index, row ->
                TableRowView(row, widths, isHeader = false, isLast = index == body.lastIndex)
            }
        }
    }
}

private data class Cell(val text: String, val node: TableCell, val alignment: TextAlign)

@Composable
private fun TableRowView(
    row: List<Cell>,
    widths: List<androidx.compose.ui.unit.Dp>,
    isHeader: Boolean,
    isLast: Boolean = false,
) {
    val c = colors
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            row.forEachIndexed { index, cell ->
                val style = TextStyle(
                    fontFamily = ClaymarkFonts.Body,
                    fontSize = TypeScale.code,
                    color = c.textPrimary,
                    fontWeight = if (isHeader) FontWeight.SemiBold else FontWeight.Normal,
                    // `.claymark-th`/`.claymark-td` both centre by default;
                    // an explicit column alignment in the source wins.
                    textAlign = cell.alignment,
                )
                Box(
                    modifier = Modifier
                        .width(widths.getOrElse(index) { 120.dp })
                        .padding(
                            horizontal = Space.s3,
                            vertical = if (isHeader) Space.s3 else Space.s2,
                        ),
                ) {
                    Text(
                        text = buildInlines(cell.node, c),
                        style = style,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
        // shadcn: `border-b` on every row, `[&_tr:last-child]:border-0` on body.
        if (!isLast) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(c.borderDefault),
            )
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
                        alignment = when (cell.alignment) {
                            TableCell.Alignment.LEFT -> TextAlign.Start
                            TableCell.Alignment.RIGHT -> TextAlign.End
                            TableCell.Alignment.CENTER -> TextAlign.Center
                            else -> TextAlign.Center
                        },
                    )
                }
                .toList()
        }
        .toList()
}
