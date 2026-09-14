// P0 filename-display fix (real-device finding, POCO M2 Pro): a document
// opened via Android's "Documents"/"Recent" drawer is a
// content://com.android.providers.media.documents/document/... URI with no
// filename embedded in the URI itself, unlike the direct
// content://.../primary:Download/... route that basename() (in
// src/documents/backends/tauri.ts) already handles by splitting on "/".
// The only way to recover a real name for such a URI is to ask the
// ContentResolver for OpenableColumns.DISPLAY_NAME — wired up to the JS
// side via the `get_display_name` Tauri command in src-tauri/src/lib.rs.
package com.claymark.app

import android.app.Activity
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class GetDisplayNameArgs {
    lateinit var uri: String
}

@TauriPlugin
class ContentResolverPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun getDisplayName(invoke: Invoke) {
        val args = invoke.parseArgs(GetDisplayNameArgs::class.java)
        val result = JSObject()

        var name: String? = null
        var cursor: Cursor? = null
        try {
            cursor = activity.contentResolver.query(
                Uri.parse(args.uri),
                arrayOf(OpenableColumns.DISPLAY_NAME),
                null,
                null,
                null,
            )
            if (cursor != null && cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    name = cursor.getString(index)
                }
            }
        } catch (e: Exception) {
            // No DISPLAY_NAME column, an invalid/expired URI, or a provider
            // that doesn't support this query — all mean "no name available",
            // not a failure the JS side needs to handle specially.
        } finally {
            cursor?.close()
        }

        result.put("name", name)
        invoke.resolve(result)
    }
}
