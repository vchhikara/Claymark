package com.claymark.nativeapp.theme

import android.content.Context

/**
 * The two Settings-screen toggles that aren't theme choices. Same
 * `SharedPreferences("claymark")` file [ThemeController] uses — distinct
 * keys, no collision.
 */
private const val PREFS = "claymark"
private const val KEY_AUTOSAVE = "claymark-autosave-enabled"
private const val KEY_AMOLED = "claymark-amoled-enabled"

class SettingsStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /**
     * Defaults on, matching the reference app's default and this app's own
     * bias toward not losing work. Gates only the *debounced write to the
     * open document* — the crash-recovery draft buffer (`DraftStore`) is a
     * safety net, not a feature, and stays unconditional regardless of this.
     */
    var autosaveEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTOSAVE, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTOSAVE, value).apply()

    /** Defaults off — a pure-black background is a deliberate opt-in, not a default. */
    var amoledEnabled: Boolean
        get() = prefs.getBoolean(KEY_AMOLED, false)
        set(value) = prefs.edit().putBoolean(KEY_AMOLED, value).apply()
}
