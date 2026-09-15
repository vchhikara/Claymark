package com.claymark.nativeapp.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.claymark.nativeapp.markdown.MarkdownDocument
import com.claymark.nativeapp.markdown.MarkdownParser

/**
 * Deliberately not modeled on the reference app's opt-out analytics/error-
 * report toggles: claymark makes zero runtime network requests by design
 * (`docs/SPEC.md` NFR-1.6), and there is no analytics or crash-reporting SDK
 * in this app for such a toggle to control. The honest statement is simpler
 * than a settings row.
 */
private const val PRIVACY_MD = """# Privacy

claymark collects nothing.

- No analytics.
- No crash or error reporting.
- No network requests of any kind at runtime — everything needed to render
  a document is bundled with the app.
- The files you open are read and written only where you choose, through
  the system file picker. claymark never uploads them anywhere.

The only things this app stores are on your device, for your convenience:
your theme preference, your Settings choices, and — if autosave is on —
the file you're editing and a short-lived crash-recovery buffer, so you
don't lose work if the app is killed mid-edit. None of it ever leaves
your device.
"""

@Composable
fun PrivacyScreen(onBack: () -> Unit) {
    val root = remember { MarkdownParser.parse(PRIVACY_MD) }
    SubScreenScaffold(title = "Privacy", onBack = onBack) {
        MarkdownDocument(root = root)
    }
}
