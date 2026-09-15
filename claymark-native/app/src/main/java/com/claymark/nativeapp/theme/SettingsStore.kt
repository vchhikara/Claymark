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
private const val KEY_TEXT_SIZE_STEP = "claymark-text-size-step"

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

    /**
     * §2.5: an index into [TextSizeSteps], not a freely-runtime-themeable
     * value — the web build's own disclosed gap (`docs/API.md`) is
     * specifically *not* wanting to expose that, so this stays a small,
     * discrete stepper.
     */
    var textSizeStep: Int
        get() = prefs.getInt(KEY_TEXT_SIZE_STEP, TextSizeSteps.DEFAULT_INDEX)
        set(value) = prefs.edit().putInt(KEY_TEXT_SIZE_STEP, value).apply()
}

/** Small / Default / Large / Extra large — multipliers on [com.claymark.nativeapp.theme.TypeScale] body/heading sizes, reading surface only. */
object TextSizeSteps {
    val SCALES = listOf(0.875f, 1f, 1.15f, 1.3f)
    val LABELS = listOf("Small", "Default", "Large", "Extra large")
    const val DEFAULT_INDEX = 1
}
