package com.claymark.nativeapp.documents

/**
 * Port of `src/documents/types.ts`.
 *
 * The web build's four source kinds collapse to two here: a native app has
 * no File System Access API and no ephemeral `<input type=file>` fallback,
 * so only the two Tauri-equivalent kinds survive — a SAF `content://` URI
 * and a plain `file://` path arriving from an "Open with" intent.
 */
enum class DocumentSourceKind {
    /** A `content://` URI from the Storage Access Framework or an intent. */
    CONTENT_URI,

    /** A `file://` URI, only reachable via a legacy file-manager intent. */
    FILE_PATH,
}

/**
 * `writable` is a snapshot at open time — always re-checked before a save is
 * attempted, never trusted blindly.
 */
data class DocumentRef(
    val id: String,
    val name: String,
    val mimeType: String? = null,
    val writable: Boolean,
    val sourceKind: DocumentSourceKind,
    /** Opaque per-backend payload; here always the URI string. */
    val handle: String,
)

data class DocumentSnapshot(
    val ref: DocumentRef,
    val text: String,
    val modifiedAt: Long? = null,
    val sizeBytes: Long? = null,
)

/**
 * What the primary persist button should say and do. Never label a download
 * "Save".
 *
 * [DOWNLOAD_COPY] is retained from the web contract but is unreachable on
 * this backend, exactly as it is on the Tauri backend: there is always a
 * real writable destination available through Save-as, so a browser-style
 * download is never the right fallback.
 */
enum class PersistAction { SAVE, SAVE_AS, DOWNLOAD_COPY }

val PERSIST_LABEL: Map<PersistAction, String> = mapOf(
    PersistAction.SAVE to "Save",
    PersistAction.SAVE_AS to "Save as",
    PersistAction.DOWNLOAD_COPY to "Download copy",
)
