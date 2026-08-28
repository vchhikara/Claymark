# Project index / lightweight knowledge graph

Auto-generated map of every `src/**/*.ts(x)` file's imports and exports, as of
commit `078474a` on branch `ui-wip`. Purpose: let a new session answer "what
calls what" / "where does X live" by grepping this file instead of reading the
whole tree. Regenerate after structural changes — this is a snapshot, not
live-tracked.

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

## Known gap on `ui-wip` (see `docs/SYNC-HANDOFF.md`)

`src/components/map.tsx` on this branch imports only `Blockquote, Heading,
Image, Inline, InlineCode, Link, List, Paragraph, Rule, Table, TaskList` — it
does **not** import `CodeBlock` or `MermaidDiagram`, even though both exist in
`src/components/`. That's the confirmed root cause of mermaid fences (and the
code-block copy button) not rendering when tested on this branch: the wiring
for both landed in two PRs merged to `origin/master` (`4dbc049`, `4ca408b`)
after `ui-wip` branched off. Do not "fix" `map.tsx` in isolation — rebase onto
`origin/master` per `docs/SYNC-HANDOFF.md` instead, since the upstream version
already has the correct merged shape.

## Directory graph (nodes = files, edges = relative imports)

### `src/app/`
```
main.tsx → components/{Alert, Button, MarkdownRoot, ThemeToggle}, hooks/useStreamingMarkdown, theme/ThemeProvider
```

### `src/components/` — one file per Markdown element + app-shell UI primitives
```
index.ts   → hooks/useStreamingMarkdown, ./MarkdownRoot, ./ThemeToggle, ./map
map.tsx    → ./{Blockquote, Heading, Image, Inline, InlineCode, Link, List, Paragraph, Rule, Table, TaskList}
             (missing CodeBlock/MermaidDiagram — see gap above)
CopyButton.tsx      → ./Button, ./Tooltip
ThemeToggle.tsx     → theme/ThemeProvider, ./Button, ./Tooltip
MermaidDiagram.tsx  → ./Alert, ./Skeleton
Blockquote.tsx, CodeBlock.tsx, Heading.tsx, Image.tsx, Inline.tsx,
InlineCode.tsx, Lightbox.tsx, Link.tsx, List.tsx, MarkdownRoot.tsx,
Paragraph.tsx, Rule.tsx, Skeleton.tsx, Table.tsx, TaskList.tsx,
Alert.tsx, Button.tsx, Tooltip.tsx  → no internal imports (leaf components)
```
Component exports at a glance:
- `Heading.tsx` → `Heading, HeadingLevel, HeadingProps, slugify`
- `List.tsx` → `List, ListItem, ListItemProps, ListProps`
- `Table.tsx` → `TableContainer, TableContainerProps`
- `Alert.tsx` → `Alert, AlertDescription, AlertProps, AlertTitle, AlertVariant`
- `Button.tsx` → `Button, ButtonProps, ButtonSize, ButtonVariant`
- `Tooltip.tsx` → `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger`
- `Skeleton.tsx` → `Skeleton`
- `CopyButton.tsx` → `CopyButton, CopyButtonProps`
- `MermaidDiagram.tsx` → `MermaidDiagram, MermaidDiagramProps`
- `map.tsx` → `DEFAULT_COMPONENTS` (object; per-tag adapters not individually exported)

### `src/hooks/`
```
useStreamingMarkdown.ts → components/map, pipeline/plugins/code-lazy,
                           pipeline/streaming/reconcile, pipeline/to-react
exports: UseStreamingMarkdownResult, useStreamingMarkdown
```

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
prettify-code.ts → no internal imports   exports prettifyCode  (new in ui-wip;
                   comment references "Mermaid (T-P5-05)" — check for overlap
                   with the merged Mermaid PR's own code.ts changes on rebase)
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
— global/base styles built from the token files above. See `docs/UI-HANDOFF.md`
for the token-usage convention (never hardcode colors, always `hsl(var(--token))`).

### `src/types/`
```
dompurify.d.ts — ambient type declaration, no runtime code
```

## Untracked / exploratory (not part of the graph above)

- `scratch/shadcn-prototype/` — ported shadcn/ui components (`ported-*.tsx`),
  a `demo.tsx`, and `FINDINGS.md` documenting the exploration's conclusions.
  Not imported by anything in `src/`. See `docs/SYNC-HANDOFF.md` for what to
  do with it.

## Related docs

- `docs/UI-HANDOFF.md` — component/token/style conventions, how to run dev,
  verification commands.
- `docs/SYNC-HANDOFF.md` — current branch-reconciliation situation (`ui-wip`
  vs. the two merged PRs on `origin/master`) and the exact steps to fix it.
