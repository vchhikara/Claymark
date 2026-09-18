@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

package com.claymark.nativeapp.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.claymark.nativeapp.markdown.MarkdownDocument
import com.claymark.nativeapp.markdown.MarkdownParser

/**
 * Attribution for what this native build actually bundles — mirrors
 * `public/fonts/LICENSES.md`'s format from the web project, not a generic
 * "libraries that helped" essay.
 */
private const val ABOUT_MD = """# About

claymark is a Markdown rendering engine built for streamed, untrusted
output — CommonMark + GFM, syntax highlighting, math, and diagrams, under a
strict sanitization boundary. This is the native Android build.

## Bundled

- **KaTeX** — math typesetting, rendered in a local WebView with no network
  access. MIT License.
- **Mermaid** — diagram rendering, same local, offline WebView. MIT License.
- **Source Serif 4**, **Inter**, **JetBrains Mono** — the three typefaces
  used for body text, UI chrome, and code. SIL Open Font License 1.1.
- **commonmark-java** — CommonMark + GFM parsing (tables, task lists,
  strikethrough, autolinks). BSD 2-Clause License.

## Version

This is the native Kotlin/Jetpack Compose port, built from the same design
tokens and rendering rules as the original React/web build.
"""

@Composable
fun AboutScreen(onBack: () -> Unit) {
    val root = remember { MarkdownParser.parse(ABOUT_MD) }
    SubScreenScaffold(title = "About", onBack = onBack) {
        MarkdownDocument(root = root)
    }
}
