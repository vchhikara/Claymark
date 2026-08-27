# API REFERENCE

Public surface of the `claymark` package, as actually exported by `src/index.ts` (re-exporting `src/pipeline`, `src/components`, `src/theme`). Everything documented here is covered by semantic versioning. Anything not documented here is internal and may change in a patch release.

> **T-P9-06 note:** this file previously documented a planned API (`<Markdown>`, `<StreamingMarkdown>`, `useMarkdown`, `renderToReact`, `configureCache`/`clearCache`, a configurable `PipelineOptions`) that was never implemented — none of those names exist anywhere in `src/`. This revision reconciles the reference against the as-built exports only. See `docs/CHANGELOG.md` for the disposition of the unimplemented surface.

---

## Components

### `<MarkdownRoot>`

The root wrapper a rendered document is mounted into. It does not parse or render Markdown itself — it only supplies the `.claymark-root` container class and a `data-theme` attribute for the CSS token system to key off. Pass it already-converted React children (e.g. the output of `toReact`).

```tsx
import { MarkdownRoot } from 'claymark';

<MarkdownRoot theme="dark">{content}</MarkdownRoot>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | required | Already-rendered content to mount |
| `theme` | `'light' \| 'dark'` | `undefined` | Sets `data-theme` on the root container |

### `<ThemeProvider>`

Supplies `theme`/`setTheme` context. Tracks `prefers-color-scheme` reactively until a manual choice is made via `setTheme`, at which point the choice is persisted to `localStorage` (key `claymark-theme`) and system-preference changes no longer override it.

```tsx
<ThemeProvider>{children}</ThemeProvider>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | required | — |

There is no `defaultTheme`, `tokens`, `fonts`, or `storageKey` prop — the storage key is a fixed internal constant, and there is no runtime token-override or font-override API.

### `<ThemeToggle>`

Prebuilt light/dark toggle button. Takes no props — label text is not customizable and there is no `className` passthrough.

```tsx
<ThemeToggle />
```

---

## Hooks

### `useStreamingMarkdown(source: string): UseStreamingMarkdownResult`

Renders incrementally arriving Markdown with stable-prefix reconciliation: a block's React element reference never changes once its underlying text has stopped growing, and already-emitted blocks never disappear or reorder — only the trailing (still-open) block's element is ever replaced.

```ts
const { elements } = useStreamingMarkdown(buffer);
```

| Field | Type | Description |
|---|---|---|
| `elements` | `ReactElement[]` | One React element per block, in document order |

Pass the **cumulative** buffer, not the incremental chunk — the hook's internal `ReconcileState` determines what changed. There is no `isComplete` parameter: the hook has no separate "final render" mode; the reconciler treats every call the same way regardless of whether more text is still arriving.

### `useTheme()`

```ts
const { theme, setTheme } = useTheme();
```

| Field | Type | Description |
|---|---|---|
| `theme` | `'light' \| 'dark'` | The resolved theme currently applied |
| `setTheme` | `(t: 'light' \| 'dark') => void` | Set and persist a manual choice |

There is no `'system'` value and no separate `resolvedTheme` field — `theme` already reflects the resolved value (system preference until a manual override is made).

---

## Functions

### `processor`

A fixed `unified()` pipeline (`remark-parse` → GFM → `remark-rehype` → URL policy → link hardening → sanitize preset). Not configurable — there is no options argument; toggling GFM, math, diagrams, syntax highlighting, or sanitization is not supported. Raw HTML is converted to an escaped text node, never rendered (DEC-005).

```ts
import { processor } from 'claymark';

const tree = processor.parse(markdownSource);
const hastTree = await processor.run(tree);
```

### `toReact(tree: Root, options?: ToReactOptions): ReactElement`

Converts a hast tree to a React element via `hast-util-to-jsx-runtime`.

| Field | Type | Description |
|---|---|---|
| `components` | `Components` | Component-map overrides (see `DEFAULT_COMPONENTS`) |
| `subtreeCache` | `SubtreeCache` | When provided, top-level children are converted and cached individually by hast node identity, so a re-render after a small edit only re-converts the changed block(s) |

### `SubtreeCache`

A `WeakMap`-backed cache keyed by hast node reference, used with `toReact`'s `subtreeCache` option. `get(node)` / `set(node, element)`.

### `isFastPathEligible(text: string): boolean`

Returns `true` when `text` contains no Markdown/GFM syntax trigger character, no blank-line block break, and no list marker — i.e. when the full parse pipeline can be skipped entirely for a plain single-paragraph string.

### `fastPathRender(text: string): Root`

Wraps `text` directly as a hast `<p>` root, bypassing `processor` entirely. Only valid to call when `isFastPathEligible(text)` is `true`.

### `safeUrl(value: string, allowDataImage: boolean): string | undefined`

The URL trust-boundary check used internally by the pipeline's URL policy (`urlPolicy`). Returns the URL unchanged if safe, `undefined` if it should be dropped. `allowDataImage` permits `data:image/*` URIs (used for `<img src>`) while still rejecting `data:` elsewhere.

### Streaming internals

`detectPartialConstruct(text)`, `segmentBuffer(text)`, and the `ReconcileState` class (`new ReconcileState()`, `.reconcile(source)`) are exported and power `useStreamingMarkdown` above. They are documented here for completeness but are considered advanced/internal-facing — most consumers should use the hook rather than these directly.

There is no `renderToReact(source, options?)` convenience function, no `useMarkdown` hook, and no `configureCache`/`clearCache` functions — the pipeline has no configurable in-memory document cache in the as-built implementation. `SubtreeCache` (above) is a per-call, caller-owned cache, not a shared/configurable global one.

---

## Types

### `PipelineOptions` / `PipelineResult`

```ts
interface PipelineOptions {
  mode?: 'static' | 'streaming'
}
interface PipelineResult {
  tree: Root // hast Root
}
```

`mode` is declared but not read anywhere in the pipeline as-built — `processor` behaves identically regardless of its value. There is no `gfm`, `math`, `diagrams`, `highlight`, `lineNumbers`, `linkTarget`, `fastPath`, or `sanitize` field. GFM, math (KaTeX), diagrams (Mermaid), and syntax highlighting are always active and are not independently toggleable; sanitization is unconditional (NFR-1.1) — this remains accurate to the original doc's intent, it is simply not exposed as an option object because none of the other pipeline stages are either.

### `ComponentMap` (`DEFAULT_COMPONENTS`, `Record<ElementTag, ComponentType>`)

`ElementTag` — the actual as-built key set, all HTML-only (no `codeBlock`/`mermaid`/`math`/`mathDisplay`/`taskListItem`/`lightbox` pseudo-keys; those concerns are handled inside the `code`, `img`, and `p`/`li` component implementations themselves, not as separate map entries):

```
h1 h2 h3 h4 h5 h6 p a ul ol li
blockquote code pre em strong del hr br
img table thead tbody tr th td input
```

```tsx
import { DEFAULT_COMPONENTS } from 'claymark';
import type { ComponentType } from 'react';

const components: Partial<typeof DEFAULT_COMPONENTS> = {
  a: (props) => <a {...props} data-tracked />,
};
```

> Overrides receive **already-sanitized** props, passed after the trust boundary via `passNode: true` (a `node` prop carries the original hast node for structural decisions, e.g. distinguishing a task-list `<li>` from a plain one).

### `RenderError`

Not implemented. There is no subsystem-error-reporting type, no `onError` prop anywhere, and no `error`/`meta` fields returned from any hook — math, diagram, and highlight failures are handled internally by each component (e.g. `MermaidDiagram`'s bounded-timeout fallback to a code block) rather than surfaced through a shared error channel.

---

## Versioning

Semantic Versioning 2.0.0.

- **Patch** — bug fixes, internal changes, dependency updates with no surface change
- **Minor** — additive: new options, new component map keys, new exports
- **Major** — removals, renames, default behavior changes, or a change to the security posture

Sanitization behavior is treated as a **major** surface: any change that could alter what passes the trust boundary is a major release, regardless of how small the code change is.
