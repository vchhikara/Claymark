package com.claymark.nativeapp.documents

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.net.URLDecoder

/**
 * Port of `src/documents/backends/tauri.ts`, minus the Tauri plugin bridge.
 *
 * `@tauri-apps/plugin-dialog` becomes ACTION_OPEN_DOCUMENT /
 * ACTION_CREATE_DOCUMENT, and `@tauri-apps/plugin-fs` becomes
 * ContentResolver streams. The picker is still the only thing that grants
 * access to a URI, so open-then-read/write remains the only path that works
 * — a URI is never constructed by hand.
 *
 * The `get_display_name` Tauri command and ContentResolverPlugin.kt collapse
 * into [displayNameFor] below: in a native app it is a direct
 * ContentResolver query with no IPC in between.
 */
class DocumentBackend(private val context: Context) {

    private val resolver: ContentResolver get() = context.contentResolver

    // ---- naming -----------------------------------------------------------

    /** Naive last-path-segment parse — correct for file paths and the
     *  ExternalStorageProvider `content://.../primary:Download/...` route. */
    private fun basename(pathOrUri: String): String {
        val clean = pathOrUri.substringBefore('?').substringBefore('#')
        val last = clean.trimEnd('/').substringAfterLast('/')
        return try {
            URLDecoder.decode(last, "UTF-8").ifEmpty { pathOrUri }
        } catch (_: Exception) {
            last.ifEmpty { pathOrUri }
        }
    }

    /**
     * Real-device finding (POCO M2 Pro): a document opened via Android's
     * "Documents"/"Recent" drawer is a MediaDocumentsProvider URI with no
     * filename anywhere in the URI itself, so [basename] yields a
     * meaningless `document:<id>`-shaped string. The only way to recover a
     * real name is OpenableColumns.DISPLAY_NAME. Best-effort: any failure
     * falls back to the naive name rather than surfacing an error.
     */
    private fun displayNameFor(uri: Uri): String {
        val naive = basename(uri.toString())
        if (uri.scheme != ContentResolver.SCHEME_CONTENT) return naive
        var cursor: Cursor? = null
        return try {
            cursor = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            if (cursor != null && cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val name = if (index >= 0) cursor.getString(index) else null
                if (!name.isNullOrEmpty()) name else naive
            } else {
                naive
            }
        } catch (_: Exception) {
            // No DISPLAY_NAME column, an invalid/expired URI, or a provider
            // that doesn't support the query — all mean "no name available",
            // not a failure the caller needs to handle specially.
            naive
        } finally {
            cursor?.close()
        }
    }

    // ---- writability ------------------------------------------------------

    /**
     * MediaDocumentsProvider hands out no persisted write grant, so a save
     * against one of its URIs always fails with a real PermissionDenial
     * ("requires android.permission.MANAGE_DOCUMENTS or
     * grantUriPermission()"), confirmed live on-device. Without this check
     * the app offers a Save button that is guaranteed to fail.
     */
    private fun isKnownNonWritableUri(uri: String): Boolean =
        uri.startsWith("content://com.android.providers.media.documents/")

    /**
     * Second, stronger gate the web build could not perform: ask the system
     * whether this process actually holds a persisted write grant. An
     * "Open with" intent normally arrives read-only, so this is what stops
     * the Save button appearing for a document handed over by a file
     * manager.
     */
    private fun hasPersistedWriteGrant(uri: Uri): Boolean =
        resolver.persistedUriPermissions.any { it.uri == uri && it.isWritePermission }

    private fun refFor(uri: Uri, writableHint: Boolean): DocumentRef {
        val raw = uri.toString()
        val isContent = uri.scheme == ContentResolver.SCHEME_CONTENT
        return DocumentRef(
            id = raw,
            name = displayNameFor(uri),
            mimeType = if (isContent) resolver.getType(uri) else null,
            writable = writableHint && !isKnownNonWritableUri(raw),
            sourceKind = if (isContent) DocumentSourceKind.CONTENT_URI else DocumentSourceKind.FILE_PATH,
            handle = raw,
        )
    }

    // ---- intents ----------------------------------------------------------

    /**
     * ACTION_OPEN_DOCUMENT rather than ACTION_GET_CONTENT: only the former
     * yields a long-lived, persistable URI, which is what makes an in-place
     * Save possible at all.
     */
    fun openIntent(): Intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "*/*"
        // The SAF picker filters on mime types, and providers are wildly
        // inconsistent about what they report for .md — text/markdown,
        // text/x-markdown, text/plain, and application/octet-stream all
        // occur in the wild. Listing them keeps Markdown files selectable
        // without hiding a file the user can plainly see.
        putExtra(
            Intent.EXTRA_MIME_TYPES,
            arrayOf("text/markdown", "text/x-markdown", "text/plain", "application/octet-stream"),
        )
        addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
        )
    }

    fun createIntent(suggestedName: String): Intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "text/markdown"
        putExtra(Intent.EXTRA_TITLE, suggestedName)
        addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
        )
    }

    // ---- read / write -----------------------------------------------------

    /**
     * Called with the URI the picker returned. Takes the persistable grant
     * first (so the document survives a process death and a relaunch), then
     * decides writability from what the system actually granted.
     */
    fun openPicked(uri: Uri): DocumentSnapshot {
        var writable = false
        try {
            resolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
            )
            writable = hasPersistedWriteGrant(uri)
        } catch (_: SecurityException) {
            // The provider refused a persistable write grant (the
            // MediaDocumentsProvider route does exactly this). Try read-only
            // so the document still opens; it simply won't offer Save.
            try {
                resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (_: SecurityException) {
                // Even a read grant can't be persisted — the URI is still
                // usable for this session, which is enough to read it now.
            }
        }
        val text = readText(uri)
        return DocumentSnapshot(refFor(uri, writable), text)
    }

    /**
     * An incoming "Open with" URI. Never persisted: the grant attached to an
     * intent is transient by construction, so this always opens read-only
     * and the shell offers Save-as rather than Save.
     */
    fun openIncoming(uri: Uri): DocumentSnapshot {
        val text = readText(uri)
        return DocumentSnapshot(refFor(uri, writableHint = false), text)
    }

    fun read(ref: DocumentRef): DocumentSnapshot =
        DocumentSnapshot(ref, readText(Uri.parse(ref.handle)))

    /**
     * Re-opens a document previously recorded in [RecentFilesStore] via its
     * persisted URI — no picker involved, unlike [openPicked]. Read failure
     * (grant revoked, file moved/deleted since) surfaces as a normal
     * [DocumentSession] open error; the caller drops the stale recent-files
     * entry in response.
     */
    fun openRecent(uriString: String): DocumentSnapshot {
        val uri = Uri.parse(uriString)
        val writable = hasPersistedWriteGrant(uri)
        val text = readText(uri)
        return DocumentSnapshot(refFor(uri, writableHint = writable), text)
    }

    private fun readText(uri: Uri): String {
        if (uri.scheme == "file") {
            val path = uri.path ?: throw java.io.IOException("File URI has no path")
            return File(path).readText()
        }
        return resolver.openInputStream(uri)?.use { stream ->
            stream.readBytes().toString(Charsets.UTF_8)
        } ?: throw java.io.IOException("Could not open $uri")
    }

    /**
     * Writes back to the same ref. Throws on failure — the caller keeps the
     * buffer and the recovery draft either way.
     *
     * "wt" truncates before writing; without it a shorter document leaves
     * the tail of the previous contents on disk.
     */
    fun save(ref: DocumentRef, text: String) {
        val uri = Uri.parse(ref.handle)
        if (uri.scheme == "file") {
            val path = uri.path ?: throw java.io.IOException("File URI has no path")
            File(path).writeText(text)
            return
        }
        resolver.openOutputStream(uri, "wt")?.use { stream ->
            stream.write(text.toByteArray(Charsets.UTF_8))
            stream.flush()
        } ?: throw java.io.IOException("Could not open $uri for writing")
    }

    /** Completes a Save-as once the create-document picker has returned. */
    fun saveAsCreated(uri: Uri, text: String): DocumentRef {
        try {
            resolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
            )
        } catch (_: SecurityException) {
            // A freshly created document is writable for this session even
            // when the grant can't be persisted.
        }
        resolver.openOutputStream(uri, "wt")?.use { stream ->
            stream.write(text.toByteArray(Charsets.UTF_8))
            stream.flush()
        } ?: throw java.io.IOException("Could not open $uri for writing")
        return refFor(uri, writableHint = true)
    }

    fun persistAction(ref: DocumentRef): PersistAction =
        if (ref.writable) PersistAction.SAVE else PersistAction.SAVE_AS

    /** A sensible default filename for the Save-as picker. */
    fun suggestedNameFor(ref: DocumentRef?): String {
        val name = ref?.name?.takeIf { it.isNotBlank() } ?: "untitled.md"
        return if (name.endsWith(".md") || name.endsWith(".markdown")) name else "$name.md"
    }
}
