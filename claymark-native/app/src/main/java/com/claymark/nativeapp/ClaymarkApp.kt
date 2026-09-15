package com.claymark.nativeapp

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claymark.nativeapp.documents.PERSIST_LABEL
import com.claymark.nativeapp.documents.PersistAction
import com.claymark.nativeapp.markdown.ImagePayload
import com.claymark.nativeapp.markdown.MarkdownDocument
import com.claymark.nativeapp.markdown.MarkdownParser
import com.claymark.nativeapp.session.AbandonChoice
import com.claymark.nativeapp.session.DocumentSession
import com.claymark.nativeapp.session.SaveStatus
import com.claymark.nativeapp.session.SessionMode
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.LocalThemeState
import com.claymark.nativeapp.theme.Measure
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayInset
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors
import com.claymark.nativeapp.ui.AbandonDialog
import com.claymark.nativeapp.ui.ClayButton
import com.claymark.nativeapp.ui.DrawerMenuButton
import com.claymark.nativeapp.ui.ImageLightbox
import com.claymark.nativeapp.ui.NoticeRow
import com.claymark.nativeapp.ui.ReadingProgressRail
import com.claymark.nativeapp.ui.ScrollTopButton
import com.claymark.nativeapp.ui.ThemeToggle
import kotlinx.coroutines.launch

/**
 * A short, hand-written sample that exercises headings, a list, a fenced code
 * block, a table, and a link, so the reader visibly demonstrates the default
 * component map on first load.
 *
 * Shown ONLY in the no-document state, never overlaid on a real opened file:
 * a demo must never masquerade as the user's own content.
 */
private const val SAMPLE_MD = """# claymark

A Markdown renderer built for **streamed, untrusted LLM output**.

## What it renders

- CommonMark + GFM (tables, task lists, strikethrough)
- Syntax-highlighted code
- Math and Mermaid diagrams

```typescript
import { processor, toReact } from 'claymark'

const tree = processor.parse(source)
const hast = await processor.run(tree)
```

| Feature | Status |
| --- | --- |
| Streaming | ✅ |
| Sanitization | ✅ |
| Theming | ✅ |

Tap **Open file** above to open your own Markdown file.
"""

/**
 * The reader shell.
 *
 * The primary job is VIEWING a Markdown file fast, with an Edit mode present
 * but deliberately secondary: a single header action, a plain text field,
 * never stacked with the preview.
 */
@Composable
fun ClaymarkApp(session: DocumentSession, onOpenDrawer: () -> Unit) {
    val c = colors
    val scroll = rememberScrollState()
    val scope = rememberCoroutineScope()
    var lightbox by remember { mutableStateOf<ImagePayload?>(null) }

    val source = if (session.mode == SessionMode.NO_DOCUMENT) SAMPLE_MD else session.text
    val parsed = remember(source, session.isEditing) {
        if (session.isEditing) null else MarkdownParser.parse(source)
    }

    val readProgress by remember {
        derivedStateOf {
            val max = scroll.maxValue
            if (max > 0) (scroll.value.toFloat() / max).coerceIn(0f, 1f) else 0f
        }
    }
    val showScrollTop by remember { derivedStateOf { scroll.value > 400 } }

    // System Back mirrors "Back to preview": it routes through the same
    // unsaved-changes prompt rather than dropping the buffer.
    BackHandler(enabled = session.isEditing) { session.backToPreview() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(c.surface),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            Header(session = session, onOpenDrawer = onOpenDrawer)

            Box(modifier = Modifier.weight(1f)) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scroll)
                        .padding(horizontal = Space.s5)
                        .padding(bottom = Space.s9),
                ) {
                    Box(
                        modifier = Modifier
                            .widthIn(max = Measure)
                            .fillMaxWidth()
                            .align(Alignment.CenterHorizontally),
                    ) {
                        Column {
                            if (session.recoveredDraft) {
                                Spacer(Modifier.padding(top = Space.s4))
                                NoticeRow(
                                    message = "Recovered unsaved changes from a previous session.",
                                    actionLabel = "Discard",
                                    onAction = session::discardRecoveredDraft,
                                )
                            }

                            if (session.saveStatus == SaveStatus.FAILED) {
                                NoticeRow(
                                    message = "Couldn't save ${session.ref?.name ?: ""}. ${session.saveError ?: ""}",
                                    actionLabel = "Retry",
                                    onAction = session::save,
                                    isError = true,
                                )
                            }

                            if (session.isEditing) {
                                SourceEditor(session)
                            } else if (parsed != null) {
                                MarkdownDocument(
                                    root = parsed,
                                    onImageTapped = { lightbox = it },
                                )
                            }
                        }
                    }
                }

                if (showScrollTop && !session.isEditing) {
                    ScrollTopButton(
                        onClick = { scope.launch { scroll.animateScrollTo(0) } },
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(Space.s6),
                    )
                }
            }
        }

        // Reading-progress indicator, pinned to the viewport's left edge.
        if (!session.isEditing) {
            ReadingProgressRail(
                progress = readProgress,
                modifier = Modifier.align(Alignment.CenterStart),
            )
        }

        session.pendingAbandon?.let {
            AbandonDialog(
                documentName = session.ref?.name,
                onChoice = { choice: AbandonChoice -> session.resolveAbandon(choice) },
            )
        }

        lightbox?.let { payload ->
            ImageLightbox(payload = payload, onClose = { lightbox = null })
        }
    }
}

/**
 * The sticky header.
 *
 * Its own `overflowX: hidden` in the web build was a real-device fix: an
 * unconstrained flex row could grow past the viewport and produce a
 * horizontal document scroll this design explicitly rules out. The Compose
 * equivalent is a row whose content truncates rather than pushes — the
 * filename gets the flexible space and ellipsises, the actions never shrink.
 */
@Composable
private fun Header(session: DocumentSession, onOpenDrawer: () -> Unit) {
    val c = colors
    val themeState = LocalThemeState.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(c.surface)
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = Space.s5)
            .padding(top = Space.s3, bottom = Space.s4),
    ) {
        Row(
            modifier = Modifier
                .widthIn(max = Measure)
                .fillMaxWidth()
                .align(Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Space.s2),
        ) {
            if (session.isEditing) {
                ClayButton(
                    label = "\u2190 Back",
                    compact = true,
                    onClick = session::backToPreview,
                )

                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.End,
                ) {
                    Text(
                        text = session.ref?.name.orEmpty(),
                        style = TextStyle(
                            fontFamily = ClaymarkFonts.Ui,
                            fontSize = TypeScale.button,
                            fontWeight = FontWeight.SemiBold,
                            color = c.textPrimary,
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = when (session.saveStatus) {
                            SaveStatus.DIRTY -> "Unsaved changes"
                            SaveStatus.SAVING -> "Saving…"
                            SaveStatus.SAVED -> "Saved"
                            SaveStatus.FAILED -> "Save failed"
                            SaveStatus.CLEAN -> "No changes"
                        },
                        style = TextStyle(
                            fontFamily = ClaymarkFonts.Ui,
                            fontSize = 13.5.sp,
                            color = c.textMuted,
                        ),
                        maxLines = 1,
                    )
                }

                // Offer the dedicated Save-as button only as a *second*, real
                // alternative — when the primary button is doing something
                // different (an in-place Save). Otherwise both buttons read
                // "Save as" and trigger the identical action.
                if (session.persistAction == PersistAction.SAVE) {
                    ClayButton(
                        label = "Save as…",
                        compact = true,
                        enabled = session.mode != SessionMode.SAVING,
                        onClick = session::saveAs,
                    )
                }

                ClayButton(
                    label = PERSIST_LABEL[session.persistAction ?: PersistAction.SAVE] ?: "Save",
                    compact = true,
                    enabled = session.mode != SessionMode.SAVING,
                    onClick = {
                        if (session.persistAction == PersistAction.DOWNLOAD_COPY) {
                            session.downloadCopy()
                        } else {
                            session.save()
                        }
                    },
                )
            } else {
                DrawerMenuButton(onClick = onOpenDrawer)

                Text(
                    text = if (session.hasDocument) session.ref?.name.orEmpty() else "CLAYMARK",
                    style = TextStyle(
                        // The wordmark is the one place the shell uses the
                        // body serif: uppercase, letter-spaced, muted, never
                        // bold. Once a document is open it is replaced by the
                        // filename — the reading surface always wins over the
                        // brand chrome.
                        fontFamily = ClaymarkFonts.Body,
                        fontSize = TypeScale.button,
                        fontWeight = if (session.hasDocument) FontWeight.SemiBold else FontWeight.Normal,
                        letterSpacing = if (session.hasDocument) 0.sp else 1.26.sp,
                        color = if (session.hasDocument) c.textPrimary else c.textMuted,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )

                ClayButton(label = "Open file", compact = true, onClick = session::openFile)
                if (session.hasDocument) {
                    ClayButton(label = "Edit", compact = true, onClick = session::startEdit)
                }
                ThemeToggle(theme = themeState.theme, onToggle = themeState.setTheme)
            }
        }

        Spacer(Modifier.padding(top = Space.s3))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = Space.s2)
                .height(1.dp)
                .background(c.borderSubtle),
        )
    }
}

/**
 * Editing is deliberately plain: one full-height field, no stacked preview,
 * no rich-text affordances, no resize handle.
 *
 * `.cm-source-textarea:focus-visible` on the web gives the field an
 * `accent-brand` outline the instant it's focused — the equivalent here
 * needs its own [FocusInteraction] source, since a bare [BasicTextField]'s
 * border doesn't react to focus on its own the way a browser's does.
 */
@Composable
private fun SourceEditor(session: DocumentSession) {
    val c = colors
    val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val borderColor = if (isFocused) c.accentBrand else c.borderSubtle

    BasicTextField(
        value = session.text,
        onValueChange = session::updateText,
        enabled = session.mode != SessionMode.SAVING,
        textStyle = TextStyle(
            fontFamily = ClaymarkFonts.Mono,
            fontSize = TypeScale.code,
            lineHeight = TypeScale.code * 1.5f,
            color = c.textPrimary,
        ),
        cursorBrush = androidx.compose.ui.graphics.SolidColor(c.accentBrand),
        interactionSource = interactionSource,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Space.s4)
            .clayInset(base = c.surfaceRaised, colors = c, radius = Radius.md)
            .border(if (isFocused) 2.dp else 1.dp, borderColor, RoundedCornerShape(Radius.md))
            .padding(Space.s3)
            .heightIn(min = 420.dp),
    )
}
