package com.claymark.nativeapp.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.claymark.nativeapp.markdown.ImagePayload
import com.claymark.nativeapp.markdown.UrlPolicy
import com.claymark.nativeapp.session.AbandonChoice
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors

/**
 * The unsaved-changes prompt. Back, Open file, and system Back all resolve
 * through this one Save/Discard/Cancel dialog.
 *
 * It is a real Dialog rather than an in-layout overlay specifically because
 * of the on-device finding behind `overflow-x: hidden` in claymark.css: a
 * runaway-width row once dragged a fixed-position modal out from under the
 * viewport and made its buttons untappable. A platform dialog window cannot
 * be pushed off-screen by content layout.
 */
@Composable
fun AbandonDialog(
    documentName: String?,
    onChoice: (AbandonChoice) -> Unit,
) {
    val c = colors
    Dialog(
        onDismissRequest = { onChoice(AbandonChoice.CANCEL) },
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = true),
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 360.dp)
                .clayRaised(base = c.surface, colors = c, radius = Radius.lg, elevation = 16.dp)
                .padding(Space.s5),
            verticalArrangement = Arrangement.spacedBy(Space.s4),
        ) {
            Text(
                text = "Save changes to ${documentName ?: "this document"}?",
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.button,
                    color = c.textPrimary,
                ),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Space.s2, Alignment.End),
            ) {
                ClayButton("Cancel", compact = true, onClick = { onChoice(AbandonChoice.CANCEL) })
                ClayButton("Discard", compact = true, onClick = { onChoice(AbandonChoice.DISCARD) })
                ClayButton("Save", compact = true, onClick = { onChoice(AbandonChoice.SAVE) })
            }
        }
    }
}

/**
 * Port of `Lightbox.tsx`. Tap an image to enlarge; tapping outside or the
 * system Back closes it and returns to where you were — the Android
 * equivalent of Escape plus focus restoration.
 */
@Composable
fun ImageLightbox(payload: ImagePayload, onClose: () -> Unit) {
    val bytes = remember(payload.src) { UrlPolicy.decodeDataImage(payload.src) }
    val bitmap = remember(bytes) {
        bytes?.let {
            runCatching { android.graphics.BitmapFactory.decodeByteArray(it, 0, it.size) }.getOrNull()
        }
    }
    if (bitmap == null) {
        // Nothing decodable to enlarge. Closing is a side effect, so it runs
        // in an effect rather than during composition.
        androidx.compose.runtime.LaunchedEffect(payload.src) { onClose() }
        return
    }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false,
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.7f))
                .clickable(onClick = onClose)
                .padding(Space.s4),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = payload.alt ?: payload.title ?: "Image preview",
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
