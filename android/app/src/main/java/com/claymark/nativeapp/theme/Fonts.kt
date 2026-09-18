package com.claymark.nativeapp.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.claymark.nativeapp.R

/**
 * The three typefaces from `src/theme/fonts.css`, each with one job:
 * Source Serif 4 for reading body, Inter for UI chrome, JetBrains Mono for
 * code. The exact same six weights ship here as in `public/fonts/` — the
 * woff2 files were converted to ttf because Android's font loader has no
 * woff2 support, but they are the same glyph outlines from the same release.
 *
 * Never set document content in Inter, and never set a button or header
 * label in Source Serif 4 — that split is what keeps the reading surface
 * visually distinct from the shell.
 */
object ClaymarkFonts {
    val Body = FontFamily(
        Font(R.font.source_serif_4_latin_400, FontWeight.Normal),
        Font(R.font.source_serif_4_latin_600, FontWeight.SemiBold),
    )

    val Ui = FontFamily(
        Font(R.font.inter_latin_400, FontWeight.Normal),
        Font(R.font.inter_latin_600, FontWeight.SemiBold),
    )

    val Mono = FontFamily(
        Font(R.font.jetbrains_mono_latin_400, FontWeight.Normal),
        Font(R.font.jetbrains_mono_latin_700, FontWeight.Bold),
    )
}
