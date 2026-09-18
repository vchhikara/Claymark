package com.claymark.nativeapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayInset
import com.claymark.nativeapp.theme.colors

/**
 * §2.1/§2.8: a query row, always present, plus a replace row shown only in
 * edit mode (`showReplace`) — §2.8's find & replace is a from-scratch text
 * feature with nothing to port, so it shares this one bar rather than being
 * a second overlay.
 *
 * Scope note: navigation in VIEWING mode jumps to the nearest heading
 * containing the current match (reusing §2.2's outline scroll machinery),
 * not to the exact glyph — precise inline highlighting would mean injecting
 * match spans into the rendered AST, a materially bigger change than a
 * "jump next/prev" search bar earns right now. Replace in EDIT mode is
 * exact, since it operates on the plain source string directly.
 */
@Composable
fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    matchCount: Int,
    currentMatch: Int,
    onNext: () -> Unit,
    onPrev: () -> Unit,
    onClose: () -> Unit,
    showReplace: Boolean,
    replaceQuery: String,
    onReplaceQueryChange: (String) -> Unit,
    onReplaceOne: () -> Unit,
    onReplaceAll: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = colors
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(c.surface)
            .padding(horizontal = Space.s5, vertical = Space.s3),
        verticalArrangement = Arrangement.spacedBy(Space.s2),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Space.s2),
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clayInset(base = c.surfaceRaised, colors = c, radius = Radius.md)
                    .padding(horizontal = Space.s3, vertical = Space.s2),
            ) {
                BasicTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    singleLine = true,
                    textStyle = TextStyle(
                        fontFamily = ClaymarkFonts.Ui,
                        fontSize = TypeScale.button,
                        color = c.textPrimary,
                    ),
                    cursorBrush = androidx.compose.ui.graphics.SolidColor(c.accentBrand),
                    modifier = Modifier.fillMaxWidth(),
                    decorationBox = { inner ->
                        if (query.isEmpty()) {
                            Text(
                                text = "Find in document",
                                style = TextStyle(
                                    fontFamily = ClaymarkFonts.Ui,
                                    fontSize = TypeScale.button,
                                    color = c.textMuted,
                                ),
                            )
                        }
                        inner()
                    },
                )
            }

            Text(
                text = if (matchCount == 0) "0/0" else "${currentMatch + 1}/$matchCount",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Mono,
                    fontSize = TypeScale.small,
                    color = c.textMuted,
                ),
            )

            ClayIconButton(compact = true, onClick = onPrev, enabled = matchCount > 0, tooltip = "Previous match") {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Previous match", tint = c.textPrimary)
            }
            ClayIconButton(compact = true, onClick = onNext, enabled = matchCount > 0, tooltip = "Next match") {
                Icon(Icons.Filled.ArrowForward, contentDescription = "Next match", tint = c.textPrimary)
            }
            ClayIconButton(compact = true, onClick = onClose, tooltip = "Close search") {
                Icon(Icons.Filled.Close, contentDescription = "Close search", tint = c.textPrimary)
            }
        }

        if (showReplace) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Space.s2),
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clayInset(base = c.surfaceRaised, colors = c, radius = Radius.md)
                        .padding(horizontal = Space.s3, vertical = Space.s2),
                ) {
                    BasicTextField(
                        value = replaceQuery,
                        onValueChange = onReplaceQueryChange,
                        singleLine = true,
                        textStyle = TextStyle(
                            fontFamily = ClaymarkFonts.Ui,
                            fontSize = TypeScale.button,
                            color = c.textPrimary,
                        ),
                        cursorBrush = androidx.compose.ui.graphics.SolidColor(c.accentBrand),
                        modifier = Modifier.fillMaxWidth(),
                        decorationBox = { inner ->
                            if (replaceQuery.isEmpty()) {
                                Text(
                                    text = "Replace with",
                                    style = TextStyle(
                                        fontFamily = ClaymarkFonts.Ui,
                                        fontSize = TypeScale.button,
                                        color = c.textMuted,
                                    ),
                                )
                            }
                            inner()
                        },
                    )
                }
                ClayButton(label = "Replace", compact = true, enabled = matchCount > 0, onClick = onReplaceOne)
                ClayButton(label = "All", compact = true, enabled = matchCount > 0, onClick = onReplaceAll)
            }
        }
    }
}
