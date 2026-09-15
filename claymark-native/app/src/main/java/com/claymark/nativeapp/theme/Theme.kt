package com.claymark.nativeapp.theme

import android.content.Context
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext

/**
 * Port of `src/theme/ThemeProvider.tsx`.
 *
 * Same two rules as the web version:
 *  - an explicit stored choice always wins over the system setting;
 *  - absent a stored choice, the system setting is followed live.
 *
 * `localStorage` becomes SharedPreferences under the same key name.
 *
 * [Theme] is the *resolved* value — what a color lookup actually uses.
 * [ThemePreference] is the *stored* choice, which adds a third state (AUTO)
 * the web build never needed a name for because "no stored choice" already
 * meant auto. Giving it an explicit name is what lets the Settings screen
 * offer Auto/Light/Dark as three co-equal options rather than only exposing
 * the binary quick-toggle in the header.
 */
enum class Theme { LIGHT, DARK }

enum class ThemePreference { AUTO, LIGHT, DARK }

private const val PREFS = "claymark"
private const val STORAGE_KEY = "claymark-theme"

class ThemeController(private val context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Absent key means AUTO — this is exactly the old `stored() == null` case. */
    fun storedPreference(): ThemePreference = when (prefs.getString(STORAGE_KEY, null)) {
        "light" -> ThemePreference.LIGHT
        "dark" -> ThemePreference.DARK
        else -> ThemePreference.AUTO
    }

    fun storePreference(preference: ThemePreference) {
        val value = when (preference) {
            ThemePreference.LIGHT -> "light"
            ThemePreference.DARK -> "dark"
            ThemePreference.AUTO -> "auto"
        }
        prefs.edit().putString(STORAGE_KEY, value).apply()
    }
}

val LocalClaymarkColors = staticCompositionLocalOf { LightColors }
val LocalThemeState = staticCompositionLocalOf<ThemeState> {
    error("ClaymarkTheme not installed")
}
val LocalSettingsState = staticCompositionLocalOf<SettingsState> {
    error("ClaymarkTheme not installed")
}

class ThemeState(
    val theme: Theme,
    val preference: ThemePreference,
    val setPreference: (ThemePreference) -> Unit,
) {
    /**
     * The header's quick binary toggle. It only ever chooses an explicit
     * Light or Dark — reaching Auto is a Settings-screen-only action,
     * exactly like the web build's `<ThemeToggle>` never offering "system".
     */
    val setTheme: (Theme) -> Unit = { next ->
        setPreference(if (next == Theme.DARK) ThemePreference.DARK else ThemePreference.LIGHT)
    }
}

class SettingsState(
    val autosaveEnabled: Boolean,
    val setAutosaveEnabled: (Boolean) -> Unit,
    val amoledEnabled: Boolean,
    val setAmoledEnabled: (Boolean) -> Unit,
    val textSizeStep: Int,
    val setTextSizeStep: (Int) -> Unit,
)

/**
 * §2.5's multiplier, consumed only by the reading surface's own body/heading
 * text (`markdown/Blocks.kt`) — deliberately a separate local from anything
 * chrome reads, so Settings/buttons/drawer text never scales with it.
 */
val LocalTextScale = staticCompositionLocalOf { 1f }

@Composable
fun ClaymarkTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val themeController = remember { ThemeController(context) }
    val settingsStore = remember { SettingsStore(context) }
    val systemDark = isSystemInDarkTheme()

    var preference by remember { mutableStateOf(themeController.storedPreference()) }
    var autosaveEnabled by remember { mutableStateOf(settingsStore.autosaveEnabled) }
    var amoledEnabled by remember { mutableStateOf(settingsStore.amoledEnabled) }
    var textSizeStep by remember { mutableStateOf(settingsStore.textSizeStep) }

    val effective = when (preference) {
        ThemePreference.LIGHT -> Theme.LIGHT
        ThemePreference.DARK -> Theme.DARK
        ThemePreference.AUTO -> if (systemDark) Theme.DARK else Theme.LIGHT
    }

    val resolvedColors = when {
        effective == Theme.DARK && amoledEnabled -> AmoledColors
        effective == Theme.DARK -> DarkColors
        else -> LightColors
    }

    val themeState = ThemeState(effective, preference) { next ->
        preference = next
        themeController.storePreference(next)
    }

    val settingsState = SettingsState(
        autosaveEnabled = autosaveEnabled,
        setAutosaveEnabled = { next ->
            autosaveEnabled = next
            settingsStore.autosaveEnabled = next
        },
        amoledEnabled = amoledEnabled,
        setAmoledEnabled = { next ->
            amoledEnabled = next
            settingsStore.amoledEnabled = next
        },
        textSizeStep = textSizeStep,
        setTextSizeStep = { next ->
            textSizeStep = next
            settingsStore.textSizeStep = next
        },
    )

    CompositionLocalProvider(
        LocalClaymarkColors provides resolvedColors,
        LocalThemeState provides themeState,
        LocalSettingsState provides settingsState,
        LocalTextScale provides TextSizeSteps.SCALES[textSizeStep],
        content = content,
    )
}

/** Shorthand used throughout the UI, mirroring `hsl(var(--token))` reads. */
val colors: ClaymarkColors
    @Composable get() = LocalClaymarkColors.current

/** Shorthand for the Settings-backed toggles. */
val settings: SettingsState
    @Composable get() = LocalSettingsState.current
