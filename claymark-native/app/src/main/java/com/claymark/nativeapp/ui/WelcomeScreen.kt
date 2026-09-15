package com.claymark.nativeapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.colors

/**
 * The cold-launch (`ACTION_MAIN`/launcher-icon) state — distinct from
 * `SessionMode.NO_DOCUMENT` rendering the bundled sample through the full
 * reader chrome (see `ClaymarkApp.kt`'s `SAMPLE_MD`), which is what a real
 * opened document looks like and shouldn't be the first thing a new user
 * sees. "Open with" (`ACTION_VIEW`) never routes through this screen at all
 * — `MainActivity` only shows it once `DocumentSession.hasPendingLaunch` is
 * false, so a file-manager launch goes straight to the real document.
 *
 * Concept A from the brainstorm pass: minimal, centered, two actions — no
 * hamburger-adjacent chrome beyond drawer access, since this screen has no
 * document to show progress/status for.
 */
@Composable
fun WelcomeScreen(
    onOpenDrawer: () -> Unit,
    onOpenFile: () -> Unit,
    onViewSample: () -> Unit,
) {
    val c = colors

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(c.surface),
    ) {
        Box(
            modifier = Modifier
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(Space.s5),
        ) {
            DrawerMenuButton(onClick = onOpenDrawer)
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = Space.s6),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            ClaymarkWordmark(size = 32.sp)

            Box(modifier = Modifier.padding(top = Space.s3))

            Text(
                text = "A Markdown renderer built for streamed, untrusted LLM output.",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Body,
                    fontSize = TypeScale.body,
                    lineHeight = TypeScale.body * 1.4f,
                    color = c.textMuted,
                    textAlign = TextAlign.Center,
                ),
                modifier = Modifier.widthIn(max = 280.dp),
            )

            Box(modifier = Modifier.padding(top = Space.s8))

            ClayButton(
                label = "Open file",
                onClick = onOpenFile,
                modifier = Modifier.fillMaxWidth(0.7f),
            )

            Box(modifier = Modifier.padding(top = Space.s4))

            Text(
                text = "View sample",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.button,
                    color = c.textMuted,
                ),
                modifier = Modifier.clickable(onClick = onViewSample),
            )
        }
    }
}
