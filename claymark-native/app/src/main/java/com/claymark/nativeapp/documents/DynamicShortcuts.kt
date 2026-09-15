package com.claymark.nativeapp.documents

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.claymark.nativeapp.MainActivity
import com.claymark.nativeapp.R

/**
 * Brainstorm §1.2's dynamic half: up to 3 most-recent documents pushed as
 * launcher shortcuts, refreshed on every [RecentFilesStore.record] — same
 * underlying MRU data §2.3's drawer list already reads, just a second
 * surface for it.
 *
 * Each shortcut's target intent is an explicit `ACTION_VIEW` at
 * [MainActivity] carrying the document's content URI — the same path
 * `captureLaunchIntent` already handles for "Open with", since an explicit
 * intent to a named component bypasses intent-filter matching entirely.
 */
object DynamicShortcuts {
    private const val MAX_SHORTCUTS = 3

    fun update(context: Context, recentFiles: List<RecentFile>) {
        try {
            val shortcuts = recentFiles.take(MAX_SHORTCUTS).mapIndexed { index, file ->
                ShortcutInfoCompat.Builder(context, "recent-${file.uri}")
                    .setShortLabel(file.name)
                    .setIcon(IconCompat.createWithResource(context, R.drawable.ic_shortcut_open_file))
                    .setRank(index)
                    .setIntent(
                        Intent(Intent.ACTION_VIEW, Uri.parse(file.uri), context, MainActivity::class.java),
                    )
                    .build()
            }
            ShortcutManagerCompat.setDynamicShortcuts(context, shortcuts)
        } catch (_: Exception) {
            // Best-effort, same posture as DraftStore/RecentFilesStore —
            // launcher shortcuts are a convenience, never load-bearing.
        }
    }
}
