package com.claymark.nativeapp.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors
import kotlinx.coroutines.delay

/**
 * Port of shadcn's `Sonner` toast — a from-scratch component on web too (no
 * Radix primitive underneath), so this is a from-scratch build here as
 * well, not a re-styling of an M3 `Snackbar` (M3 has no first-party
 * equivalent that matches this app's small, corner-anchored, non-blocking
 * shape as closely as `Snackbar` does for a full-width bottom bar).
 *
 * Its one real use so far: autosave (silent, no user-initiated tap to
 * anchor feedback to) completing while the header's own status subtitle is
 * out of the user's focus. The header subtitle stays as the persistent,
 * glanceable state; this is the transient, noticed-in-the-corner-of-the-eye
 * confirmation — same relationship Sonner has to a page's own inline status
 * text.
 */
data class ToastData(val message: String, val id: Long = System.nanoTime())

class ToastState {
    var current by mutableStateOf<ToastData?>(null)
        private set

    fun show(message: String) {
        current = ToastData(message)
    }

    fun clear() {
        current = null
    }
}

@Composable
fun rememberToastState(): ToastState = remember { ToastState() }

@Composable
fun ToastHost(state: ToastState, modifier: Modifier = Modifier) {
    val c = colors
    val toast = state.current

    LaunchedEffect(toast?.id) {
        if (toast != null) {
            delay(2200)
            state.clear()
        }
    }

    AnimatedVisibility(
        visible = toast != null,
        enter = fadeIn() + slideInVertically { it / 2 },
        exit = fadeOut() + slideOutVertically { it / 2 },
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .clayRaised(base = c.surfaceRaised, colors = c, radius = Radius.md, elevation = 6.dp)
                .border(1.dp, c.borderDefault, RoundedCornerShape(Radius.md))
                .padding(horizontal = Space.s4, vertical = Space.s3),
        ) {
            Text(
                text = toast?.message.orEmpty(),
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.small,
                    color = c.textPrimary,
                ),
            )
        }
    }
}
