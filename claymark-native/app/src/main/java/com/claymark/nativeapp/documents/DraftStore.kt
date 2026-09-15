package com.claymark.nativeapp.documents

import android.content.Context
import org.json.JSONObject

/**
 * Port of `src/documents/draft-store.ts`.
 *
 * The web build's disclosed P0 simplification was localStorage: a ~5–10 MB
 * per-origin quota, cleared by "clear site data". SharedPreferences has the
 * same shape (a synchronous string map, cleared by "Clear storage") and the
 * same caveat, so this is a like-for-like port rather than an upgrade — the
 * explicit Save path remains the real persistence guarantee.
 */
data class RecoveryDraft(
    val documentId: String,
    val displayName: String,
    val text: String,
    val baseModifiedAt: Long? = null,
    val draftModifiedAt: Long,
)

private const val KEY_PREFIX = "claymark:draft:"

class DraftStore(context: Context) {
    private val prefs = context.getSharedPreferences("claymark-drafts", Context.MODE_PRIVATE)

    private fun keyFor(documentId: String) = "$KEY_PREFIX$documentId"

    fun put(draft: RecoveryDraft) {
        try {
            val json = JSONObject()
                .put("documentId", draft.documentId)
                .put("displayName", draft.displayName)
                .put("text", draft.text)
                .put("draftModifiedAt", draft.draftModifiedAt)
            draft.baseModifiedAt?.let { json.put("baseModifiedAt", it) }
            prefs.edit().putString(keyFor(draft.documentId), json.toString()).apply()
        } catch (_: Exception) {
            // Quota exceeded or storage disabled — the draft is best-effort.
        }
    }

    fun get(documentId: String): RecoveryDraft? = try {
        prefs.getString(keyFor(documentId), null)?.let { raw ->
            val json = JSONObject(raw)
            RecoveryDraft(
                documentId = json.getString("documentId"),
                displayName = json.optString("displayName"),
                text = json.getString("text"),
                baseModifiedAt = if (json.has("baseModifiedAt")) json.getLong("baseModifiedAt") else null,
                draftModifiedAt = json.optLong("draftModifiedAt"),
            )
        }
    } catch (_: Exception) {
        null
    }

    fun remove(documentId: String) {
        try {
            prefs.edit().remove(keyFor(documentId)).apply()
        } catch (_: Exception) {
            // no-op
        }
    }
}
