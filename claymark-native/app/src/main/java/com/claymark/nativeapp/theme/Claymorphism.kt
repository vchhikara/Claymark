package com.claymark.nativeapp.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Claymorphism layer.
 *
 * Scoped deliberately to *chrome only* — buttons, the header, dialogs, the
 * code-block container, the editor field. The reading surface (body prose,
 * headings, lists, blockquotes, tables) is left exactly as tokens.css
 * specifies, because `brand_guidelines.md` §7 is explicit that Claymark is
 * "not loud" and that the document, not the shell, is the visual priority.
 *
 * The treatment is therefore soft rather than the usual inflated pastel
 * claymorphism: a diffuse drop shadow below-right, a light inner rim
 * above-left, and a very shallow vertical tint gradient across the fill. No
 * new radius step is introduced — everything still rounds to one of
 * Radius.sm/md/lg, per §5 of the guidelines.
 */
object Claymorph {
    /** Depth of the outer soft shadow for a resting control. */
    val RestElevation: Dp = 6.dp

    /** Pressed controls flatten rather than invert, matching `:active`. */
    val PressedElevation: Dp = 1.dp
}

/**
 * A raised clay surface: diffuse shadow, inner top-left rim light, shallow
 * fill gradient. `base` is the token color the element would have had in the
 * web build (usually `--surface-raised`), so removing this modifier leaves a
 * flat but still correct control.
 */
fun Modifier.clayRaised(
    base: Color,
    colors: ClaymarkColors,
    radius: Dp = Radius.md,
    elevation: Dp = Claymorph.RestElevation,
    pressed: Boolean = false,
): Modifier {
    val shape = RoundedCornerShape(radius)
    val depth = if (pressed) Claymorph.PressedElevation else elevation

    // Dark themes need a stronger ambient and a much weaker rim light, or the
    // highlight reads as a white outline rather than a lit edge.
    val shadowAlpha = if (colors.isDark) 0.55f else 0.16f
    val rimAlpha = if (colors.isDark) 0.06f else 0.85f
    val sinkAlpha = if (colors.isDark) 0.18f else 0.05f

    return this
        .shadow(
            elevation = depth,
            shape = shape,
            clip = false,
            ambientColor = Color.Black.copy(alpha = shadowAlpha),
            spotColor = Color.Black.copy(alpha = shadowAlpha),
        )
        .background(
            brush = Brush.verticalGradient(
                listOf(
                    lighten(base, if (colors.isDark) 0.05f else 0.035f),
                    base,
                    darken(base, if (colors.isDark) 0.04f else 0.03f),
                ),
            ),
            shape = shape,
        )
        .drawBehind {
            if (pressed) return@drawBehind
            // Inner rim light along the top-left edge — drawn as a thin
            // rounded stroke rather than a border so it fades diagonally.
            val stroke = 1.5.dp.toPx()
            drawRoundRect(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color.White.copy(alpha = rimAlpha),
                        Color.Transparent,
                        Color.Black.copy(alpha = sinkAlpha),
                    ),
                    start = Offset.Zero,
                    end = Offset(size.width, size.height),
                ),
                topLeft = Offset(stroke / 2f, stroke / 2f),
                size = Size(size.width - stroke, size.height - stroke),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(radius.toPx()),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke),
            )
        }
}

/**
 * The inset counterpart, used for the editor textarea — `.cm-source-textarea`
 * already carried an inset box-shadow in claymark.css, so this is the same
 * idea pushed slightly further rather than a new invention.
 */
fun Modifier.clayInset(
    base: Color,
    colors: ClaymarkColors,
    radius: Dp = Radius.md,
): Modifier {
    val shape = RoundedCornerShape(radius)
    val topShade = if (colors.isDark) 0.28f else 0.07f
    return this
        .background(base, shape)
        .drawBehind {
            drawRoundRect(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color.Black.copy(alpha = topShade),
                        Color.Transparent,
                    ),
                    endY = size.height * 0.18f,
                ),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(radius.toPx()),
            )
        }
}

private fun lighten(color: Color, amount: Float): Color = Color(
    red = (color.red + amount).coerceAtMost(1f),
    green = (color.green + amount).coerceAtMost(1f),
    blue = (color.blue + amount).coerceAtMost(1f),
    alpha = color.alpha,
)

private fun darken(color: Color, amount: Float): Color = Color(
    red = (color.red - amount).coerceAtLeast(0f),
    green = (color.green - amount).coerceAtLeast(0f),
    blue = (color.blue - amount).coerceAtLeast(0f),
    alpha = color.alpha,
)
