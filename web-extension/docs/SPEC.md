# SPEC — claymark v1.0.0

**Functional and non-functional specification of the shipped product.**
This document is the contract. Where the roadmap and this specification disagree, **this document wins** and the roadmap is corrected.

---

## 1. Product statement

`claymark` is a Markdown rendering engine for React that renders untrusted and *incomplete* Markdown into a typographically refined, security-hardened document surface. It is designed for streamed LLM output: text arriving token-by-token, containing code, mathematics, diagrams, and tables, which must render progressively without flicker and without ever executing what it renders.

It is a **renderer**, not an editor and not a chat client.

---

## 2. Users and use cases

| User | Use case | Primary surface |
|---|---|---|
| Application developer | Embed a rendering surface in an existing React app | Library (`npm`) |
| End user | Read and interact with rendered documents | PWA / desktop app |
| Designer | Restyle the surface without touching logic | Token layer |
| Security reviewer | Audit the trust boundary | `SECURITY.md` + test suite |

---

## 3. Functional requirements

Requirement IDs are stable and referenced by tests.

### FR-1 Markdown support
- **FR-1.1** CommonMark 0.31.2 at ≥ 98% suite conformance.
- **FR-1.2** GFM: tables, strikethrough, task lists, autolinks.
- **FR-1.3** Fenced code blocks with language identifiers and highlight metadata.
- **FR-1.4** Inline math (`$…$`) and display math (`$$…$$`).
- **FR-1.5** Mermaid diagrams via ` ```mermaid ` fences.
- **FR-1.6** Raw HTML in the input is **inert** — neither rendered nor executed. Escaped and displayed as text.

### FR-2 Rendering
- **FR-2.1** Output is a React element tree. No `dangerouslySetInnerHTML` on any path.
- **FR-2.2** Every Markdown node type maps to an overridable component.
- **FR-2.3** Unknown or malformed constructs degrade to visible source text. Nothing throws to the caller.
- **FR-2.4** Rendering is pure and referentially transparent: identical input yields an identical tree.

### FR-3 Streaming
- **FR-3.1** Accepts incremental input and re-renders on each append.
- **FR-3.2** Incomplete constructs (open fence, partial table, unclosed emphasis or link) render as sensible partial output, never as garbage and never as a thrown error.
- **FR-3.3** Rendering is **monotonic** — content that has appeared does not disappear or reorder as more input arrives.
- **FR-3.4** Only the mutated tail is reparsed. Stable prefix blocks are not re-rendered.

### FR-4 Code presentation
- **FR-4.1** Syntax highlighting across the 34-language registry, with light and dark themes.
- **FR-4.2** Unregistered languages render as unstyled preformatted text.
- **FR-4.3** Copy-to-clipboard yields byte-identical source, excluding decorations such as line numbers.
- **FR-4.4** Optional line numbers and line highlighting via fence metadata.
- **FR-4.5** Horizontal overflow scrolls within the block; the page never gains horizontal scroll.

### FR-5 Interaction
- **FR-5.1** Images open in a modal lightbox; captions derive from the Markdown title attribute. **As-built (T-P9-06): the caption half shipped (`Image.tsx` renders a `<figcaption>` from the title); the lightbox half did not — `Lightbox.tsx` exists but is not wired into image rendering, so images do not currently open in a modal.**
- **FR-5.2** Tables scroll horizontally within a container with edge indicators.
- **FR-5.3** Theme follows `prefers-color-scheme` by default and is manually overridable with persistence.
- **FR-5.4** Every interaction is reachable by keyboard alone.

### FR-6 Theming
- **FR-6.1** All visual values resolve to CSS custom properties.
- **FR-6.2** A caller may supply a partial token override; unspecified tokens fall back to defaults. **As-built (T-P9-07): not implemented — `<ThemeProvider>` takes only `children`; no `tokens` prop exists. Customization currently requires forking the CSS token files (`THEMING.md`).**
- **FR-6.3** Fonts are overridable at runtime by the end user. **As-built (T-P9-07): not implemented — no `fonts` prop on `<ThemeProvider>`.**
- **FR-6.4** No inline styles originate from document content.

---

## 4. Non-functional requirements

### NFR-1 Security — the defining constraint
- **NFR-1.1** All output is sanitized against a strict allow-list. **There is no bypass.**
- **NFR-1.2** Zero script execution from document content under any input.
- **NFR-1.3** URL schemes limited to `http`, `https`, `mailto`, and `data:` for a fixed image type set.
- **NFR-1.4** External links carry `rel="noopener noreferrer"`.
- **NFR-1.5** Operates under a CSP without `unsafe-inline` or `unsafe-eval`.
- **NFR-1.6** **Zero runtime network requests.** All assets are bundled.

### NFR-2 Performance budgets

Measured on a mid-tier 2020 laptop, Chromium, cold cache.

| Metric | Budget |
|---|---|
| First render, 2 KB document | < 16 ms |
| First render, 100 KB document | < 250 ms |
| Streaming append, per token | < 4 ms |
| Highlighter lazy chunk | < 300 KB gzipped |
| Initial bundle, core only | < 120 KB gzipped |
| Cache hit | < 1 ms |
| Memory, 10k-render soak | < 150 MB steady state |
| Cumulative layout shift | 0 |

### NFR-3 Accessibility
WCAG 2.2 AA. Zero axe-core violations. Body contrast ≥ 4.5:1 and large text ≥ 3:1 in both themes. Text alternatives for math and diagrams. `prefers-reduced-motion` honoured.

### NFR-4 Compatibility
Chromium 120+, Firefox 121+, Safari 17+. React 18.3+ as a peer dependency. ESM and CJS builds with TypeScript declarations.

### NFR-5 Reliability
No input crashes the renderer. Malformed math, invalid diagrams, pathological nesting, and truncated streams all degrade gracefully. Error boundaries isolate subsystem failures to the affected block.

---

## 5. Deliverables

| Artifact | Form | Consumer |
|---|---|---|
| `claymark` | npm package: ESM + CJS + `.d.ts` | Developers |
| `claymark-app` | Installable PWA | End users, mobile |
| `claymark-desktop` | Tauri binary: macOS, Windows, Linux | Desktop users |
| Documentation | `docs/` | All |

---

## 6. Explicit non-goals

> **FLAGGED FOR REVIEW (2026-09-18):** the user explicitly authorized the Tauri desktop app
> (`src/app/`) to become a real document-editing application, overriding the "Markdown editing"
> and "persistence beyond a theme preference" lines below for that app specifically. The
> `claymark` library/engine itself is unchanged. Flagged, not rewritten — pending sign-off.

Stated so they are never quietly added:

- Markdown **editing**, WYSIWYG, or live preview authoring
- Any network client, chat backend, or model integration
- Authentication, accounts, or persistence beyond a theme preference
- MDX or JSX execution — arbitrary component execution from documents is a non-goal permanently
- Raw HTML passthrough
- Redistribution of proprietary fonts
- A native React Native implementation
- Server-side rendering (pending `Q-02`)
- Plugin API for third-party node types (pending `Q-03`)

---

## 7. Acceptance criteria

The product is accepted when, and only when:

1. Every FR has at least one passing test referencing its ID.
2. Every NFR budget is met and recorded in `bench/results/`.
3. Gates G0–G9 all record PASS with evidence.
4. The 250-document backtest corpus replays with zero unexplained diffs.
5. The stress matrix S-01…S-12 completes with zero crashes and zero budget breaches.
6. All four artifacts build, install, and launch on a clean machine.
7. Every documented example in `docs/` executes as written.
8. A human explicitly accepts delivery.
