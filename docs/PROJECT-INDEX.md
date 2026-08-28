# Project index / lightweight knowledge graph

Auto-generated map of every `src/**/*.ts(x)` file's imports and exports, as of
commit `5c53924` on branch `ui-wip` (the post-rebase state — `ui-wip` rebased
onto `origin/master` tip `c61f3fa`; see `docs/SYNC-HANDOFF.md` for what that
rebase did). Purpose: let a new session answer "what calls what" / "where
does X live" by grepping this file instead of reading the whole tree.
Regenerate after structural changes — this is a snapshot, not live-tracked.

Regenerate with:
```bash
for f in $(find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort); do
  imports=$(grep -oP "(?<=from ')\.[^']+" "$f" | sort -u | tr '\n' ',' | sed 's/,$//')
  exports=$(grep -oP "^export (function|const|class|interface|type|default) \K[A-Za-z_]+" "$f" | sort -u | tr '\n' ',' | sed 's/,$//')
  echo "### $f"; echo "- imports: ${imports:-none}"; echo "- exports: ${exports:-none}"; echo
done
```
Caveat: the export regex only catches `export function|const|class|interface|type|default NAME` —
it misses re-exports (`export { X }`), default-object exports (`export const
DEFAULT_COMPONENTS = {...}` catches fine, but arrow-function map values inside
an object literal, like `map.tsx`'s per-tag adapters, do NOT show as separate
exports — read the file directly for those).

## Entry points

- `src/index.ts` — public package entry, re-exports `./components`,
  `./pipeline`, `./theme`.
- `src/app/main.tsx` — the demo/PWA app shell (not part of the published
  package). Imports `Alert`, `Button`, `MarkdownRoot`, `ThemeToggle`,
  `useStreamingMarkdown`, `ThemeProvider`.
- `src/sw.ts` — service worker, standalone, no internal imports.

## Resolved: `map.tsx` now has the full merged shape

Earlier snapshots of this file (pre-rebase, on the old `ui-wip` tip `078474a`)
noted a gap: `map.tsx` didn't import `CodeBlock` or `MermaidDiagram`, so
mermaid fences and the code-block copy button didn't render on that branch.
**That gap is fixed** — the rebase onto `origin/master` (see
`docs/SYNC-HANDOFF.md`) merged in both features. Confirmed by this
regeneration: `map.tsx` now imports `./CodeBlock` and `./MermaidDiagram`
(see the directory graph below). `PreAdapter` inside `map.tsx` does the
mermaid short-circuit first, then falls through to a `CodeBlock`-wrapped
`pre` for ordinary fences, preserving `data-code-pending`/`min-height`
passthrough for the code-skeleton hydration flow.

**Still open** (not a code gap, a verification gap): a mermaid fence
rendering as an actual diagram in the browser has not yet been visually
confirmed this session — see `docs/SYNC-HANDOFF.md` "What's still open" #1.

## Directory graph (nodes = files, edges = relative imports)

### `src/app/`
```
main.tsx → components/{Alert, Button, MarkdownRoot, ThemeToggle}, hooks/useStreamingMarkdown, theme/ThemeProvider
```

### `src/components/` — one file per Markdown element + app-shell UI primitives
```
index.ts   → hooks/useStreamingMarkdown, ./MarkdownRoot, ./ThemeToggle, ./map
map.tsx    → ./{Blockquote, CodeBlock, Heading, Image, Inline, InlineCode,
              Link, List, MermaidDiagram, Paragraph, Rule, Table, TaskList}
              (full merged shape — mermaid + code-block copy button both wired)
CodeBlock.tsx       → ./CopyButton
CopyButton.tsx      → ./Button, ./Tooltip
ThemeToggle.tsx     → theme/ThemeProvider, ./Button, ./Tooltip
MermaidDiagram.tsx  → ./Alert, ./Skeleton
Blockquote.tsx, Heading.tsx, Image.tsx, Inline.tsx, InlineCode.tsx,
Lightbox.tsx, Link.tsx, List.tsx, MarkdownRoot.tsx, Paragraph.tsx, Rule.tsx,
Skeleton.tsx, Table.tsx, TaskList.tsx, Alert.tsx, Button.tsx, Tooltip.tsx
  → no internal imports (leaf components)
```
Component exports at a glance:
- `Heading.tsx` → `Heading, HeadingLevel, HeadingProps, slugify`
- `List.tsx` → `List, ListItem, ListItemProps, ListProps`
- `Table.tsx` → `TableContainer, TableContainerProps`
- `Alert.tsx` → `Alert, AlertDescription, AlertProps, AlertTitle, AlertVariant`
- `Button.tsx` → `Button, ButtonProps, ButtonSize, ButtonVariant`
- `Tooltip.tsx` → `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger`
- `Skeleton.tsx` → `Skeleton`
- `CodeBlock.tsx` → `CodeBlock, CodeBlockProps`
- `CopyButton.tsx` → `CopyButton, CopyButtonProps` (Button/Tooltip-based,
  post-rebase version — see `docs/SYNC-HANDOFF.md` conflict-resolution notes)
- `MermaidDiagram.tsx` → `MermaidDiagram, MermaidDiagramProps`
- `map.tsx` → `DEFAULT_COMPONENTS` (object; per-tag adapters not individually
  exported — `PreAdapter`, `CodeAdapter`, `ParagraphAdapter`, etc. all live
  inside this file, read it directly)

### `src/hooks/`
```
useStreamingMarkdown.ts → components/map, pipeline/plugins/code-lazy,
                           pipeline/streaming/reconcile, pipeline/to-react
exports: UseStreamingMarkdownResult, useStreamingMarkdown
```
Post-rebase: uses the typed `DEFAULT_COMPONENTS as unknown as Components`
cast (correct hast-util-to-jsx-runtime typing) *and* the background
`hydrateCodeHighlighting`/`hasPendingCode` hydration logic (swaps
code-skeleton placeholders for real Shiki output after paint). Both pieces
now coexist — see `docs/SYNC-HANDOFF.md` for how the merge conflict here was
resolved.

### `src/pipeline/` — parse/sanitize/highlight/streaming core (out of scope for UI work per `docs/UI-HANDOFF.md`)
```
index.ts      → ./fast-path, plugins/url-policy, ./processor,
                streaming/{detect, reconcile, segment}, ./to-react, ./types
processor.ts  → plugins/{code-lazy, gfm, links, sanitize, url-policy}
                exports: processor
streaming/reconcile.ts → ../processor, ./segment
                exports: ReconcileResult, ReconcileState, ReconciledBlock
streaming/segment.ts   → no internal imports; exports Segment, segmentBuffer
streaming/detect.ts    → no internal imports; exports PartialConstructKind,
                         PartialConstructResult, detectPartialConstruct
to-react.tsx  → no internal imports; exports SubtreeCache, ToReactOptions, toReact
fast-path.ts  → no internal imports; exports fastPathRender, isFastPathEligible
cache.ts      → no internal imports; no named exports found (check file directly)
sanitize-schema.ts → no internal imports; exports sanitizeSchema
types.ts      → no internal imports; exports PipelineOptions, PipelineResult, RenderMode
```

### `src/pipeline/plugins/`
```
code.ts        → ./shiki-config          exports codeHighlight
code-lazy.ts   → no internal imports     exports codeSkeleton
prettify-code.ts → no internal imports   exports prettifyCode  (added in the
                   original ui-wip work; comment references "Mermaid
                   (T-P5-05)" — no functional overlap found with
                   origin/master's own code.ts changes after the rebase, but
                   worth a second look if code.ts changes again)
sanitize.ts    → ../sanitize-schema      exports sanitizePreset
shiki-config.ts→ no internal imports     exports DEFAULT_THEMES,
                   SUPPORTED_LANGUAGES, ShikiHighlighter, SupportedLanguage,
                   getShikiHighlighter
gfm.ts, links.ts, math.ts, url-policy.ts → no internal imports (standalone plugins)
```

### `src/theme/`
```
index.ts        → ./ThemeProvider, ./fonts, ./tokens/{accent, dark, layout, neutral, semantic, typography}
ThemeProvider.tsx → no internal imports; exports Theme, ThemeContextValue,
                     ThemeProvider, ThemeProviderProps, useTheme
tokens/dark.ts       → ./semantic          exports SEMANTIC_DARK
tokens/typography.ts → ../fonts            exports HeadingLevel, HeadingStep, headings, typography
tokens/{accent,layout,neutral,semantic}.ts, fonts.ts → no internal imports
```
Styling entry point (not a `.ts` module, but load-bearing): `src/theme/claymark.css`
— global/base styles built from the token files above, plus the merged
codeblock/copy-button/shiki-theming/code-figure rules from the rebase (all
additive, no rule-level conflicts — see `docs/SYNC-HANDOFF.md`). See
`docs/UI-HANDOFF.md` for the token-usage convention (never hardcode colors,
always `hsl(var(--token))`).

### `src/types/`
```
dompurify.d.ts — ambient type declaration, no runtime code
```

## Untracked / exploratory (not part of the graph above)

- `scratch/shadcn-prototype/` — ported shadcn/ui components (`ported-*.tsx`),
  a `demo.tsx`, and `FINDINGS.md` documenting the exploration's conclusions.
  Not imported by anything in `src/`. **Decision (this session): keep it**,
  untracked/exploratory, as reference for integrating the still-unported
  components (Dialog, Table, Badge, Separator, ScrollArea, Menubar, Toast)
  later — Alert/Button/Skeleton/Tooltip are already integrated in `src/`. See
  `docs/SYNC-HANDOFF.md` "What's still open" #2.

## Verification status (as of this snapshot)

- `npx tsc --noEmit` — 0 errors.
- `npx eslint .` — 7 errors, all pre-existing/known (eslint-plugin
  registration gaps, not real violations — see `docs/SYNC-HANDOFF.md` for
  the full list and how each was confirmed pre-existing).
- Manual browser verification — partially done (app loads, renders theming/
  code blocks/tables correctly); mermaid-fence rendering not yet visually
  confirmed. See `docs/SYNC-HANDOFF.md` "What's still open" #1.

## Related docs

- `docs/UI-HANDOFF.md` — component/token/style conventions, how to run dev,
  verification commands.
- `docs/SYNC-HANDOFF.md` — current state: rebase done, what's still open
  (finish browser verification, decide on scratch/shadcn-prototype, ask
  before pushing), dev-server gotchas.
- `docs/HANDOFF.md` — the original v1.0.0 delivery handoff from an earlier
  project phase (pre-dates this UI branch work; kept for historical/release
  context, not about the current branch situation).
