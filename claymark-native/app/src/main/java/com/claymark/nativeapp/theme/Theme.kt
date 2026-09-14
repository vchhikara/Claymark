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
 */
enum class Theme { LIGHT, DARK }

private const val PREFS = "claymark"
private const val STORAGE_KEY = "claymark-theme"

class ThemeController(private val context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun stored(): Theme? = when (prefs.getString(STORAGE_KEY, null)) {
        "light" -> Theme.LIGHT
        "dark" -> Theme.DARK
        else -> null
    }

    fun store(theme: Theme) {
        prefs.edit().putString(STORAGE_KEY, if (theme == Theme.DARK) "dark" else "light").apply()
    }
}

val LocalClaymarkColors = staticCompositionLocalOf { LightColors }
val LocalThemeState = staticCompositionLocalOf<ThemeState> {
    error("ClaymarkTheme not installed")
}

class ThemeState(
    val theme: Theme,
    val setTheme: (Theme) -> Unit,
)

@Composable
fun ClaymarkTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val controller = remember { ThemeController(context) }
    val systemDark = isSystemInDarkTheme()

    var manual by remember { mutableStateOf(controller.stored()) }
    val effective = manual ?: if (systemDark) Theme.DARK else Theme.LIGHT

    val colors = if (effective == Theme.DARK) DarkColors else LightColors
    val state = ThemeState(effective) { next ->
        manual = next
        controller.store(next)
    }

    CompositionLocalProvider(
        LocalClaymarkColors provides colors,
        LocalThemeState provides state,
        content = content,
    )
}

/** Shorthand used throughout the UI, mirroring `hsl(var(--token))` reads. */
val colors: ClaymarkColors
    @Composable get() = LocalClaymarkColors.current
