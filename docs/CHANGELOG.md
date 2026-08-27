# CHANGELOG

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

Nothing yet. Implementation begins at task `T-P0-01`.

---

## [1.0.0] — planned

First release. Target state at Gate G9.

> **As-built note (T-P9-06):** this "Added" list was written early in planning as a target, not a record of what shipped. Reconciled against `src/` as of T-P9-05: the **LRU document cache with entry and byte ceilings** (`src/pipeline/cache.ts`) exists but is not exported from the public surface (no `configureCache`/`clearCache`) and is unused by the rest of the pipeline. **Image lightbox** (`src/components/Lightbox.tsx`) exists but is not wired into image rendering — clicking an image does not open it. **Runtime font overrides** and **partial token overrides, deep-merged** describe a `<ThemeProvider tokens/fonts>` API that does not exist — `ThemeProvider` takes only `children`. T-P9-07 is the roadmap-designated task to finalize the actual 1.0.0 release notes; this note flags the gap so that task starts from an accurate baseline rather than this aspirational list.

### Added

**Markdown**
- CommonMark 0.31.2 support at ≥ 98% suite conformance
- GFM: tables, strikethrough, task lists, autolinks
- Inline and display mathematics via KaTeX
- Mermaid diagrams: flowchart, sequence, class, state, ER, Gantt, pie
- Syntax highlighting across a 34-language registry, dual-themed

**Rendering**
- React element tree output with a fully overridable component map
- Streaming renderer with partial-construct handling and monotonic output
- Stable-prefix reconciliation — only the mutated tail reparses
- LRU document cache with entry and byte ceilings
- Fast path bypassing the parser for syntax-free strings

**Interface**
- Copy-to-clipboard on every code block, with an insecure-context fallback
- Image lightbox with focus trap and focus restoration
- Horizontally scrollable tables with edge indicators
- Light and dark themes following `prefers-color-scheme`, manually overridable and persisted
- Flash-of-incorrect-color eliminated via a blocking init script

**Theming**
- Three-layer token system: system, primitive, semantic
- Partial token overrides, deep-merged
- Runtime font overrides for user-licensed typefaces
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
