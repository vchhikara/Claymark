# CHANGELOG

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

Nothing yet. Implementation begins at task `T-P0-01`.

---

## [1.0.0] — 2026-08-28

First release. Gate G9 pending explicit human acceptance (T-P9-08).

### Added

**Markdown**
- CommonMark 0.31.2 support at ≥ 98% suite conformance
- GFM: tables, strikethrough, task lists, autolinks
- Inline and display mathematics via KaTeX
- Mermaid diagrams: flowchart, sequence, class, state, ER, Gantt, pie
- Syntax highlighting across a 34-language registry, dual-themed

**Rendering**
- React element tree output with a fully overridable component map (`DEFAULT_COMPONENTS`, HTML-tag keys only)
- Streaming renderer (`useStreamingMarkdown`) with partial-construct handling and monotonic output
- Stable-prefix reconciliation — only the mutated tail reparses
- Fast path (`isFastPathEligible`/`fastPathRender`) bypassing the parser for syntax-free strings

**Interface**
- Copy-to-clipboard on every code block, with an insecure-context fallback
- Image captions derived from the Markdown title attribute (see Not included, below)
- Horizontally scrollable tables with edge indicators
- Light and dark themes following `prefers-color-scheme`, manually overridable via `<ThemeToggle>` and persisted
- Flash-of-incorrect-color eliminated via a blocking init script

**Theming**
- Three-layer token system: system, primitive, semantic
- Open-licensed default fonts: Source Serif 4, Inter, JetBrains Mono

**Security**
- Unconditional allow-list sanitization with no bypass
- Raw HTML disabled entirely
- URL scheme policy with a restricted `data:` image allowance
- `rel="noopener noreferrer"` on all external links
- SVG sanitization on diagram output
- Zero runtime network requests
- Operates under a CSP without `unsafe-inline` or `unsafe-eval`

**Accessibility**
- WCAG 2.2 AA conformance, zero axe-core violations
- Full keyboard reachability
- MathML exposure for mathematics, text alternatives for diagrams
- `prefers-reduced-motion` honoured

**Packaging**
- npm library: ESM, CJS, TypeScript declarations
- Installable PWA with offline support
- Tauri desktop binaries for macOS, Windows, Linux

### Not included

Present in earlier planning drafts of this section but not implemented as of this release; not carried into 1.0.0's "Added" list above (see `API.md`, `SPEC.md` FR-5.1/FR-6.2/FR-6.3 for the as-built detail):

- **Image lightbox** — `src/components/Lightbox.tsx` exists but is not wired into `Image.tsx`; clicking an image does not open a modal. Tracked for a follow-up release.
- **LRU document cache** (`src/pipeline/cache.ts`) — implemented but not exported from the public surface (no `configureCache`/`clearCache`) and unused by the rendering pipeline.
- **Runtime token overrides** and **runtime font overrides** — `<ThemeProvider>` takes only `children`; there is no `tokens`/`fonts` prop. Customization currently requires forking the CSS token files (see `THEMING.md`).
- **`options.diagrams: false` toggle** — `PipelineOptions` has no such flag; Mermaid rendering cannot be disabled at runtime (see `SECURITY.md` KL-01).

### Verification at release

- CommonMark suite: ≥ 98%
- XSS corpus: 100%, no exceptions
- Stress matrix S-01…S-12: zero crashes, zero budget breaches
- Historical backtest, 250 documents: zero unexplained diffs
- Dependency audit: zero unresolved high or critical advisories

### Known limitations

See `SECURITY.md §4` — KL-01 through KL-06.

### Deferred

| Item | Reason | Target |
|---|---|---|
| Server-side rendering entry point | Pending decision `Q-02` | 1.1.0 |
| Public plugin API for custom node types | Pending decision `Q-03`; cannot run before sanitization without reopening the trust boundary | 2.0.0 |
| iOS build via Tauri Mobile | Pending decision `Q-01` | 1.1.0 |
| Additional highlighting languages | Bundle size; registry expansion requires a decision record | As requested |

---

## Version policy

- **Patch** — fixes and internal changes with no surface effect
- **Minor** — additive: new options, component map keys, exports
- **Major** — removals, renames, default behavior changes, **or any change to sanitization behavior regardless of code size**
