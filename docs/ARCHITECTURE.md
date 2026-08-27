# ARCHITECTURE

**How claymark is put together, and why.**

---

## 1. Design principles

1. **The trust boundary is a single, unavoidable stage.** Untrusted input crosses into safety at exactly one place. There is no second path.
2. **Trees, not strings.** Sanitization and transformation operate on the hast tree. HTML is never serialized and re-parsed, which eliminates `dangerouslySetInnerHTML` entirely.
3. **Fail closed, fail local.** A malformed subsystem input degrades to source text within its own block. It never propagates.
4. **Weight is lazy.** Shiki, KaTeX, and Mermaid are each several hundred kilobytes. None is in the initial chunk.
5. **Presentation is data.** Every visual value is a token. No component contains a literal color or size.

---

## 2. Data flow

```
                    UNTRUSTED
                        │
   ┌────────────────────▼────────────────────┐
   │  INGESTION                              │
   │  static string  │  streamed chunks      │
   └────────┬─────────────────┬──────────────┘
            │                 │
            │        ┌────────▼──────────┐
            │        │ STREAM BUFFER     │
            │        │ segment · detect  │
            │        │ partial · reconcile│
            │        └────────┬──────────┘
            │                 │
   ┌────────▼─────────────────▼──────────────┐
   │  FAST PATH CHECK                        │
   │  no markdown syntax? → single paragraph │
   └────────┬────────────────────────────────┘
            │ (miss)
   ┌────────▼────────────────────────────────┐
   │  CACHE LOOKUP — LRU 100, hash-keyed     │
   └────────┬────────────────────────────────┘
            │ (miss)
   ┌────────▼────────────────────────────────┐
   │  PARSE      remark-parse → mdast        │
   │  EXTEND     remark-gfm · remark-math    │
   │  TRANSFORM  remark-rehype → hast        │
   │             allowDangerousHtml: FALSE   │
   └────────┬────────────────────────────────┘
            │
   ┌────────▼────────────────────────────────┐
   │  ENRICH                                 │
   │  rehype-katex · rehype-pretty-code      │
   │  url-policy · link-hardening            │
   └────────┬────────────────────────────────┘
            │
   ╔════════▼════════════════════════════════╗
   ║  ███  SANITIZE — TRUST BOUNDARY  ███     ║
   ║  rehype-sanitize, strict allow-list      ║
   ║  NO BYPASS · NO FLAG · NO EXCEPTION      ║
   ╚════════┬════════════════════════════════╝
            │                     TRUSTED
   ┌────────▼────────────────────────────────┐
   │  MATERIALIZE                            │
   │  hast-util-to-jsx-runtime + component map│
   └────────┬────────────────────────────────┘
            │
   ┌────────▼────────────────────────────────┐
   │  REACT TREE → styled components → DOM   │
   └─────────────────────────────────────────┘
```

Nothing bypasses the sanitize stage. This is verified statically at Gate G2 criterion 8.

---

## 3. Module map

| Module | Path | Responsibility | Depends on |
|---|---|---|---|
| Pipeline | `src/pipeline/` | Parse, transform, sanitize, materialize | theme (for code themes) |
| Streaming | `src/pipeline/streaming/` | Segment, detect partials, reconcile tails | pipeline |
| Cache | `src/pipeline/cache.ts` | LRU with byte ceiling | — |
| Components | `src/components/` | Node → React mapping and presentation | theme |
| Theme | `src/theme/` | Tokens, CSS vars, provider, motion | — |
| Hooks | `src/hooks/` | `useStreamingMarkdown` | pipeline |

> **As-built note (T-P9-06):** there is no `useMarkdown` hook — only `useStreamingMarkdown` lives under `src/hooks/`. `useTheme` is exported from `src/theme/ThemeProvider.tsx`, not `src/hooks/`. `src/pipeline/cache.ts` exists but is not re-exported from `src/pipeline/index.ts` — it is an internal module, not part of the public surface documented in `API.md`.

**Dependency rule.** `theme` depends on nothing. `pipeline` may not import from `components`. `components` may not import from `pipeline` internals — only from its public types. Cycles are a build failure.

---

## 4. Streaming design

The problem: naive re-parsing on every token is O(n²) and produces flicker as incomplete constructs resolve.

The solution is three-part:

**Segmentation.** The buffer is split at block boundaries — blank lines outside fences. A segment is never split inside a fenced code block, since that would change its meaning.

**Partial detection.** Before the final segment is parsed, it is classified: is there an unclosed fence, an incomplete table row, an unterminated emphasis run, a half-written link? Each class has a defined partial rendering that will not need to be visually retracted when the construct completes.

**Stable-prefix reconciliation.** All segments but the last are structurally stable — appending text cannot change them. Their parsed output is retained by identity and memoized. Only the final segment is reparsed on append. This makes per-token cost O(size of last block), not O(document).

Monotonicity (FR-3.3) follows: because stable segments are never reparsed, already-rendered content cannot change.

---

## 5. Caching

Two-layer.

**Document cache** — LRU, 100 entries, keyed by a hash of content plus options. Bounded additionally by a total byte ceiling, since 100 large documents would otherwise exceed the memory budget. Hits return the identical React element reference, so React bails out of reconciliation entirely.

**Subtree memoization** — within a document, block-level components are memoized on node identity. During streaming this is what prevents a 500-block document from re-rendering when block 501 gains a character.

---

## 6. Lazy loading boundaries

| Subsystem | Approximate weight | Trigger | Fallback while loading |
|---|---|---|---|
| Shiki highlighter | ~250 KB gz | First code fence encountered | Unstyled `pre` at final height |
| KaTeX | ~120 KB gz | First math node encountered | Raw TeX source, monospaced |
| Mermaid | ~400 KB gz | First mermaid fence encountered | Code block at reserved height |

Every fallback reserves the final layout height so that hydration causes zero cumulative layout shift (NFR-2, CLS = 0).

---

## 7. Error isolation

Three tiers:

**Parse tier** — malformed Markdown is not an error condition. CommonMark defines a rendering for essentially every byte sequence. The parser cannot fail.

**Enrichment tier** — KaTeX runs with `throwOnError: false`; Shiki falls back to plain text on unknown grammars; Mermaid failures are caught. Each degrades within its own node.

**Component tier** — every block-level component is wrapped in an error boundary that renders the block's source text on failure. A single pathological block cannot blank the document.

---

## 8. Key decisions

| ID | Decision | Alternative rejected | Reason |
|---|---|---|---|
| DEC-001 | unified/remark/rehype | `marked`, `markdown-it` | AST access is required for streaming reconciliation and schema sanitization. Speed cost is budgeted. |
| DEC-002 | Unconditional sanitization | Opt-out flag for "trusted" input | An escape hatch becomes the default path downstream. |
| DEC-003 | Open-licensed font substitutes | Bundling proprietary originals | R-LEGAL-01. |
| DEC-005 | Raw HTML disabled entirely | `rehype-raw` with sanitization | Removes the largest attack surface class at negligible feature cost. |
| — | Tree-level sanitization | DOMPurify on serialized HTML | Avoids the string round-trip and the `dangerouslySetInnerHTML` it forces. |
| — | Client-side lazy Mermaid | `remark-mermaidjs` + Playwright | A headless browser at runtime is untenable in a client bundle. |
| — | Tauri for desktop | Electron | ~2 MB vs ~120 MB, and the web codebase is reused unchanged. |

---

## 9. Extension points

Available in v1.0:

- **Component map override** — replace any node's component while retaining the pipeline.
- **Token override** — partial theme object, deep-merged over defaults.
- **Font override** — runtime paths to user-licensed fonts.

Deliberately **not** available in v1.0: custom remark/rehype plugins from callers. A caller-supplied plugin could execute before sanitization and reopen the trust boundary. Pending resolution of `Q-03`, any such API would have to run strictly *after* sanitize, which severely limits what it could do — the tradeoff is unresolved and the feature is therefore deferred rather than shipped half-considered.
