package com.claymark.nativeapp.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.claymark.nativeapp.markdown.HeadingEntry
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors

/**
 * §2.2: a tap-to-jump list over data [com.claymark.nativeapp.markdown.collectHeadings]
 * already produces from the parsed AST — same `Dialog` + `clayRaised` column
 * idiom as [ThemePickerDialog], the established pattern for a small choice
 * list in this app.
 */
@Composable
fun TableOfContentsDialog(
    headings: List<HeadingEntry>,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val c = colors
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .widthIn(max = 340.dp)
                .heightIn(max = 480.dp)
                .clayRaised(base = c.surface, colors = c, radius = Radius.lg, elevation = 16.dp)
                .padding(Space.s4),
        ) {
            Text(
                text = "Outline",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.button,
                    fontWeight = FontWeight.SemiBold,
                    color = c.textPrimary,
                ),
                modifier = Modifier.padding(bottom = Space.s3),
            )
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                headings.forEach { heading ->
                    Text(
                        text = heading.text,
                        style = TextStyle(
                            fontFamily = ClaymarkFonts.Ui,
                            fontSize = TypeScale.small,
                            fontWeight = if (heading.level <= 2) FontWeight.SemiBold else FontWeight.Normal,
                            color = c.textPrimary,
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(heading.slug) }
                            .padding(
                                start = ((heading.level - 1) * 12).dp,
                                top = Space.s2,
                                bottom = Space.s2,
                            ),
                    )
                }
            }
        }
    }
}
