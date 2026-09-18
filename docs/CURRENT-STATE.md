# CURRENT STATE — what claymark does, as of v1.0.0

This is a plain-language snapshot of the product as actually built, for anyone who wants
the facts without reading `SPEC.md` end to end. Where this document and `SPEC.md`/`CHANGELOG.md`
disagree, those two win — this is a summary, not the contract.

---

## 1. What it is

`claymark` is a Markdown rendering engine for React. It is built specifically to render
**streamed, untrusted output from an LLM** — text arriving token by token, potentially
containing code, math, diagrams, and tables — safely and without visual flicker.

It is a **renderer**. It does not edit Markdown, does not talk to any model or API, and
does not manage chat state.

## 2. What it can render today

- **Markdown core**: CommonMark (≥98% spec conformance) plus GFM tables, strikethrough,
  task lists, and autolinks.
- **Code blocks**: syntax highlighting across 34 languages, light/dark themed, with
  copy-to-clipboard on every block. Unregistered languages fall back to plain preformatted
  text rather than erroring.
- **Math**: inline (`$…$`) and display (`$$…$$`) math via KaTeX.
- **Diagrams**: Mermaid diagrams (flowchart, sequence, class, state, ER, Gantt, pie) via
  ` ```mermaid ` fences. Invalid Mermaid syntax fails closed to a visible code block, never
  a crash.
- **Streaming**: content can arrive incrementally (token-by-token) and the renderer updates
  progressively. Already-rendered content never disappears or reorders as more text arrives
  (monotonic rendering), and only the changed tail of the document is reparsed — stable
  earlier content isn't touched.
- **Tables**: horizontally scrollable with edge indicators; the page itself never gains
  horizontal scroll.
- **Theming**: light/dark themes follow the OS (`prefers-color-scheme`) by default, and are
  manually overridable via a `<ThemeToggle>` component with the choice persisted. No flash
  of the wrong theme on load.

## 3. Security posture — the core design constraint

This is the part the whole project is organized around:

- Every output path is sanitized against a strict allow-list. **There is no bypass.**
- Raw HTML in the input is never rendered or executed — it is displayed as inert, escaped text.
- No `dangerouslySetInnerHTML` anywhere in the rendering path.
- URL schemes are restricted to `http`, `https`, `mailto`, and a narrow `data:` image allowance.
- External links carry `rel="noopener noreferrer"` automatically.
- Zero runtime network requests — everything needed to render is bundled.
- Designed to operate under a Content-Security-Policy with no `unsafe-inline`/`unsafe-eval`.

## 4. Accessibility

Targets WCAG 2.2 AA with zero axe-core violations: full keyboard reachability, text
alternatives for math and diagrams, and `prefers-reduced-motion` honoured.

## 5. What ships, in what form

| Artifact | What it is | Where |
|---|---|---|
| `claymark` (npm) | The library — ESM + CJS + TypeScript types | `dist/` |
| PWA | An installable web app version, works offline once cached | `dist/app/` |
| Desktop app | Tauri-packaged native binary — Linux `.deb`/`.rpm`/AppImage built and confirmed this cycle; macOS/Windows build the same way but weren't cross-built in this Linux session | `src-tauri/target/release/bundle/` |

## 6. What is explicitly NOT in this release

These were in earlier planning drafts but did not ship. Each is a disclosed gap, not a
silent omission:

- **Image lightbox** — clicking an image does not open an enlarged modal view. Captions
  (from the Markdown title text) do render under images; the modal itself doesn't exist yet.
- **Exported cache controls** — an internal LRU document cache exists in the code but there
  is no public API to configure or clear it.
- **Runtime theme/font overrides** — you cannot pass custom color tokens or fonts as a prop
  at runtime. Customizing the look currently means forking the CSS token files (see
  `THEMING.md`).
- **A toggle to disable diagram rendering** — Mermaid rendering can't be turned off via an
  options flag.

None of these are bugs — they're scoped-out-for-now, tracked as deferred work with an owner
(see `plan/04-STATE-LEDGER.md`'s deferred-work register) so they aren't lost.

## 7. Non-goals (permanent, not just "not yet")

> **FLAGGED FOR REVIEW (2026-09-18):** the user explicitly authorized the Tauri desktop app
> (`src/app/`) to become a real document-editing application built on top of the `claymark`
> library, overriding the "not a Markdown editor" and "no persistence beyond theme" lines below
> for that app specifically. The `claymark` **library** itself (the npm package / rendering
> engine) is unchanged — it still only renders. This note flags the wording below as stale for
> the desktop app; it has not been rewritten pending the user's sign-off on the exact language.

- It is not a Markdown editor or WYSIWYG authoring tool.
- It does not include a chat client, model integration, or network calls of its own.
- It does not execute MDX/JSX or any embedded component from a document — that's a hard
  security boundary, not a missing feature.
- No accounts, auth, or persistence beyond a single theme preference.

## 8. Where to go next

- **Using it as a developer**: `docs/INSTALLATION.md` and `docs/API.md`.
- **Trying it as a human / testing it**: `docs/HUMAN-TESTING-GUIDE.md`.
- **Full contract / acceptance criteria**: `docs/SPEC.md`.
- **The delivery record and open items awaiting review**: `docs/HANDOFF.md`.
