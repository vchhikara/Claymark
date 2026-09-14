package com.claymark.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.Theme
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors
import androidx.compose.foundation.clickable

/**
 * `.claymark-button[data-variant='outline']`, the only button variant the
 * reading UI ever uses.
 *
 * There is no loud primary CTA anywhere in this product: even Save and Edit
 * read as understated outline buttons, because the document is always the
 * visual priority over the chrome around it. The clay treatment adds depth,
 * not emphasis — the fill stays --surface-raised.
 */
@Composable
fun ClayButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    enabled: Boolean = true,
) {
    val c = colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()

    Box(
        modifier = modifier
            .clayRaised(
                base = c.surfaceRaised,
                colors = c,
                radius = Radius.md,
                pressed = pressed,
            )
            .border(1.dp, c.borderDefault, RoundedCornerShape(Radius.md))
            .clickable(
                interactionSource = interaction,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            )
            .padding(
                horizontal = if (compact) 15.3.dp else Space.s4,
                vertical = if (compact) 7.65.dp else Space.s2,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = TextStyle(
                // Inter is reserved for UI chrome. Never set a button label
                // in the body serif.
                fontFamily = ClaymarkFonts.Ui,
                fontSize = if (compact) TypeScale.buttonCompact else TypeScale.button,
                fontWeight = FontWeight.Medium,
                color = if (enabled) c.textPrimary else c.textMuted,
            ),
        )
    }
}

/**
 * `ThemeToggle.tsx`. A manual choice is persisted and thereafter always wins
 * over the system setting.
 */
@Composable
fun ThemeToggle(theme: Theme, onToggle: (Theme) -> Unit) {
    val next = if (theme == Theme.DARK) Theme.LIGHT else Theme.DARK
    ClayButton(
        label = if (theme == Theme.DARK) "\uD83C\uDF19" else "\u2600\uFE0F",
        compact = true,
        onClick = { onToggle(next) },
    )
}

/**
 * `.claymark-progress-track` / `-fill`. A slim indicator pinned to the left
 * edge, filled by the scroll fraction. Pure feedback, not a control.
 */
@Composable
fun ReadingProgressRail(progress: Float, modifier: Modifier = Modifier) {
    val c = colors
    Box(
        modifier = modifier
            .width(3.dp)
            .fillMaxHeight()
            .background(c.borderSubtle),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(progress.coerceIn(0.0001f, 1f))
                .background(c.accentBrand),
        )
    }
}

/** `.claymark-scroll-top`. */
@Composable
fun ScrollTopButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = colors
    Box(
        modifier = modifier
            .size(36.dp)
            .clayRaised(base = c.surfaceRaised, colors = c, radius = 18.dp)
            .border(1.dp, c.borderDefault, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "\u2191",
            style = TextStyle(
                fontFamily = ClaymarkFonts.Ui,
                fontSize = TypeScale.small,
                color = c.textPrimary,
            ),
        )
    }
}

/**
 * The status/alert strip used for a recovered draft and for a failed save.
 * Same shape in both cases; only the border color and the action differ.
 */
@Composable
fun NoticeRow(
    message: String,
    actionLabel: String,
    onAction: () -> Unit,
    isError: Boolean = false,
) {
    val c = colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = Space.s4)
            .clayRaised(base = c.surfaceRaised, colors = c, radius = Radius.md, elevation = 3.dp)
            .border(
                1.dp,
                if (isError) c.danger else c.borderDefault,
                RoundedCornerShape(Radius.md),
            )
            .padding(Space.s3),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = message,
            style = TextStyle(
                fontFamily = ClaymarkFonts.Ui,
                fontSize = TypeScale.small,
                color = c.textPrimary,
            ),
            modifier = Modifier.weight(1f),
        )
        Box(modifier = Modifier.width(Space.s3))
        ClayButton(label = actionLabel, compact = true, onClick = onAction)
    }
}
