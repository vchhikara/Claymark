package com.claymark.nativeapp.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.LocalSettingsState
import com.claymark.nativeapp.theme.LocalThemeState
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.ThemePreference
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors

/**
 * The three toggles/pickers the user asked for, in the order given:
 * Autosave, Dark Mode, AMOLED. Deliberately no analytics/error-report rows —
 * this app makes zero runtime network requests by design (`docs/SPEC.md`
 * NFR-1.6), and there is no telemetry SDK here for such a toggle to gate.
 */
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val themeState = LocalThemeState.current
    val settingsState = LocalSettingsState.current
    var showThemePicker by remember { mutableStateOf(false) }

    SubScreenScaffold(title = "Settings", onBack = onBack) {
        SettingRow(
            title = "Enable autosave",
            subtitle = "Files will be automatically saved",
            trailing = {
                ClaySwitch(
                    checked = settingsState.autosaveEnabled,
                    onCheckedChange = settingsState.setAutosaveEnabled,
                )
            },
        )

        SettingRow(
            title = "Dark Mode",
            subtitle = themeState.preference.label(),
            onClick = { showThemePicker = true },
            trailing = {
                Text(
                    text = "›",
                    style = TextStyle(fontFamily = ClaymarkFonts.Ui, fontSize = TypeScale.h4, color = colors.textMuted),
                )
            },
        )

        SettingRow(
            title = "AMOLED Dark Theme",
            subtitle = "Use a pure black background instead of the default",
            trailing = {
                ClaySwitch(
                    checked = settingsState.amoledEnabled,
                    onCheckedChange = settingsState.setAmoledEnabled,
                )
            },
        )
    }

    if (showThemePicker) {
        ThemePickerDialog(
            current = themeState.preference,
            onSelect = {
                themeState.setPreference(it)
                showThemePicker = false
            },
            onDismiss = { showThemePicker = false },
        )
    }
}

private fun ThemePreference.label(): String = when (this) {
    ThemePreference.AUTO -> "auto"
    ThemePreference.LIGHT -> "light"
    ThemePreference.DARK -> "dark"
}

/** Same `Dialog` + `clayRaised` column idiom as `AbandonDialog`. */
@Composable
private fun ThemePickerDialog(
    current: ThemePreference,
    onSelect: (ThemePreference) -> Unit,
    onDismiss: () -> Unit,
) {
    val c = colors
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .widthIn(max = 320.dp)
                .clayRaised(base = c.surface, colors = c, radius = Radius.lg, elevation = 16.dp)
                .border(1.dp, c.borderDefault, RoundedCornerShape(Radius.lg))
                .padding(Space.s4),
        ) {
            listOf(ThemePreference.AUTO, ThemePreference.LIGHT, ThemePreference.DARK).forEach { option ->
                val selected = option == current
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(option) }
                        .padding(vertical = Space.s3),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = option.label().replaceFirstChar { it.uppercase() },
                        style = TextStyle(
                            fontFamily = ClaymarkFonts.Ui,
                            fontSize = TypeScale.button,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (selected) c.accentBrand else c.textPrimary,
                        ),
                    )
                    if (selected) {
                        Text(
                            text = "✓",
                            style = TextStyle(fontFamily = ClaymarkFonts.Ui, fontSize = TypeScale.button, color = c.accentBrand),
                        )
                    }
                }
            }
        }
    }
}
