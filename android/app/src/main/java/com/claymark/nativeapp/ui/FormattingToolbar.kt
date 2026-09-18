package com.claymark.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.colors

/**
 * §2.7: bold/italic/link/list/code, inserted around the current selection
 * in [SourceEditor]. Text-glyph buttons rather than icons — no
 * `material-icons-extended` dependency in this project (`HelpGlyph` in
 * `ui/Screens.kt` set the same precedent for exactly this reason), and a
 * literal "B"/"I"/`` ` `` reads at least as clearly as a generic icon would
 * for a formatting toolbar specifically.
 */
@Composable
fun FormattingToolbar(
    onBold: () -> Unit,
    onItalic: () -> Unit,
    onCode: () -> Unit,
    onLink: () -> Unit,
    onList: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = Space.s2),
        horizontalArrangement = Arrangement.spacedBy(Space.s2),
    ) {
        ToolbarGlyphButton(onClick = onBold) {
            Text(
                text = "B",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.buttonCompact,
                    fontWeight = FontWeight.Bold,
                    color = c.textPrimary,
                ),
            )
        }
        ToolbarGlyphButton(onClick = onItalic) {
            Text(
                text = "I",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.buttonCompact,
                    fontStyle = FontStyle.Italic,
                    color = c.textPrimary,
                ),
            )
        }
        ToolbarGlyphButton(onClick = onCode) {
            Text(
                text = "</>",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Mono,
                    fontSize = TypeScale.small,
                    color = c.textPrimary,
                ),
            )
        }
        ToolbarGlyphButton(onClick = onLink) {
            Text(
                text = "Link",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.buttonCompact,
                    color = c.textPrimary,
                ),
            )
        }
        ToolbarGlyphButton(onClick = onList) {
            Text(
                text = "List",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.buttonCompact,
                    color = c.textPrimary,
                ),
            )
        }
    }
}

@Composable
private fun ToolbarGlyphButton(onClick: () -> Unit, content: @Composable () -> Unit) {
    ClayIconButton(compact = true, onClick = onClick, content = content)
}
