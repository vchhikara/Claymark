# Claymark web (browser) extension — feature checklist (rewritten 2026-09-18)

For the session that scopes and builds the **Claymark web/browser
extension** — confirmed via a fresh filesystem check that it does not exist
yet: no `manifest.json` shaped like an extension manifest anywhere in the
repo (the two `manifest.json` files that DO exist — `public/manifest.json`
and its build output `dist/manifest.json` — are the **PWA's** web-app
manifest, an unrelated JSON format that happens to share a filename; don't
let that collision cause confusion when searching the repo), no
`@types/chrome`/`webextension-polyfill` dependency in `package.json`, no
extension-shaped directory. Genuinely green-field.

This is a rewrite of the original checklist, cross-confirmed against the
actual source (not just the desktop-session's own notes) — every claim below
was independently verified by reading the real file it cites. Corrections
from the original draft are called out inline where a claim turned out to be
imprecise, not just restated.

**How to use this**: not "build all of this" — decide per item: reuse via
the `claymark` library, reimplement for the extension's constraints, or
explicitly skip (state why). Per `handoff.md`, scope must be confirmed with
the user before implementation — §0 exists to drive that conversation, not
to be silently resolved by whoever picks this up.

**§0 is now LOCKED (2026-09-18)**: reader mode + popup/side-panel viewer +
popup/side-panel editor, all in v1; Chrome/Chromium MV3 and Firefox both in
scope; persistence of the last pasted/edited doc (viewer/editor only) is a
confirmed non-goal override. See §0 for the full detail. Reusable assets for
implementation have been staged in `_web-extension-staging/` (temporary,
will be deleted once a real extension package exists).

---

## 0. Scope — LOCKED 2026-09-18, confirmed by user in chat

- [x] **What does the extension do?** All three, confirmed as in-scope for
      v1, not sequenced/phased at this point:
  - [x] Content-script "reader mode" — detect and re-render `.md`/raw
        Markdown served by a page (raw GitHub file URLs, a `.md` served as
        `text/plain`), or upgrade GitHub's own already-rendered Markdown
        pages to Claymark's rendering.
  - [x] Popup or side-panel **viewer** — paste/drop Markdown, see it
        rendered — no page interaction, no content script needed at all.
  - [x] Popup or side-panel **editor** — same as viewer, but editable.
        **Confirmed non-goal override** (`docs/SPEC.md` §6, "not a Markdown
        editor") — same class of explicit override the desktop app already
        made once; recorded here as deliberate, not a silent addition.
- [x] **Which browsers?** Chrome/Chromium MV3 **and** Firefox, both in scope
      for v1. Firefox divergences to design around from day one (not
      retrofit later): no `chrome.*` namespace by default (needs `browser.*`
      or a polyfill — e.g. `webextension-polyfill`), Firefox still supports
      MV2 alongside MV3 unlike Chrome. The manifest and any
      background/service-worker code must account for both targets from the
      first draft.
- [x] **Persistence, if any?** **Confirmed non-goal override**: remember the
      last pasted/edited doc, beyond the theme preference the library
      already allows. Only applies to the viewer/editor surfaces (§3);
      reader-mode itself still needs no persistence. Use `chrome.storage`
      (or the WebExtension `storage` API via the polyfill for Firefox
      parity) — not `localStorage`, which isn't reliably available/scoped
      the same way across extension contexts (popup vs. content script vs.
      service worker).

---

## 1. What's directly reusable, unmodified

- [ ] The `claymark` npm library itself — confirmed real at the repo root,
      `package.json` exports both ESM/CJS builds (`dist/claymark.js`/`.cjs`)
      plus `.d.ts` types. This is the rendering engine: CommonMark/GFM
      parsing, sanitization, syntax highlighting, math, Mermaid, table
      rendering. Consume it as a dependency; do not reimplement any of it.
- [ ] `src/theme/tokens.css` + `src/theme/claymark.css` — confirmed present,
      full design-token and claymorphism system. Reusable as-is for any
      extension-owned UI (popup, side panel, injected reader-mode chrome) to
      stay visually consistent with the other three shipped surfaces.
      **See §2's color-mix() note before copying `claymark.css` wholesale —
      it currently carries the fix for a real bug, not a clean reference.**
- [ ] The three typefaces (Source Serif 4, Inter, JetBrains Mono — OFL 1.1)
      — already licensed for redistribution, already bundled locally on
      every other surface (no external font fetch), consistent with
      NFR-1.6's zero-network constraint.
- [ ] `src/pipeline/plugins/url-policy.ts` — confirmed real, this exact file
      is the URL allow-list implementation cited in §6. Reuse it directly;
      do not re-derive the scheme allow-list by hand.

---

## 2. Core rendering-engine parity, plus extension-specific traps

Cross-checked against `docs/SPEC.md`'s actual FR/NFR numbers and
`android/README.md`'s real "Known deviations" section (both read in
full for this rewrite, not assumed from memory).

- [ ] CommonMark + GFM (tables, strikethrough, task lists, autolinks) — FR-1.1/1.2.
- [ ] Fenced code blocks, language identifiers, highlight metadata — FR-1.3.
- [ ] Inline (`$…$`) and display (`$$…$$`) math — FR-1.4.
- [ ] Mermaid diagrams — FR-1.5.
- [ ] 34-language Shiki syntax highlighting — FR-4.1 (this is the **real**,
      full TextMate-grammar highlighter; the Android app's 34-language
      *lexical* highlighter is a JVM-only workaround, a completely different
      and lower-fidelity implementation — see
      `android-to-desktop-checklist.md` §8. Do not let "34 languages" read
      as "same code" across those two surfaces; the extension should use
      Shiki via the library, full stop).
- [ ] Copy-to-clipboard from code blocks — FR-4.3.
- [ ] Theme follows `prefers-color-scheme`, manually overridable — FR-5.3.

### Trap 1 — raw HTML staying inert inside a page the extension doesn't control

- [ ] `docs/SPEC.md` FR-1.6 (confirmed, verbatim): *"Raw HTML in the input
      is inert — neither rendered nor executed. Escaped and displayed as
      text."* This guarantee was built and tested for a standalone app
      rendering its own input into its own DOM tree. **A content script
      changes the threat model**: it runs inside a host page's live DOM, so
      the question isn't just "does Claymark execute HTML found *inside* the
      Markdown it's given" — it's also "can the *host page itself* (fully
      untrusted, arbitrary, adversarial by MV3's own threat model) reach
      into or interfere with the extension's rendered output via CSS
      cascade, DOM mutation observers, or event bubbling, and make Claymark
      render something the host page controls as if it were trusted
      Markdown-derived content?" These are two different questions with two
      different answers required. Write a test that specifically tries to
      break out via the *host page's* own DOM/CSS/JS, not just via crafted
      Markdown input — the existing test suite (355 tests per `ledger.md`)
      almost certainly only covers the second question.
- [ ] Shadow DOM (`attachShadow({mode: 'closed'})`) for any content-script-
      injected UI is the standard mitigation for CSS-cascade bleed in both
      directions (host page styles leaking in, extension styles leaking
      out) — evaluate it explicitly rather than injecting plain elements
      into the host page's light DOM.

### Trap 2 — the `color-mix()` fallback lesson from this session, verified against the actual fix

- [ ] `ledger.md` L-023 (confirmed, read directly): a real, shipped bug in
      the desktop app — `.pb-button[data-variant='outline'/'secondary']`,
      `.pb-dialog-content`, `.pb-clay-raised`, `.pb-clay-pot` all set
      `background-image` to a `linear-gradient()` built with `color-mix()`,
      **with no `background-color` fallback**. When the runtime didn't
      support `color-mix()`, the *entire* `background-image` declaration was
      dropped (not degraded, not partially applied — dropped whole), leaving
      buttons rendering as blank white pills with invisible light-colored
      text on top. The fix (confirmed present now) added a solid
      `background-color` ahead of every affected gradient, in exactly three
      files: `src/app/ui/dialog.css`, `src/app/ui/button.css`,
      `src/theme/claymark.css`.
- [ ] **This means `src/theme/claymark.css` — the file §1 says is directly
      reusable — currently contains the *fixed* version of this bug, not a
      pristine reference.** Before copying its gradient rules into an
      extension context, confirm the extension's actual target runtime
      (a specific Chromium version via the Chrome Web Store's minimum
      supported version, and separately Firefox's, if in scope per §0)
      supports `color-mix()` — don't assume "modern browsers support it" the
      way the original desktop bug did. If in doubt, keep every solid
      `background-color` fallback that's already there; don't strip them as
      "unnecessary" without checking.
- [ ] Generalize the lesson, don't just patch this one property: any CSS
      feature detection or fallback strategy that worked in the Tauri
      webview (a single, known, relatively modern WebKit/Chromium build)
      cannot be assumed to hold for MV3's actual constraint — the extension
      must run correctly across whatever range of Chrome/Chromium versions
      the Web Store's minimum-version policy admits, which is typically
      older and wider than "whatever WebKit ships with the Tauri version we
      built against."

### Other library-level items needing an extension-specific answer

- [ ] **Zero runtime network requests (NFR-1.6)** — confirmed as a real,
      stated requirement (`docs/SPEC.md`, verbatim: *"All assets are
      bundled"*). This is the hardest one to keep in a reader-mode
      extension: does it only ever act on content already present in the
      page (no requests of its own), or does it fetch anything (e.g.
      resolving a relative image `src`)? MV3's `host_permissions` model
      makes any such fetch an explicit, store-reviewable grant — decide up
      front.
- [ ] **Bundle-size budgets, confirmed exact numbers from `docs/SPEC.md`
      NFR-2** (previous draft's numbers were right, now double-checked):
      initial bundle, core only < **120 KB gzipped**; highlighter lazy chunk
      < **300 KB gzipped**. Chrome Web Store's own hard ceiling is a
      separate, larger number (item size limits in the tens of MB, not
      comparable) — the real constraint here isn't a store rejection risk,
      it's MV3 service-worker/content-script injection latency and the
      extension's own perceived-responsiveness budget, which should if
      anything be *tighter* than the desktop numbers, not looser.
- [ ] **Images opening in a modal lightbox — FR-5.1 is a pre-existing,
      confirmed gap, not something to build as part of extension work.**
      Read directly from `docs/SPEC.md`, verbatim: *"the caption half
      shipped (`Image.tsx` renders a `<figcaption>` from the title); the
      lightbox half did not — `Lightbox.tsx` exists but is not wired into
      image rendering, so images do not currently open in a modal."*
      `src/components/Lightbox.tsx` does exist on disk (confirmed) but has
      exactly zero import references anywhere else in `src/` (confirmed via
      full-repo search) — it is genuinely dead code today. Do not "fix" this
      as an unplanned side quest inside extension work; if the extension's
      scope needs a lightbox, that's a separate, explicitly-scoped task that
      happens to also benefit the other three surfaces.
- [ ] **Remote images**: `android/README.md`'s real "Known
      deviations" list (confirmed, item 4, verbatim): *"Remote images are
      not fetched — they show alt text. This follows from dropping
      `INTERNET`."* — i.e. Android's choice was a direct consequence of not
      requesting the Android `INTERNET` permission at all, not an
      independent design preference. The extension's analogous decision
      isn't really "should we be as conservative as Android" — it's
      "does a reader-mode content script rendering a page's *own* Markdown
      need `host_permissions` to re-fetch an image the host page's own
      network stack already fetched for the DOM it's sitting in?" In most
      reader-mode designs the browser has already loaded the image as part
      of the page; the extension may not need a fetch of its own at all.
      Resolve this only once §0's actual injection model is picked — it's
      unanswerable in the abstract.

---

## 3. App-chrome features — evaluate per the scope decided in §0

Only relevant if scope includes a popup/side-panel viewer or editor.

- [ ] Claymorphism-styled chrome — reuse `src/theme/claymark.css` patterns,
      subject to the §2 `color-mix()` caveat above.
- [ ] Search/replace within a rendered document — only relevant to a
      viewer/editor; reader-mode can likely lean on the browser's native
      find-in-page instead of reimplementing search.
- [ ] TOC/outline — **correction to the original draft**: `collectHeadings`
      is **not** a library-level utility. Confirmed at
      `src/app/toc.ts`, whose own top-of-file comment (verbatim) states:
      *"No existing `collectHeadings` utility exists in `src/pipeline/`
      (checked `fast-path.ts` and the commonmark processor — headings are
      handled inline during hast conversion with no separate collection
      pass) — this is a standalone ATX-heading walker over the raw source
      text, not a second parallel parser of the full CommonMark grammar."*
      It's a desktop-app-local file (`src/app/`), a lightweight regex-based
      walker, not something exported by the `claymark` package. The
      extension has two real options, not one: (a) import this exact file
      if the extension's build can reach into `src/app/` (only sensible if
      the extension lives in the same monorepo/build graph), or (b) write
      its own small ATX-heading walker, which is genuinely cheap given how
      small this implementation already is. Do not go looking for a
      library-exported `collectHeadings` — it doesn't exist to be found.
- [ ] Theme picker (Auto/Light/Dark) — only meaningful if the extension
      persists its own preference (ties to §0).
- [ ] Formatting toolbar (Bold/Italic/Code/List/Link) — only if scope
      includes editing; this is the non-goal-override case from §0.
- [ ] Toast notifications — only if there's an async action worth
      confirming ("copied," "saved" if persistence exists).

---

## 4. Browser/OS integration — no prior-surface precedent, needs its own design

Neither the desktop app's file-association/drag-drop work nor Android's
content-resolver integration ports directly — this is a genuinely new
integration surface for this codebase.

- [ ] **How does content get into the extension?** Candidates: user
      navigates to a raw `.md` URL directly (content-script auto-detect) ·
      user pastes text into a popup · user drags a local file onto a
      popup/side panel · a right-click context-menu action ("Render this
      page as Markdown," "Render selection as Markdown").
- [ ] **MV3 permission model** — does auto-detecting `.md` content need
      broad `host_permissions` (`<all_urls>`, a heavier Chrome Web Store
      review flag) or can it be scoped to explicit user action
      (`activeTab`, no always-on background content script)? Prefer the
      narrowest permission that satisfies the confirmed §0 scope — a real
      security/reviewability trade-off, not a formality; broad
      `host_permissions` extensions get materially more review scrutiny and
      a scarier permissions-grant prompt shown to the user at install time.
- [ ] **Manifest V3 architecture, once §0 is settled**: background service
      worker (context-menu action) vs. content script (auto-detection) vs.
      popup/side-panel only (paste/drop). These have genuinely different
      lifecycle models with no equivalent anywhere else in this codebase —
      a service worker unloads when idle and has no persistent module-level
      state the way every other Claymark surface's entry point does. Budget
      for this being a new class of bug, not "the same app in a new
      wrapper."
- [ ] **CSP is a hard constraint here in a way it wasn't for the Tauri app**:
      `desktop/tauri.conf.json` currently has `"csp": null` (confirmed —
      i.e. the desktop app runs with **no** CSP enforcement at all). MV3
      extensions do not get this freedom — Chrome enforces a strict default
      `content_security_policy` for extension pages (no `unsafe-inline`,
      no remote script sources) that cannot be fully disabled the way
      Tauri's `csp: null` disables it. This actually lines up well with
      `docs/SPEC.md` NFR-1's stated design ("designed to operate under a
      CSP with no `unsafe-inline`/`unsafe-eval`") — but it means the
      extension is the first surface where that design goal is actually
      *enforced by the platform* rather than optional. Treat any inline
      `<style>`/`<script>` usage found anywhere in the reused CSS/JS as a
      blocker to find and fix before it ships, not after a Web Store
      rejection.

---

## 5. Explicitly Android-only or desktop-only — do not port

- [ ] File-association "open with .md files" — no browser-extension
      equivalent; don't try to register the browser as a system file
      handler.
- [ ] Crash-recovery draft buffer / autosave — only relevant with an editor
      that has something worth recovering; skip entirely for reader-mode or
      paste-and-view-only scope.
- [ ] Recent files (MRU) — same; only meaningful with real document
      identity (a file path), which a content-script/popup context mostly
      lacks.
- [ ] Window-wide drag-and-drop (desktop) — a popup/side panel is a much
      smaller, constrained surface; confirm drag-drop is even usable there
      (popups in particular are notoriously easy to accidentally dismiss on
      drag-start in Chrome) before porting the concept as-is.
- [ ] Android's 34-language **lexical** highlighter and its two fixed
      GithubLight/GithubDarkDimmed palettes (`android-to-desktop-checklist.md`
      §8) — an Android-only JVM workaround for lacking a TextMate engine.
      The extension has full Shiki available via the library; using the
      lexical highlighter here would be a pure regression, not parity.
- [ ] Android's "no remote image fetch, ever" stance, if adopted here,
      should be re-derived from the extension's actual permission model
      (§2), not copied because Android does it — the two constraints
      (`INTERNET` permission vs. MV3 `host_permissions`) aren't the same
      shape of restriction.

---

## 6. Security posture — cross-checked against the real source, not restated from memory

Extension store review (Chrome Web Store, Firefox Add-ons) audits this class
of thing explicitly — treat every item below as a hard requirement.

- [ ] Match `docs/SPEC.md` NFR-1 inside whatever MV3 context hosts the
      renderer: sanitized output, zero script execution, allow-listed URL
      schemes, `rel="noopener noreferrer"` on external links, CSP without
      `unsafe-inline`/`unsafe-eval` (see §4 — this one is now
      platform-enforced, not optional, which is a genuine improvement in
      guarantee strength versus the desktop app's current `csp: null`).
- [ ] Reuse `src/pipeline/plugins/url-policy.ts` exactly — confirmed real,
      confirmed to be the actual implementation (not a stub) of the
      allow-listed-scheme approach (`http`, `https`, `mailto`,
      `data:image/{png,jpeg,gif,webp}` only). Do not re-derive this by hand
      for the extension.
- [ ] If a content script touches host-page DOM at all (§0/§2's raw-HTML
      question), get a second, security-focused review specifically asking:
      can the extension be tricked into rendering the *host page's*
      untrusted content as if it were Claymark-authored trusted output?
      This is a materially different threat model from a standalone app
      rendering only its own input, and none of the other three surfaces
      have ever had to answer it — there's no prior-art test suite covering
      this angle to lean on.
- [ ] Don't conflate `public/manifest.json` (the PWA's web-app manifest —
      unrelated JSON schema, unrelated purpose) with the extension's own
      `manifest.json` when searching the repo for prior art or naming a new
      file — same filename, two unrelated formats, easy to grep the wrong
      one by accident.

---

## 7. Process notes — carried over, still binding

- TDD / evidence-over-assertion discipline applies at least as strongly
  here as it did for the desktop app. The concrete lesson from this
  session's six desktop-chrome bugs (`handoff.md`) — none caught by
  `pnpm tsc --noEmit` or `pnpm test`, all found only by loading the real
  app and looking — generalizes directly: an extension adds its own new
  failure classes on top (permission denial at install/runtime, CSP
  rejection, a service worker's non-persistent lifecycle, content-script
  injection timing relative to page load) that don't exist in a normal
  browser tab and that no existing test in this repo currently exercises.
  Load the actual packaged extension in a real browser before any "done"
  claim — an `about:debugging`/`chrome://extensions` unpacked load, not
  just a dev-server preview.
- `progress.md`/`ledger.md`/`spec.md`/`README.md` stay canonical; update
  them as this checklist's items get resolved, then re-run `/notion-sync`
  (the runbook's `SYNC` procedure — this repo is already linked, per
  `handoff.md`, so this is not an `INIT`).
- `.notion_sync_state.json` at the repo root is currently **untracked**
  (per `handoff.md`) — decide whether to commit it or keep it deliberately
  local; not decided as of this rewrite, don't assume either way.
- Don't touch `src/pipeline/`, `src/components/` except where extension work
  explicitly requires a change shared by all consumers — prefer consuming
  the library's public API over reaching into its internals. (`src/app/` —
  the desktop-app-local directory containing `toc.ts` and the Phase-5 chrome
  work — is a different matter: it's app-local by design, not a shared
  layer, so reaching in there or duplicating small pieces of it, per §3, is
  fine and expected.)
