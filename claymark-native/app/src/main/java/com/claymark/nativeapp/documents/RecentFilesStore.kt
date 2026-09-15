package com.claymark.nativeapp.documents

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Brainstorm §2.3: a small locally-persisted MRU list, same
 * SharedPreferences-and-`org.json` shape as [DraftStore] — best-effort, no
 * migration story needed for a cache this disposable.
 *
 * Only ever holds documents whose URI grant was actually persisted
 * ([DocumentBackend.openPicked] / `saveAsCreated`) — an "Open with"
 * ([DocumentBackend.openIncoming]) URI's grant is transient by construction
 * and would fail to reopen after the app restarts, so callers must not
 * record those. See [DocumentSession]'s `recordRecent` gate on
 * `applyOpenedDoc`.
 */
data class RecentFile(
    val uri: String,
    val name: String,
    val openedAt: Long,
)

private const val KEY_LIST = "claymark:recent-files"
private const val MAX_ENTRIES = 5

class RecentFilesStore(context: Context) {
    private val prefs = context.getSharedPreferences("claymark-recent-files", Context.MODE_PRIVATE)

    fun list(): List<RecentFile> = try {
        val raw = prefs.getString(KEY_LIST, null)
        if (raw == null) {
            emptyList()
        } else {
            val array = JSONArray(raw)
            (0 until array.length()).mapNotNull { i ->
                val obj = array.optJSONObject(i) ?: return@mapNotNull null
                RecentFile(
                    uri = obj.getString("uri"),
                    name = obj.optString("name"),
                    openedAt = obj.optLong("openedAt"),
                )
            }
        }
    } catch (_: Exception) {
        emptyList()
    }

    /** Moves [uri] to the front if already present, otherwise prepends it. */
    fun record(uri: String, name: String) {
        try {
            val updated = (listOf(RecentFile(uri, name, System.currentTimeMillis())) +
                list().filterNot { it.uri == uri })
                .take(MAX_ENTRIES)
            val array = JSONArray()
            updated.forEach { entry ->
                array.put(
                    JSONObject()
                        .put("uri", entry.uri)
                        .put("name", entry.name)
                        .put("openedAt", entry.openedAt),
                )
            }
            prefs.edit().putString(KEY_LIST, array.toString()).apply()
        } catch (_: Exception) {
            // Best-effort, same as DraftStore.
        }
    }

    /** Drops a stale entry — e.g. reopening failed because the grant or the
     *  underlying file is gone. */
    fun remove(uri: String) {
        try {
            val updated = list().filterNot { it.uri == uri }
            val array = JSONArray()
            updated.forEach { entry ->
                array.put(
                    JSONObject()
                        .put("uri", entry.uri)
                        .put("name", entry.name)
                        .put("openedAt", entry.openedAt),
                )
            }
            prefs.edit().putString(KEY_LIST, array.toString()).apply()
        } catch (_: Exception) {
            // no-op
        }
    }
}
