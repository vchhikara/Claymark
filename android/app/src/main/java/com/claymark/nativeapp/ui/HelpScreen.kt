@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

package com.claymark.nativeapp.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.claymark.nativeapp.markdown.MarkdownDocument
import com.claymark.nativeapp.markdown.MarkdownParser

/**
 * Rendered through claymark's own Markdown pipeline rather than a bespoke
 * rich-text layout — the app dogfoods its own renderer for its own help
 * content. Sourced from this project's `docs/USER-GUIDE.md`, trimmed to
 * what's actually implemented in this native port, not copied from any
 * other app's copy.
 */
private const val HELP_MD = """# Help

claymark turns Markdown into a clean reading surface: serif body type,
syntax-highlighted code, typeset mathematics, rendered diagrams, and
readable tables. It works offline and never executes anything a document
asks it to.

## Text

**bold**, *italic*, ~~struck~~, `inline code`, [a link](https://example.com),
and a horizontal rule below.

---

> A blockquote, for a quoted aside.

## Headings

Six levels, `#` through `######`.

## Lists

- unordered items
  - nested two spaces deep
- [x] a completed task
- [ ] a pending task

Task checkboxes are display-only — they show state but aren't tappable,
because the document is a rendering, not a form.

## Code

Tag a fence with a language for highlighting:

```kotlin
fun greet(name: String) = "Hello, ${'$'}name"
```

Unregistered languages render as plain preformatted text instead of failing.
Every code block has a copy button in its header.

## Tables

| Left | Center | Right |
|:-----|:------:|------:|
| a    |   b    |     c |

Wide tables scroll horizontally inside their own container — the page
itself never gains a horizontal scroll.

## Mathematics

Inline math like ${'$'}e^{i\pi} + 1 = 0${'$'} and display math both render via
KaTeX. Malformed TeX shows an error inline rather than breaking the page.

## Diagrams

A ` ```mermaid ` fence renders as an actual diagram — flowcharts, sequence
diagrams, class diagrams, and more. Invalid syntax falls back to showing the
source as a code block, never a crash.

## Images

Tap any image to open it enlarged; tap outside or press Back to close.

## What it deliberately won't do

Raw HTML in a document is shown as text, never executed — this is the
single largest attack-surface class in an untrusted document, and it's
disabled entirely, with no override.
"""

@Composable
fun HelpScreen(onBack: () -> Unit) {
    val root = remember { MarkdownParser.parse(HELP_MD) }
    SubScreenScaffold(title = "Help", onBack = onBack) {
        MarkdownDocument(root = root)
    }
}
