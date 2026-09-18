package com.claymark.nativeapp.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Direct port of `src/theme/tokens.css`.
 *
 * The web layer stores colors as bare HSL triplets (`60 3.4% 98%`) and wraps
 * them in `hsl()` at use time, so the triplets are kept verbatim here and
 * converted by [hsl] rather than pre-resolved to hex. That way this file can
 * be diffed against tokens.css line for line, which is the stated
 * requirement: the CSS is the visual source of truth, not an approximation.
 */
object Neutral {
    val n100 = hsl(60f, 3.4f, 98f)
    val n200 = hsl(60f, 3.4f, 96f)
    val n300 = hsl(60f, 3.4f, 93f)
    val n400 = hsl(60f, 3.4f, 88f)
    val n500 = hsl(60f, 3.4f, 80f)
    val n600 = hsl(60f, 3.4f, 68f)
    val n700 = hsl(60f, 3.4f, 56f)
    val n800 = hsl(60f, 3.4f, 44f)
    val n900 = hsl(60f, 3.4f, 30f)
    val n1000 = hsl(60f, 3.4f, 15f)
    val n1100 = hsl(60f, 3.4f, 10f)
    val n1200 = hsl(60f, 3.4f, 7f)
}

/**
 * The clay accent ramp. These four are hex literals in tokens.css too — the
 * one place the palette deviates from the HSL-triplet convention.
 */
object Clay {
    val c400 = Color(0xFFE29981)
    val c500 = Color(0xFFD97757)
    val c600 = Color(0xFFC8542D)

    /**
     * T-P8-02: darkened from clay-600 so the light theme's link clears
     * WCAG AA 4.5:1 against `--surface`. clay-600 measured 4.23:1 and
     * clay-500 2.99:1; both failed. Never substitute clay-500 here.
     */
    val c700 = Color(0xFFBD4D28)
}

/** HSL with percent-valued saturation/lightness, matching CSS `hsl()`. */
fun hsl(h: Float, s: Float, l: Float, alpha: Float = 1f): Color {
    val sN = s / 100f
    val lN = l / 100f
    val c = (1f - kotlin.math.abs(2f * lN - 1f)) * sN
    val hp = h / 60f
    val x = c * (1f - kotlin.math.abs(hp.mod(2f) - 1f))
    val (r1, g1, b1) = when {
        hp < 1f -> Triple(c, x, 0f)
        hp < 2f -> Triple(x, c, 0f)
        hp < 3f -> Triple(0f, c, x)
        hp < 4f -> Triple(0f, x, c)
        hp < 5f -> Triple(x, 0f, c)
        else -> Triple(c, 0f, x)
    }
    val m = lN - c / 2f
    return Color(r1 + m, g1 + m, b1 + m, alpha)
}

/** Semantic color set — the `:root` / `[data-theme='dark']` blocks. */
@Immutable
data class ClaymarkColors(
    val surface: Color,
    val surfaceRaised: Color,
    val surfaceCode: Color,
    val pillBg: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val borderSubtle: Color,
    val borderDefault: Color,
    val link: Color,
    val quoteRule: Color,
    val accentBrand: Color,
    val danger: Color,
    val codeInline: Color,
    val codeRef: Color,
    val isDark: Boolean,
)

val LightColors = ClaymarkColors(
    surface = hsl(48f, 45f, 98f),
    surfaceRaised = Neutral.n200,
    surfaceCode = hsl(48f, 45f, 98f),
    pillBg = hsl(0f, 0f, 94f),
    textPrimary = Neutral.n1000,
    textSecondary = Neutral.n900,
    textMuted = Neutral.n800,
    borderSubtle = Neutral.n400,
    borderDefault = Neutral.n500,
    link = Clay.c700,
    // A dark blue reused from the syntax highlighter's light-theme `number`
    // token (Highlighter.kt) — same blue family the code blocks already
    // use, just promoted from "hard to see" grey to something with enough
    // saturation to actually register as an accent.
    quoteRule = Color(0xFF0550AE),
    accentBrand = Clay.c700,
    // `--danger` is only ever referenced through a CSS fallback in
    // claymark.css (`var(--danger, 0 70% 50%)`); it is never actually
    // declared, so the fallback IS the shipped value.
    danger = hsl(0f, 70f, 50f),
    codeInline = Color(0xFFA84545),
    codeRef = Color(0xFF3367D6),
    isDark = false,
)

val DarkColors = ClaymarkColors(
    surface = hsl(0f, 0f, 9.8f),
    surfaceRaised = Neutral.n1100,
    surfaceCode = hsl(0f, 0f, 18f),
    pillBg = hsl(0f, 0f, 18f),
    textPrimary = Neutral.n200,
    textSecondary = Neutral.n400,
    textMuted = Neutral.n600,
    borderSubtle = Neutral.n800,
    borderDefault = Neutral.n700,
    link = Clay.c400,
    // Same family as [LightColors.quoteRule], lightened to the syntax
    // highlighter's dark-theme `number` blue for dark-surface contrast.
    quoteRule = Color(0xFF6CB6FF),
    accentBrand = Clay.c500,
    danger = hsl(0f, 70f, 50f),
    // The inline-code and code-ref colors are theme-independent literals in
    // claymark.css (#a84545 / #3367d6) — carried across unchanged rather
    // than "fixed", since matching the shipped surface is the requirement.
    codeInline = Color(0xFFA84545),
    codeRef = Color(0xFF3367D6),
    isDark = true,
)

/**
 * The AMOLED variant: [DarkColors] with a true-black surface. Deliberately
 * *not* a full re-derived palette — every other token here (text, borders,
 * link, accent) was AA-contrast-verified against `hsl(0,0%,9.8%)`
 * (`docs/THEMING.md` §9), and every one of those pairs is text/border
 * *against the surface*, so a darker surface can only raise those ratios,
 * never lower them. `surfaceRaised`/`surfaceCode` are left at their existing
 * dark values on purpose: the elevation step between "surface" and "raised"
 * reads as more pronounced on true black than on `9.8%` lightness, which is
 * the expected, wanted effect of an AMOLED mode, not an oversight.
 */
val AmoledColors = DarkColors.copy(surface = Color.Black)

/**
 * The 11-step spacing scale. Values are the CSS rem figures resolved at the
 * root font size the app actually uses (`--text-body: 18px`), so
 * `--space-4: 1rem` is 18dp here, not 16dp. Getting this wrong is the single
 * easiest way to make the port "look close but feel wrong".
 */
object Space {
    private const val REM = 18f
    val s1: Dp = (0.25f * REM).dp
    val s2: Dp = (0.5f * REM).dp
    val s3: Dp = (0.75f * REM).dp
    val s4: Dp = (1f * REM).dp
    val s5: Dp = (1.25f * REM).dp
    val s6: Dp = (1.5f * REM).dp
    val s7: Dp = (2f * REM).dp
    val s8: Dp = (2.5f * REM).dp
    val s9: Dp = (3f * REM).dp
    val s10: Dp = (4f * REM).dp
    val s11: Dp = (5f * REM).dp
    val s12: Dp = (6f * REM).dp
}

/** Three radius steps, no fourth. */
object Radius {
    val sm: Dp = 4.dp
    val md: Dp = 8.dp
    val lg: Dp = 12.dp
}

/** Type scale. Headings are all body serif at weight 600. */
object TypeScale {
    val body: TextUnit = 18.sp
    const val LEADING_BODY = 1.4f
    val code: TextUnit = 15.sp
    val codeBlock: TextUnit = 12.sp

    val h1: TextUnit = 36.sp // 2rem
    const val LEADING_H1 = 1.2f
    val h2: TextUnit = 28.8f.sp // 1.6rem
    const val LEADING_H2 = 1.25f
    val h3: TextUnit = 24.3f.sp // 1.35rem
    const val LEADING_H3 = 1.3f
    val h4: TextUnit = 20.7f.sp // 1.15rem
    const val LEADING_H4 = 1.35f
    val h5: TextUnit = 18.sp // 1rem
    const val LEADING_H5 = 1.4f
    val h6: TextUnit = 16.2f.sp // 0.9rem
    const val LEADING_H6 = 1.4f

    /** `.claymark-button` is 0.875rem; `--compact` is 0.75rem. */
    val button: TextUnit = 15.75f.sp
    val buttonCompact: TextUnit = 13.5f.sp
    val small: TextUnit = 14.6f.sp // 0.8125rem — alert/status rows
}

/** `--measure: 48rem`, the hard cap on reading width. */
val Measure: Dp = (48f * 18f).dp
