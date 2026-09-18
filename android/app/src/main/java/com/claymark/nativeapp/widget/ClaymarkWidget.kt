package com.claymark.nativeapp.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.unit.dp
import com.claymark.nativeapp.MainActivity
import com.claymark.nativeapp.documents.RecentFilesStore

/**
 * §1.1: shows the last-opened document's name, tap-to-resume. Passive by
 * design — reads §2.3's already-maintained MRU list, no computation, no
 * `WorkManager` poll; [ClaymarkWidgetReceiver]/[com.claymark.nativeapp.session.DocumentSession]
 * push an update only on the actual "a document was opened/saved" event.
 *
 * Colors are fixed brand constants rather than read from `theme.colors` —
 * Glance composables render outside the app's own `CompositionLocal` tree
 * (a separate `RemoteViews` process), so the normal `ClaymarkTheme`
 * provider never reaches here. `GlanceTheme`/dynamic color is deliberately
 * not used for the same reason §1.5 gives for the app itself: brand color,
 * not wallpaper-derived. Scoped to the light palette only for this pass —
 * a real day/night pair needs `@color` XML resources with a `night`
 * qualifier for `ColorProvider(resId)`, a small enough follow-up to not
 * hold up the widget itself.
 */
class ClaymarkWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val recent = RecentFilesStore(context).list().firstOrNull()
        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(SURFACE_LIGHT))
                    .padding(12.dp)
                    .then(
                        if (recent != null) {
                            GlanceModifier.clickable(
                                onClick = actionStartActivity(
                                    Intent(context, MainActivity::class.java).apply {
                                        action = Intent.ACTION_VIEW
                                        data = Uri.parse(recent.uri)
                                    },
                                ),
                            )
                        } else {
                            GlanceModifier.clickable(
                                onClick = actionStartActivity(Intent(context, MainActivity::class.java)),
                            )
                        },
                    ),
                verticalAlignment = Alignment.CenterVertically,
                horizontalAlignment = Alignment.Start,
            ) {
                Text(
                    text = "Claymark",
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(TEXT_MUTED_LIGHT),
                    ),
                )
                Text(
                    text = recent?.name ?: "Open a document",
                    maxLines = 2,
                    style = TextStyle(
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(TEXT_PRIMARY_LIGHT),
                    ),
                )
            }
        }
    }

    companion object {
        /** Called from [com.claymark.nativeapp.session.DocumentSession] whenever
         *  the MRU list changes — event-driven, not polled. */
        suspend fun refreshAll(context: Context) {
            val manager = GlanceAppWidgetManager(context)
            val ids = manager.getGlanceIds(ClaymarkWidget::class.java)
            if (ids.isNotEmpty()) ClaymarkWidget().let { widget -> ids.forEach { widget.update(context, it) } }
        }
    }
}

// Fixed brand colors — same values as theme/Tokens.kt's surface/text tokens,
// duplicated rather than shared because Glance's ColorProvider type isn't
// the Compose UI `Color` the main theme system already carries.
private val SURFACE_LIGHT = androidx.compose.ui.graphics.Color(0xFFFAF9F5)
private val SURFACE_DARK = androidx.compose.ui.graphics.Color(0xFF191919)
private val TEXT_PRIMARY_LIGHT = androidx.compose.ui.graphics.Color(0xFF262626)
private val TEXT_PRIMARY_DARK = androidx.compose.ui.graphics.Color(0xFFF2F2F2)
private val TEXT_MUTED_LIGHT = androidx.compose.ui.graphics.Color(0xFF737373)
private val TEXT_MUTED_DARK = androidx.compose.ui.graphics.Color(0xFFA3A3A3)
