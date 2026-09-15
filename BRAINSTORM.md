# Claymark — project brainstorm

**Date: 2026-09-15**
**Scope: whole project, with a deep, Android-specific pass on `claymark-native`**

Not a plan, not a roadmap, not commitments. Ideas only, organized so a later
session can lift any section into `plan/01-ROADMAP.md`-style tasks or a
`docs/CHANGELOG.md` "Deferred" entry without re-deriving the research. Every
idea is checked against `docs/SPEC.md`'s non-goals and `docs/SECURITY.md`'s
threat model before inclusion — nothing here proposes a network call, an
analytics SDK, or a raw-HTML escape hatch. Sourced from three kinds of input:
this repo's own disclosed gaps (`HANDOFF-2.md`, `PROCESS.md`,
`plan/04-STATE-LEDGER.md`'s deferred-work register,
`scratch/shadcn-prototype/FINDINGS.md`), the actual `AndroidManifest.xml`/
`build.gradle.kts` in `claymark-native/` (so recommendations are grounded in
the real `minSdk`/`targetSdk`, not assumed), and external research (cited).

**One standing tension to keep in view:** `claymark-native/HANDOFF-2.md` §6
recorded *"No new features, screens, or settings. Scope discipline was
explicit"* as a ground rule for that port. The drawer/Settings/Help/About/
Privacy work already shipped on this branch (`kotlin-native-port`,
2026-09-15) crossed that line once, at explicit request. This document
brainstorms further — it does not re-litigate that decision, but every idea
below is worth weighing against "is this earning its complexity" before
building, not just "is this cool."

---

## 0. Grounding facts (checked, not assumed)

| Fact | Value | Where confirmed |
|---|---|---|
| `minSdk` | 26 (Android 8.0) | `claymark-native/app/build.gradle.kts` |
| `targetSdk` / `compileSdk` | 35 (Android 15) | same |
| `applicationId` | `com.claymark.nativeapp` | same |
| `INTERNET` permission | **Not declared, deliberately** | `AndroidManifest.xml` — enforces NFR-1.6 at the platform level, not by convention |
| Existing intent filters | `MAIN`/`LAUNCHER`, `VIEW` for `content://text/markdown` and `file://*.md` | `AndroidManifest.xml` |
| `allowBackup` | `false` | `AndroidManifest.xml` |

Any idea below that would need `INTERNET`, a new broad permission, or backup
of user content is flagged explicitly — those are the ones that need an
actual conversation, not just an implementation pass.

---

## 1. Android-platform-native ideas (the deep pass)

These are things a WebView/Tauri shell structurally cannot offer well, which
is the actual argument for having gone native at all — if none of these ever
get built, the native port's advantage over the Tauri build is mostly
"smaller APK," which undersells the investment already made in it.

### 1.1 Home screen widget (Jetpack Glance)

A small widget showing the last-opened document's title and (optionally)
reading progress, tap-to-resume. `androidx.glance` is the current
(non-deprecated) API — Compose-style code, Glance translates it to
`RemoteViews`. Confirmed best practices from current docs/community
writing:

- Widgets must stay **passive** — read cached state, never block on network
  or heavy work inside `provideGlance`. For claymark this is trivial: the
  widget would read the same local "last opened doc" record a recent-files
  list (§2.3) would already maintain, nothing new to compute.
- Update triggers should be **event-driven** (`updateAll` on state change),
  not polled — no periodic `WorkManager` job needed for something as static
  as "what was I last reading."
- Glance 1.1.0+ has `@Preview` support, but real-launcher testing still
  differs from preview (corner radius, sizing) — worth knowing before
  trusting a screenshot.
- Design constraint: limited elements, variable widget sizes, theme-aware
  color (should read `ClaymarkColors`, not hardcode).

**Verdict:** genuinely native-only differentiator, self-contained, no new
permission. Medium effort (new Glance module + a small persisted "last
document" record). Good second-phase idea, not a first cut.

Sources: [Glance dev guide](https://developer.android.com/develop/ui/compose/glance), [Building widgets with Glance — Medium](https://medium.com/@prakash_ranjan/building-home-screen-widgets-in-android-with-jetpack-glance-and-keeping-them-up-to-date-bcacf270c1cf), [Manage & update GlanceAppWidget](https://developer.android.com/develop/ui/compose/glance/glance-app-widget)

### 1.2 App Shortcuts (long-press launcher icon)

`ShortcutManagerCompat` (the Jetpack helper, preferred over raw
`ShortcutManager` for cross-version consistency) supports three kinds:

- **Static** (declared in XML, fixed) — e.g. "Open file" jumping straight to
  the SAF picker, skipping the app's own UI entirely on a long-press.
- **Dynamic** (pushed at runtime, can change) — e.g. up to 2–3 recent
  documents as separate shortcuts, refreshed whenever a doc is opened/saved.
  `ShortcutManagerCompat.pushDynamicShortcut`/`setDynamicShortcuts`.
- **Pinned** (user drags one to the home screen) — a specific document,
  user-initiated, persists even if removed from the dynamic set.

No new permission, small code footprint (a `ShortcutInfoCompat.Builder`
per shortcut + a call at the natural "document opened" event already in
`DocumentSession`). Directly composes with §2.3's recent-files idea — same
underlying data, two surfaces.

**Verdict:** low effort, no permission cost, real day-to-day utility. One of
the higher-value/cost ratio ideas in this whole document.

Source: [Create shortcuts — Compose](https://developer.android.com/develop/ui/compose/system/shortcuts/creating-shortcuts)

### 1.3 Sharing into Claymark (be a share target, not just a share source)

Android's **Sharing Shortcuts API** (replaced the older `ChooserTargetService`
pull model in API 29; the old service was fully deprecated in API 30) lets an
app publish *Direct Share* targets — the row of specific-contact/app icons
above the generic share sheet list, not just "Claymark" as one generic entry.
For a single-document reader without contacts/conversations, the generic
`ACTION_SEND` registration (any app → "Share" → Claymark appears, opens the
shared Markdown text as a new unsaved buffer) is the right scope — the
Direct-Share row is built for messaging-style "share to a specific person,"
which doesn't map onto claymark's model. Worth being precise about that
distinction rather than over-building: **plain `ACTION_SEND` intent filter
for `text/markdown` and `text/plain`, not the full Sharing Shortcuts
machinery.**

This is the one item here that's a genuine gap today: the app can *be
opened* via `ACTION_VIEW` on a file, but another app's "Share" sheet can't
hand it raw text. Cheap manifest addition + a new `DocumentSession` entry
point for "opened from shared text, no backing file yet" (closer to the
existing `NO_DOCUMENT`→ paste flow than to `openLaunchDocument`).

**Verdict:** small, real capability gap, worth doing before the fancier
widget/shortcut ideas.

Sources: [Provide Direct Share targets — Compose](https://developer.android.com/develop/ui/compose/sharing/direct-share-targets), [Sharing Shortcuts — storage-samples](https://github.com/android/storage-samples/tree/main/SharingShortcuts)

### 1.4 Predictive back gesture

`minSdk` 26 means this can't be assumed everywhere, but `targetSdk`/
`compileSdk` 35 (Android 15) means it's **on by default** for devices
running 15+ (enabled by default since Android 15; opt-in via Developer
Options on 13–14). Compose's `PredictiveBackHandler` (needs
`androidx.activity:activity` 1.6.0+, already well below what this project
pins) exposes a `Flow<BackEventCompat>` with live swipe progress
(`progress: Float`, touch X/Y) instead of the current all-or-nothing
`BackHandler`.

Direct fit for exactly the interactions already built this session:

- **Drawer close** — the system already animates a predictive-back peek for
  a `ModalNavigationDrawer` closing, for free, once the drawer's back
  handling is expressed as `PredictiveBackHandler` instead of plain
  `BackHandler`. Currently (per this session's drawer work) it's a plain
  `BackHandler` — an easy, low-risk upgrade, not a new feature.
  - **Caution found in the same research:** predictive-back's swipe-to-peek
    behavior can visually clash with the app's own screen-to-screen
    transition if both animate independently — worth a real before/after
    check on-device before calling this "just an upgrade," not just wiring
    the API and assuming it looks right.
- **Sub-screen → Reader** back nav (Settings/Help/About/Privacy) — same
  upgrade path.
- The **unsaved-changes abandon dialog** should probably *not* get
  predictive-back treatment — a destructive-decision dialog benefits from
  the current one-shot `BackHandler`+`Dialog` behavior (no gesture-driven
  peek at "what if I go back" when going back means "did you mean to lose
  this edit").

**Verdict:** cheap, real polish, already directly relevant to code just
written this session. Good near-term follow-up once the drawer is actually
verified on-device.

Sources: [About Predictive Back — Compose](https://developer.android.com/develop/ui/compose/system/predictive-back), [Access progress manually](https://developer.android.com/develop/ui/compose/system/predictive-back-progress)

### 1.5 Material You dynamic color — a real design decision, not a default

`dynamicLightColorScheme(context)`/`dynamicDarkColorScheme(context)` derive
an M3 `ColorScheme` from the device wallpaper, API 31+ only (`minSdk` 26
means this must be conditional on `Build.VERSION.SDK_INT >= S`, falling back
to the existing fixed palette below that).

**This is worth raising as a question, not a recommendation.** Claymark's
whole design identity (`docs/THEMING.md`, `brand_guidelines.md`) is a
specific, hand-tuned clay/serif palette — `--clay-500`/`#d97757` is a brand
constant, not a preference. Wallpaper-derived dynamic color is the opposite
philosophy: the app's colors become an extension of *your* wallpaper, not
Claymark's identity. Two honest options, not a default answer:

- **Skip it entirely** — consistent with "the document is the priority, the
  chrome should recede" (`brand_guidelines.md` §7) already guiding every
  other decision in this app.
  - **Reasoning worth stating explicitly:** dynamic color governs *chrome*
    surfaces (buttons, drawer, header) the same way it would in any other
    M3 app — it does not reach into the reading surface's own
    `ClaymarkColors` tokens (`--text-primary`, code/table colors, etc.),
    which stay exactly as specified regardless. So the actual tradeoff is
    narrower than "give up the brand identity" — it's specifically "should
    the chrome match the wallpaper or match the brand," not "should the
    whole reading experience follow the wallpaper."
- **Offer it as an opt-in Settings toggle** ("Match wallpaper colors," off
  by default) — respects users who want their launcher/OS to feel cohesive,
  without silently overriding the brand default for everyone.

If pursued at all, it's a toggle exactly like the AMOLED one just shipped —
same shape, same `SettingsStore` pattern, same "resolved colors depend on a
stored preference" pipeline already built in `theme/Theme.kt`.

**Verdict:** not recommending either way — flagging as a real product
decision with the actual tradeoff spelled out, not a default "yes, add it."

Sources: [Material Theming with Compose — Android Developers](https://developer.android.com/codelabs/basic-android-kotlin-compose-material-theming), [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)

### 1.6 Foldable / large-screen / tablet support

Current UI is a single-column phone layout end to end (`Measure` caps
reading width, but the *shell* — drawer, header — doesn't adapt to a wider
window). Current guidance:

- **`SlidingPaneLayout`-style two-pane** is the standard pattern for a
  reader-with-a-list app on a book-posture foldable or tablet unfolded in
  landscape: a list pane (here: the drawer content, or a future
  recent-files list) alongside the detail pane (the open document), rather
  than the drawer-over-content pattern that makes sense on a phone.
  Automatically collapses to single-pane below a width threshold (roughly
  600dp combined minimum for both panes) — so it degrades to exactly
  today's phone behavior without a separate code path per form factor.
- **Posture awareness**: "book" posture (foldable open like a book) favors
  the two-pane master-detail above; "tabletop" posture (half-folded, flat)
  suggests moving controls to the bottom half where hands rest — relevant
  if editing mode is ever used propped up on a table.
- This is real, unclaimed territory for claymark: nothing in `docs/SPEC.md`
  or `brand_guidelines.md` currently addresses large screens at all,
  because the original web build's target was a browser viewport, not a
  window that can be 600–1200dp wide.

**Verdict:** meaningfully larger effort than anything else in this list —
a real layout-architecture decision, not a component swap. Flag as a
distinct future initiative rather than a task to slot in casually; the
drawer-vs-two-pane choice would ideally be made once, not iterated
per-screen.

Sources: [Learn about foldables — Android Developers](https://developer.android.com/develop/adaptive-apps/guides/foldables/learn-about-foldables), [Create a two-pane layout](https://developer.android.com/develop/ui/views/layout/twopane), [Large screen app quality guidelines](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)

### 1.7 Other native-platform surface area (lighter-weight, listed for completeness)

| Idea | Notes |
|---|---|
| **Quick Settings tile** ("Open Claymark" / jump to last doc) | `TileService`, small, but a QS tile is usually reserved for genuinely frequent toggles (Wi-Fi, flashlight) — a document-reader tile is a marginal fit; listed for completeness, not recommended. |
| **Print support** (`PrintManager`, "Print" from the header menu) | Render the current parsed document to a `PrintDocumentAdapter`. No network, no new permission (printing is a system service, not `INTERNET`). Real utility for anyone wanting a hard copy or PDF-via-print-to-PDF. |
| **Text-to-speech "read aloud"** | `TextToSpeech` API, reads the parsed plain-text content. Genuinely useful for accessibility and hands-free use; needs a decision on how it should treat code blocks/tables (skip vs. read literally) and math (skip vs. describe). Non-trivial content-model work, but zero network/permission cost. |
| **Per-app language preference** (Android 13+ `LocaleConfig`) | Only matters once claymark-native ships more than one UI locale — currently English-only throughout, so this is a placeholder for whenever localization is considered, not actionable today. |
| **Themed (Material You) adaptive icon** | API 33+ monochrome icon layer so the launcher icon tints to match the device theme alongside dynamic color (§1.5) — purely cosmetic, cheap, and *doesn't* carry the same brand-identity tension as §1.5 since it's just the launcher icon, not the app's reading surface. |
| **Baseline Profiles** (startup/jank optimization) | `androidx.profileinstaller`, precompiles hot code paths. Pure performance, no visible feature, but directly answers `HANDOFF-2.md` §5's "Performance: nothing has been measured here" gap with a concrete, low-risk first step. |

---

## 2. Reader & editor quality-of-life (carried forward + expanded from the prior brainstorm)

Re-stated here for a single canonical document rather than split across
chat history, with a couple of Android-specific angles folded in.

### 2.1 In-document search
Highlight matches in the rendered/edit view, jump next/prev, `Ctrl+F`-style
if a hardware keyboard is attached (see §2.6). Scoped to the already-parsed
AST — no new dependency.

### 2.2 Table of contents / outline jump
`Heading.kt`'s existing slug generation already gives every heading a stable
id; a tap-to-jump bottom sheet listing headings by level is a thin UI layer
over data that already exists.

### 2.3 Recent files (MRU list)
Small locally-persisted list (same `SharedPreferences`-or-similar pattern as
`DraftStore`/`SettingsStore`), surfaced from the drawer, and the direct
data source for §1.1's widget and §1.2's dynamic shortcuts — build once,
reuse three ways.

### 2.4 Word count / reading time
Computed from the parsed AST, shown as a small subtitle — matches the
existing understated-chrome aesthetic (no new dependency, no layout
disruption).

### 2.5 Text-size / measure control
`TypeScale.body`/`Measure` are already tokens (`theme/Tokens.kt`); a
Settings stepper (not full runtime theming — the web build's own disclosed
gap, per `docs/API.md`, is *not* wanting to expose that) is a small,
well-scoped, already-token-backed addition.

### 2.6 Hardware-keyboard affordances
Foldables and larger-screen use (§1.6) make an attached hardware keyboard
more likely than on a typical phone. Standard shortcuts (`Ctrl+F` search,
`Ctrl+S` save, `Ctrl+E` toggle edit) cost little once `KeyEvent` handling is
wired for one, and directly serve the large-screen story rather than being
a speculative nice-to-have.

### 2.7 Minimal formatting toolbar (edit mode)
Bold/italic/link/list/code, inserted around the current selection in
`SourceEditor`'s `BasicTextField`. Named explicitly in market research as
the one thing mobile markdown editors need that desktop ones don't (a
physical keyboard makes `**`/`` ` `` easy to type; a soft keyboard doesn't).

### 2.8 Find & replace (edit mode)
Natural pairing with §2.1, editor-scoped, same underlying text-search
primitive doing double duty.

---

## 3. Pull from the shelf: `scratch/shadcn-prototype/` findings, translated to Compose

The web project already spent a full validation pass proving these
components port cleanly onto Claymark's own token system (`FINDINGS.md`),
with zero Tailwind, real Radix a11y behavior kept intact, and specific
gotchas already documented (token-wrapping mistakes, `forwardRef`
requirements). None of that React code transfers directly to Kotlin, but
the *design decisions* — which components are worth having, and the exact
interaction contract each must preserve — do:

| Web finding | Compose translation | Where it'd land |
|---|---|---|
| **Toast** (built from scratch, no Radix primitive underneath — a real from-scratch component, not a styling port) | Replace the header's plain "Saved"/"Saving…"/"Save failed" text with a transient toast — more noticeable, and specifically more useful now that autosave (shipped this session) saves silently in the background with no user-initiated tap to anchor feedback to. | New `ui/Toast.kt`, surfaced from `DocumentSession.saveStatus` transitions |
| **Tooltip** (Radix primitive kept, styling replaced) | Long-press tooltip on every icon-only button — `DrawerMenuButton`, `ThemeToggle`, `ScrollTopButton` currently have no visible label beyond `contentDescription`, which only helps screen-reader users, not sighted users unsure what an icon means. | `androidx.compose.material3.TooltipBox`/`PlainTooltip`, recolored against tokens the same way `ClaySwitch` was |
| **Badge** (no Radix primitive, pure markup/style) | Code-block language label (`CodeBlockView.kt`) as a small pill instead of plain text — matches the web finding's own suggested use (a status/category label) almost exactly. | `ui/Components.kt`, styled with `clayRaised` at a small radius, same idiom as everything else in that file |

The web `FINDINGS.md`'s single structural lesson — *check whether a
component is Radix-backed (→ keep behavior, replace styling) before
assuming that recipe applies; Toast wasn't, and needed a from-scratch
build* — has a direct Compose analogue: **check whether M3 already ships
the interaction primitive** (`TooltipBox` does; a from-scratch toast is
still needed since M3 has no first-party toast/snackbar equivalent that
matches this app's "small, corner-anchored, non-blocking" shape as closely
as `Snackbar` does for a full-width bottom bar) before writing one from
scratch.

---

## 4. Hardening / gaps surfaced by the port's own disclosed documentation

Not new ideas — restated here so this brainstorm is a complete map of
"things worth doing," not just the fun parts. All sourced directly from
`HANDOFF-2.md`/`README.md`/`PROCESS.md`, not invented this pass.

| Gap | Source | Note |
|---|---|---|
| Remote `http(s)` images silently drop to alt-text on Android but *would* load on the web build | `HANDOFF-2.md` open question 1 | Explicitly flagged as needing a real decision, not a default — the original is "internally inconsistent" per the handoff's own words |
| Zero tests in the native port (web build had 355) | `HANDOFF-2.md` §5 | `UrlPolicy.safeUrl` named as highest-value first target — it's the actual security boundary |
| No accessibility pass on the native port | `HANDOFF-2.md` §5 | Web build hit WCAG 2.2 AA / zero axe violations; nothing equivalent checked here — TalkBack traversal order, disabled-checkbox semantics, contrast in both themes (now three, with AMOLED) all unverified |
| No release signing config | `HANDOFF-2.md` §5 | Needed before any real distribution, including sideloading for testing beyond a debug APK |
| Table column widths are heuristic, not exact | `README.md` "Known deviations" | A `SubcomposeLayout` measuring pass would be exact; flagged as an upgrade path, not urgent |
| Lexical (not TextMate) syntax highlighting | `README.md` "Known deviations" | Upgrade path already named: a KMP highlighter library, or running Shiki in the existing WebView infra (cheap now that the asset loader exists) |
| Inline math only renders in plain-text paragraphs | `README.md`/`HANDOFF-2.md` | Upgrade path: generate escaped HTML from the full inline AST instead of flattened text |

---

## 5. Distribution (not asked for, flagged for completeness)

Currently a debug-only local build with no signing config
(`HANDOFF-2.md` §5) and `allowBackup="false"`. If this is ever meant to
reach anyone beyond on-device testing:

- **F-Droid** is a natural fit *if and only if* the project stays exactly
  as network-free/dependency-clean as it is today — F-Droid's own build
  reproducibility requirements reward the "zero runtime network requests,
  vendored assets" posture this app already has, more than the Play Store
  would.
- **Play Store** would need a signing config, a privacy-policy URL (the new
  Privacy screen's content could *be* that policy, verbatim), and a
  decision on whether `allowBackup="false"` stays — it's a deliberate
  choice today (nothing sensitive to back up, arguably nothing *to* back up
  given the zero-persistence design), worth keeping unless a future feature
  (recent files, widget state) makes backup meaningfully useful.

---

## 6. Explicitly considered and set aside

Listed so a future session doesn't re-propose these without knowing they
were already weighed:

- **Cloud sync** (any provider) — directly contradicts NFR-1.6 and the
  entire zero-network design. Not a "maybe later," a hard no under the
  current product identity.
- **Analytics / crash reporting** — same reasoning already applied to the
  Privacy screen this session; still holds.
- **A markdown-flavored WYSIWYG editor** — `docs/SPEC.md` §6 lists "Markdown
  editing, WYSIWYG, or live preview authoring" as an explicit non-goal for
  the whole project, not just the web build.
- **Quick Settings tile** — see §1.7, marginal fit, listed but not
  recommended.

---

## Sources consulted this pass

- [Jetpack Glance — Android Developers](https://developer.android.com/develop/ui/compose/glance)
- [Building widgets with Glance — Medium](https://medium.com/@prakash_ranjan/building-home-screen-widgets-in-android-with-jetpack-glance-and-keeping-them-up-to-date-bcacf270c1cf)
- [Manage and update GlanceAppWidget](https://developer.android.com/develop/ui/compose/glance/glance-app-widget)
- [Material Theming with Jetpack Compose](https://developer.android.com/codelabs/basic-android-kotlin-compose-material-theming)
- [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [About Predictive Back — Compose](https://developer.android.com/develop/ui/compose/system/predictive-back)
- [Access predictive back progress manually](https://developer.android.com/develop/ui/compose/system/predictive-back-progress)
- [Learn about foldables](https://developer.android.com/develop/adaptive-apps/guides/foldables/learn-about-foldables)
- [Create a two-pane layout](https://developer.android.com/develop/ui/views/layout/twopane)
- [Large screen app quality guidelines](https://developer.android.com/docs/quality-guidelines/large-screen-app-quality)
- [Provide Direct Share targets — Compose](https://developer.android.com/develop/ui/compose/sharing/direct-share-targets)
- [Sharing Shortcuts sample — android/storage-samples](https://github.com/android/storage-samples/tree/main/SharingShortcuts)
- [Create shortcuts — Compose](https://developer.android.com/develop/ui/compose/system/shortcuts/creating-shortcuts)
- Internal: `claymark-native/README.md`, `claymark-native/HANDOFF-2.md`, `claymark-native/PROCESS.md`, `claymark-native/app/build.gradle.kts`, `claymark-native/app/src/main/AndroidManifest.xml`, `scratch/shadcn-prototype/FINDINGS.md`, `plan/04-STATE-LEDGER.md`
