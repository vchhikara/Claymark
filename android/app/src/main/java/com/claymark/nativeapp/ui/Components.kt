@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

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
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.Icon
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.Theme
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlin.math.cos
import kotlin.math.sin

/**
 * The real wordmark (`brand/logo/wordmark-light.svg` /
 * `wordmark-dark.svg`), ported as live text rather than a rasterized or
 * outlined-to-paths image — the SVG's own `<desc>` says as much: it's
 * "text-based, not outlined to paths," meaning a faithful port just needs
 * the same font/weight/spacing, which this app already bundles
 * ([ClaymarkFonts.Ui] SemiBold is the exact same Inter 600 file). Lowercase
 * "claymark", never the all-caps/serif treatment the drawer header used
 * before this — that was a plain styled [Text], not the wordmark.
 *
 * `letterSpacing` of `-0.0125em` reproduces the SVG's `-2` tracking value at
 * its `font-size="160"` (`-2/160 = -0.0125`), so it scales correctly at any
 * [size] rather than being pinned to the SVG's specific pixel size.
 */
@Composable
fun ClaymarkWordmark(
    modifier: Modifier = Modifier,
    size: TextUnit = 22.sp,
    color: Color = colors.textPrimary,
    text: String = "claymark",
) {
    Text(
        text = text,
        style = TextStyle(
            fontFamily = ClaymarkFonts.Ui,
            fontWeight = FontWeight.SemiBold,
            fontSize = size,
            letterSpacing = (-0.0125).em,
            color = color,
        ),
        modifier = modifier,
    )
}

/**
 * `.claymark-button[data-variant='outline']`, the only button variant the
 * reading UI ever uses.
 *
 * There is no loud primary CTA anywhere in this product: even Save and Edit
 * read as understated outline buttons, because the document is always the
 * visual priority over the chrome around it. The clay treatment adds depth,
 * not emphasis — the fill stays --surface-raised.
 */
/**
 * Every compact header control — label buttons and icon-only buttons alike
 * — is pinned to this height. Left to intrinsic sizing, a text button (its
 * height set by a ~14sp glyph) and an icon button (a fixed 24dp Material
 * icon) come out visibly different heights in the same row; a shared fixed
 * height is what actually guarantees they match, not matching padding.
 */
val HeaderControlHeight = 36.dp

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
            .then(if (compact) Modifier.height(HeaderControlHeight) else Modifier)
            .clayRaised(
                base = c.surfaceRaised,
                colors = c,
                radius = Radius.md,
                pressed = pressed,
            )
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
 * Icon-content sibling of [ClayButton] — same clay chrome (raised surface,
 * pressed inset, border), but the content slot is a small vector glyph
 * instead of a text label. Used wherever the label was previously a
 * platform emoji (sun/moon/back-arrow): those render as full-color,
 * OS-skinned pictures that clash with the claymorphism palette — a
 * monochrome vector tinted from [colors] reads as UI, not a sticker on it.
 */
@Composable
fun ClayIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = true,
    enabled: Boolean = true,
    // Radix's Tooltip on web activates on hover; touch has no hover, so
    // long-press on the trigger is the equivalent gesture. Only icon-only
    // buttons need this — a labeled [ClayButton] already carries its own
    // meaning in visible text.
    tooltip: String? = null,
    content: @Composable () -> Unit,
) {
    val c = colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    var showTooltip by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .then(if (compact) Modifier.height(HeaderControlHeight) else Modifier)
            .clayRaised(
                base = c.surfaceRaised,
                colors = c,
                radius = Radius.md,
                pressed = pressed,
            )
            .combinedClickable(
                interactionSource = interaction,
                indication = null,
                enabled = enabled,
                onClick = onClick,
                onLongClick = tooltip?.let { { showTooltip = true } },
            )
            .padding(
                horizontal = if (compact) 11.dp else Space.s3,
                vertical = if (compact) 7.65.dp else Space.s2,
            ),
        contentAlignment = Alignment.Center,
    ) {
        content()
        if (tooltip != null) {
            ClayTooltipPopup(text = tooltip, visible = showTooltip, onDismiss = { showTooltip = false })
        }
    }
}

/**
 * `ThemeToggle.tsx`. A manual choice is persisted and thereafter always wins
 * over the system setting. Drawn as flat single-color glyphs (a ring of
 * rays for light, a crescent for dark) rather than the platform's
 * full-color sun/moon emoji, so the toggle reads as UI chrome, not a
 * sticker.
 */
@Composable
fun ThemeToggle(theme: Theme, onToggle: (Theme) -> Unit) {
    val c = colors
    val next = if (theme == Theme.DARK) Theme.LIGHT else Theme.DARK
    ClayIconButton(
        compact = true,
        onClick = { onToggle(next) },
        tooltip = if (theme == Theme.DARK) "Switch to light" else "Switch to dark",
    ) {
        if (theme == Theme.DARK) MoonGlyph(c.textPrimary) else SunGlyph(c.textPrimary)
    }
}

@Composable
private fun SunGlyph(tint: Color, size: androidx.compose.ui.unit.Dp = 18.dp) {
    Canvas(modifier = Modifier.size(size)) {
        val strokeWidth = 1.6.dp.toPx()
        val center = Offset(this.size.width / 2f, this.size.height / 2f)
        val coreRadius = this.size.minDimension * 0.24f
        drawCircle(color = tint, radius = coreRadius, center = center, style = Stroke(strokeWidth))
        val rayInner = coreRadius + strokeWidth * 1.6f
        val rayOuter = this.size.minDimension / 2f
        for (i in 0 until 8) {
            val angle = (i * (360f / 8)) * (Math.PI.toFloat() / 180f)
            val start = Offset(
                center.x + rayInner * cos(angle),
                center.y + rayInner * sin(angle),
            )
            val end = Offset(
                center.x + rayOuter * cos(angle),
                center.y + rayOuter * sin(angle),
            )
            drawLine(tint, start, end, strokeWidth = strokeWidth, cap = androidx.compose.ui.graphics.StrokeCap.Round)
        }
    }
}

@Composable
private fun MoonGlyph(tint: Color, size: androidx.compose.ui.unit.Dp = 18.dp) {
    Canvas(modifier = Modifier.size(size)) {
        val radius = this.size.minDimension * 0.4f
        val center = Offset(this.size.width / 2f, this.size.height / 2f)
        // A crescent: the full disc minus an off-center circle of the same
        // radius, via even-odd path fill — no clip/blend-mode needed.
        val path = androidx.compose.ui.graphics.Path().apply {
            addOval(androidx.compose.ui.geometry.Rect(center, radius))
            addOval(
                androidx.compose.ui.geometry.Rect(
                    Offset(center.x + radius * 0.55f, center.y - radius * 0.25f),
                    radius,
                ),
            )
            fillType = androidx.compose.ui.graphics.PathFillType.EvenOdd
        }
        drawPath(path, color = tint)
    }
}

/**
 * The drawer trigger. Same clay-chrome idiom as [ThemeToggle] and the
 * back-navigation button — a monochrome vector glyph, not a platform emoji.
 */
@Composable
fun DrawerMenuButton(onClick: () -> Unit) {
    val c = colors
    ClayIconButton(compact = true, onClick = onClick, tooltip = "Menu") {
        Icon(Icons.Filled.Menu, contentDescription = "Menu", tint = c.textPrimary)
    }
}

/** Shared back-navigation glyph — replaces the bare "←" text label. */
@Composable
fun ClayBackButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = colors
    ClayIconButton(compact = true, onClick = onClick, modifier = modifier, tooltip = "Back") {
        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = c.textPrimary)
    }
}

/**
 * A [androidx.compose.material3.Switch] explicitly recolored against our own
 * tokens. This app deliberately never wraps content in `MaterialTheme`, so
 * an un-colored M3 `Switch` would fall back to the M3 baseline scheme's
 * purple — every use of it needs this wrapper, not the bare component.
 */
@Composable
fun ClaySwitch(checked: Boolean, onCheckedChange: (Boolean) -> Unit, enabled: Boolean = true) {
    val c = colors
    androidx.compose.material3.Switch(
        checked = checked,
        onCheckedChange = onCheckedChange,
        enabled = enabled,
        colors = SwitchDefaults.colors(
            checkedThumbColor = c.surface,
            checkedTrackColor = c.accentBrand,
            checkedBorderColor = c.accentBrand,
            uncheckedThumbColor = c.textMuted,
            uncheckedTrackColor = c.surfaceRaised,
            uncheckedBorderColor = c.borderDefault,
        ),
    )
}

/**
 * `.claymark-progress-track` / `-fill`. A slim indicator pinned to the left
 * edge, filled by the scroll fraction. Pure feedback, not a control.
 */
@Composable
fun ReadingProgressRail(progress: Float, modifier: Modifier = Modifier) {
    val c = colors
    // No unfilled track drawn here — it sits directly over the app's own
    // drawer/page divider line (MainActivity's 1dp separator, or the
    // drawer's own edge in phone mode), which already reads as the
    // "unfilled" state. Drawing a second one on top just doubled its
    // apparent thickness.
    Box(
        modifier = modifier
            .width(3.dp)
            .fillMaxHeight(),
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
    var showTooltip by remember { mutableStateOf(false) }
    Box(
        modifier = modifier
            .size(36.dp)
            .clayRaised(base = c.surfaceRaised, colors = c, radius = 18.dp)
            .combinedClickable(onClick = onClick, onLongClick = { showTooltip = true }),
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
        ClayTooltipPopup(text = "Scroll to top", visible = showTooltip, onDismiss = { showTooltip = false })
    }
}

/**
 * Port of shadcn's `Badge` (`rounded-full`, small, pill-shaped label; no
 * Radix primitive underneath, pure markup/style on web). Used for the
 * code-block language label in place of plain text — same idiom already
 * established by the inline-code pill in `Inlines.kt` (`colors.pillBg`),
 * just fully rounded instead of `Radius.sm`.
 */
@Composable
fun ClayBadge(text: String, modifier: Modifier = Modifier) {
    val c = colors
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(c.pillBg)
            .padding(horizontal = Space.s2, vertical = 2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = TextStyle(
                fontFamily = ClaymarkFonts.Mono,
                fontSize = TypeScale.small,
                fontWeight = FontWeight.Medium,
                color = c.textSecondary,
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
            .then(
                if (isError) {
                    Modifier.border(1.dp, c.danger, RoundedCornerShape(Radius.md))
                } else {
                    Modifier
                },
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
