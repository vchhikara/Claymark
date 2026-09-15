@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

package com.claymark.nativeapp

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.isCtrlPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
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
import com.claymark.nativeapp.ui.ClayIconButton
import com.claymark.nativeapp.ui.ClaymarkWordmark
import com.claymark.nativeapp.ui.DrawerMenuButton
import com.claymark.nativeapp.ui.ImageLightbox
import com.claymark.nativeapp.ui.NoticeRow
import com.claymark.nativeapp.ui.ReadingProgressRail
import com.claymark.nativeapp.ui.ScrollTopButton
import com.claymark.nativeapp.ui.SearchBar
import com.claymark.nativeapp.ui.TableOfContentsDialog
import com.claymark.nativeapp.ui.ThemeToggle
import com.claymark.nativeapp.ui.ToastHost
import com.claymark.nativeapp.ui.rememberToastState
import kotlinx.coroutines.launch
import androidx.compose.runtime.LaunchedEffect

/**
 * A short, hand-written sample that exercises headings, a list, a fenced code
 * block, a table, and a link, so the reader visibly demonstrates the default
 * component map on first load.
 *
 * Shown ONLY in the no-document state, never overlaid on a real opened file:
 * a demo must never masquerade as the user's own content.
 */
private const val SAMPLE_MD = """# Claymark

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
    var showOutline by remember { mutableStateOf(false) }
    // §2.1/§2.8/§2.6: search/find-replace state, plus the FocusRequester
    // that lets Ctrl+F/S/E work even while a child (the editor field, say)
    // holds focus — onPreviewKeyEvent intercepts on the way down from this
    // root, before any descendant gets a chance to consume the key.
    var showSearch by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var replaceQuery by remember { mutableStateOf("") }
    var currentMatch by remember { mutableStateOf(0) }
    val rootFocusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { rootFocusRequester.requestFocus() }
    // Populated as each heading composes ([MarkdownDocument]'s
    // `onHeadingRegistered`) — a slug-keyed map of scroll targets, not
    // pixel offsets, so §2.2 never has to compute or track scroll math.
    val headingRequesters = remember { mutableStateMapOf<String, androidx.compose.foundation.relocation.BringIntoViewRequester>() }

    val source = if (session.mode == SessionMode.NO_DOCUMENT) SAMPLE_MD else session.text
    val parsed = remember(source, session.isEditing) {
        if (session.isEditing) null else MarkdownParser.parse(source)
    }
    val headings = remember(parsed) {
        parsed?.let { com.claymark.nativeapp.markdown.collectHeadings(it) } ?: emptyList()
    }

    // §2.1/§2.8: matches are char offsets of `searchQuery` within the plain
    // source — the same raw text VIEWING and EDITING both already hold in
    // `source`/`session.text`, so one search implementation serves both
    // modes. Reset the cursor whenever the query or the underlying text
    // itself changes, so a stale index never points past the new match list.
    val searchMatches = remember(source, searchQuery) {
        if (searchQuery.isBlank()) {
            emptyList()
        } else {
            buildList {
                var idx = source.indexOf(searchQuery, 0, ignoreCase = true)
                while (idx >= 0) {
                    add(idx)
                    idx = source.indexOf(searchQuery, idx + 1, ignoreCase = true)
                }
            }
        }
    }
    LaunchedEffect(searchMatches) { currentMatch = 0 }
    val headingOffsets = remember(source, headings) {
        headings.mapNotNull { h -> source.indexOf(h.text).takeIf { it >= 0 }?.let { h to it } }
    }

    fun jumpToMatch(index: Int) {
        if (searchMatches.isEmpty()) return
        currentMatch = ((index % searchMatches.size) + searchMatches.size) % searchMatches.size
        if (!session.isEditing) {
            val offset = searchMatches[currentMatch]
            val heading = headingOffsets.lastOrNull { (_, at) -> at <= offset }?.first
            heading?.let { h -> headingRequesters[h.slug]?.let { req -> scope.launch { req.bringIntoView() } } }
        }
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

    // Autosave (silent, no user-initiated tap to anchor feedback to) still
    // has the header's own status subtitle, but that's easy to miss while
    // scrolled away from it — a transient toast is the noticed-in-the-
    // corner-of-the-eye confirmation the web build's Sonner findings called
    // for. Keyed on the enum value itself, not a manual "did this just
    // change" flag: LaunchedEffect already only re-fires when the key
    // changes, so this can't double-toast while status stays SAVED.
    val toastState = rememberToastState()
    LaunchedEffect(session.saveStatus) {
        if (session.saveStatus == SaveStatus.SAVED) toastState.show("Saved")
    }

    // §2.4: off the same parsed AST already built for rendering — no
    // second parse pass, no new dependency.
    val wordStats by remember(parsed) {
        derivedStateOf {
            val words = parsed?.let { MarkdownParser.wordCount(it) } ?: 0
            val minutes = maxOf(1, kotlin.math.ceil(words / 200.0).toInt())
            words to minutes
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(c.surface)
            .focusRequester(rootFocusRequester)
            .focusable()
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown || !event.isCtrlPressed) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.F -> {
                        showSearch = true
                        true
                    }
                    Key.S -> {
                        if (session.isEditing) session.save()
                        true
                    }
                    Key.E -> {
                        if (session.hasDocument) {
                            if (session.isEditing) session.backToPreview() else session.startEdit()
                        }
                        true
                    }
                    else -> false
                }
            },
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            Header(
                session = session,
                onOpenDrawer = onOpenDrawer,
                wordStats = wordStats,
                hasOutline = headings.isNotEmpty(),
                onOpenOutline = { showOutline = true },
                onOpenSearch = { showSearch = true },
            )

            if (showSearch) {
                SearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    matchCount = searchMatches.size,
                    currentMatch = currentMatch,
                    onNext = { jumpToMatch(currentMatch + 1) },
                    onPrev = { jumpToMatch(currentMatch - 1) },
                    onClose = {
                        showSearch = false
                        searchQuery = ""
                        replaceQuery = ""
                    },
                    showReplace = session.isEditing,
                    replaceQuery = replaceQuery,
                    onReplaceQueryChange = { replaceQuery = it },
                    onReplaceOne = {
                        val offset = searchMatches.getOrNull(currentMatch)
                        if (offset != null) {
                            val next = source.substring(0, offset) + replaceQuery +
                                source.substring(offset + searchQuery.length)
                            session.updateText(next)
                        }
                    },
                    onReplaceAll = {
                        if (searchQuery.isNotEmpty()) {
                            session.updateText(source.replace(searchQuery, replaceQuery, ignoreCase = true))
                        }
                    },
                )
            }

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
                                    onHeadingRegistered = { slug, requester -> headingRequesters[slug] = requester },
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

            if (session.hasDocument && !session.isEditing) {
                StatusBar(name = session.ref?.name.orEmpty(), wordStats = wordStats)
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

        if (showOutline) {
            TableOfContentsDialog(
                headings = headings,
                onSelect = { slug ->
                    showOutline = false
                    headingRequesters[slug]?.let { requester ->
                        scope.launch { requester.bringIntoView() }
                    }
                },
                onDismiss = { showOutline = false },
            )
        }

        ToastHost(
            state = toastState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = Space.s7),
        )
    }
}

/**
 * A notepad-style status line pinned to the bottom of the reading surface —
 * filename left, word count right, both in the same mono face the code
 * blocks use rather than the UI sans, so this reads as a terse status
 * readout and not another label competing with the header.
 */
@Composable
private fun StatusBar(name: String, wordStats: Pair<Int, Int>) {
    val c = colors
    val (words, minutes) = wordStats
    Column {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(c.borderSubtle),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(c.surface)
                .padding(horizontal = Space.s5, vertical = Space.s2),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = name,
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Mono,
                    fontSize = 11.sp,
                    color = c.textMuted,
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f, fill = false),
            )
            if (words > 0) {
                Text(
                    text = "$words words · $minutes min read",
                    style = TextStyle(
                        fontFamily = ClaymarkFonts.Mono,
                        fontSize = 11.sp,
                        color = c.textMuted,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(start = Space.s3),
                )
            }
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
private fun Header(
    session: DocumentSession,
    onOpenDrawer: () -> Unit,
    wordStats: Pair<Int, Int>,
    hasOutline: Boolean,
    onOpenOutline: () -> Unit,
    onOpenSearch: () -> Unit,
) {
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
                // Plain text, no glyph: this row already carries a lot
                // (Save as / status), and "Back" alone reads clearly next
                // to it without a redundant arrow.
                ClayButton(
                    label = "Back",
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

                Box(modifier = Modifier.weight(1f)) {
                    // The filename and word count moved to the bottom status
                    // bar (notepad-style) — once a document is open, this
                    // slot is just spacing so the header's own buttons stay
                    // right-aligned rather than crowding a redundant label.
                    if (!session.hasDocument) {
                        ClaymarkWordmark(size = 22.sp, color = c.textMuted, text = "Claymark")
                    }
                }

                ClayButton(label = "Open file", compact = true, onClick = session::openFile)
                if (session.hasDocument) {
                    ClayButton(label = "Edit", compact = true, onClick = session::startEdit)
                    ClayIconButton(compact = true, onClick = onOpenSearch, tooltip = "Find (Ctrl+F)") {
                        Icon(Icons.Filled.Search, contentDescription = "Find in document", tint = c.textPrimary)
                    }
                }
                if (hasOutline) {
                    ClayIconButton(compact = true, onClick = onOpenOutline, tooltip = "Outline") {
                        Icon(
                            Icons.Filled.List,
                            contentDescription = "Outline",
                            tint = c.textPrimary,
                        )
                    }
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
 * no resize handle — but §2.7 does earn one rich-text affordance, a
 * formatting toolbar above the field.
 *
 * `.cm-source-textarea:focus-visible` on the web gives the field an
 * `accent-brand` outline the instant it's focused — the equivalent here
 * needs its own [FocusInteraction] source, since a bare [BasicTextField]'s
 * border doesn't react to focus on its own the way a browser's does.
 *
 * §2.7 needs the field's selection range (to wrap it in `**`/`` ` ``/etc.),
 * which [DocumentSession.text] alone can't express — hence the local
 * `TextFieldValue`, synced back to the session's plain-`String` model on
 * every change and re-synced from it (preserving the caret where possible)
 * whenever the text moves out from under the field externally, e.g. a
 * §2.8 Replace All.
 */
@Composable
private fun SourceEditor(session: DocumentSession) {
    val c = colors
    val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val borderColor = if (isFocused) c.accentBrand else c.borderSubtle

    var fieldValue by remember {
        mutableStateOf(androidx.compose.ui.text.input.TextFieldValue(session.text))
    }
    LaunchedEffect(session.text) {
        if (fieldValue.text != session.text) {
            val caret = fieldValue.selection.end.coerceIn(0, session.text.length)
            fieldValue = androidx.compose.ui.text.input.TextFieldValue(
                session.text,
                androidx.compose.ui.text.TextRange(caret),
            )
        }
    }

    fun applyEdit(next: androidx.compose.ui.text.input.TextFieldValue) {
        fieldValue = next
        session.updateText(next.text)
    }

    fun wrapSelection(marker: String) {
        val text = fieldValue.text
        val start = fieldValue.selection.min
        val end = fieldValue.selection.max
        val next = text.substring(0, start) + marker + text.substring(start, end) + marker + text.substring(end)
        val selection = if (start == end) {
            androidx.compose.ui.text.TextRange(start + marker.length)
        } else {
            androidx.compose.ui.text.TextRange(start + marker.length, end + marker.length)
        }
        applyEdit(androidx.compose.ui.text.input.TextFieldValue(next, selection))
    }

    fun insertListPrefix() {
        val text = fieldValue.text
        val start = fieldValue.selection.min
        val lineStart = text.lastIndexOf('\n', (start - 1).coerceAtLeast(0)).let { if (it < 0) 0 else it + 1 }
        val next = text.substring(0, lineStart) + "- " + text.substring(lineStart)
        applyEdit(
            androidx.compose.ui.text.input.TextFieldValue(
                next,
                androidx.compose.ui.text.TextRange(fieldValue.selection.min + 2, fieldValue.selection.max + 2),
            ),
        )
    }

    fun insertLink() {
        val text = fieldValue.text
        val start = fieldValue.selection.min
        val end = fieldValue.selection.max
        val label = if (start == end) "text" else text.substring(start, end)
        val insertion = "[$label](url)"
        val next = text.substring(0, start) + insertion + text.substring(end)
        // Selects "url" so typing immediately replaces it — the one part of
        // the template that always needs real input.
        val urlStart = start + label.length + 3
        applyEdit(
            androidx.compose.ui.text.input.TextFieldValue(
                next,
                androidx.compose.ui.text.TextRange(urlStart, urlStart + 3),
            ),
        )
    }

    Column {
        com.claymark.nativeapp.ui.FormattingToolbar(
            onBold = { wrapSelection("**") },
            onItalic = { wrapSelection("_") },
            onCode = { wrapSelection("`") },
            onLink = { insertLink() },
            onList = { insertListPrefix() },
        )

        BasicTextField(
            value = fieldValue,
            onValueChange = ::applyEdit,
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
                .padding(bottom = Space.s4)
                .clayInset(base = c.surfaceRaised, colors = c, radius = Radius.md)
                .border(if (isFocused) 2.dp else 1.dp, borderColor, RoundedCornerShape(Radius.md))
                .padding(Space.s3)
                .heightIn(min = 420.dp),
        )
    }
}
