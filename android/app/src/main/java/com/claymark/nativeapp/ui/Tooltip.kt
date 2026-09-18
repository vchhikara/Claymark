package com.claymark.nativeapp.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors
import kotlinx.coroutines.delay

/**
 * Port of shadcn's `Tooltip` (Radix `Tooltip.Root`/`Content`: behavior kept,
 * styling replaced — same idiom used for [ClaySwitch] against a bare
 * `Switch`). Radix activates on hover; touch has no hover, so a long-press
 * on the trigger (wired via `ClayIconButton`'s `tooltip` param and
 * [ScrollTopButton]) is the equivalent gesture, auto-dismissing rather than
 * needing a second tap.
 *
 * Web's `bg-foreground text-background` pairing becomes the same inversion
 * here: a dark bubble in light theme, a light bubble in dark theme.
 */
@Composable
fun ClayTooltipPopup(text: String, visible: Boolean, onDismiss: () -> Unit) {
    if (!visible) return
    val c = colors

    LaunchedEffect(text) {
        delay(1800)
        onDismiss()
    }

    Popup(
        alignment = Alignment.TopCenter,
        offset = IntOffset(0, -110),
        properties = PopupProperties(focusable = false),
        onDismissRequest = onDismiss,
    ) {
        Box(
            modifier = Modifier
                .clayRaised(base = c.textPrimary, colors = c, radius = Radius.sm, elevation = 3.dp)
                .padding(horizontal = Space.s3, vertical = Space.s1),
        ) {
            Text(
                text = text,
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.small,
                    color = c.surface,
                ),
            )
        }
    }
}
