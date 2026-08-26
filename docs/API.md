# API REFERENCE

Public surface of the `claymark` package. Everything documented here is covered by semantic versioning. Anything not documented here is internal and may change in a patch release.

---

## Components

### `<Markdown>`

Renders a static Markdown string.

```tsx
import { Markdown } from 'claymark';

<Markdown components={{ h1: MyHeading }} className="prose">
  {markdownSource}
</Markdown>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `string` | required | Markdown source. Treated as untrusted. |
| `components` | `Partial<ComponentMap>` | `{}` | Per-node component overrides, merged over defaults |
| `className` | `string` | `undefined` | Applied to the root container |
| `options` | `PipelineOptions` | see below | Pipeline configuration |
| `onError` | `(e: RenderError) => void` | `undefined` | Called on a subsystem failure. Rendering continues regardless. |

### `<StreamingMarkdown>`

Renders incrementally arriving Markdown. Handles partial constructs and guarantees monotonic output.

```tsx
<StreamingMarkdown source={buffer} isComplete={done} />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `source` | `string` | required | The full buffer received so far, not the latest delta |
| `isComplete` | `boolean` | `false` | When true, partial-construct handling is disabled and a final render occurs |
| `components` | `Partial<ComponentMap>` | `{}` | As above |
| `options` | `PipelineOptions` | defaults | As above |

> Pass the **cumulative** buffer, not the incremental chunk. Reconciliation determines what changed.

### `<ThemeProvider>`

Supplies tokens and theme state. Required ancestor of any renderer.

```tsx
<ThemeProvider defaultTheme="system" tokens={overrides} fonts={fontPaths}>
  {children}
</ThemeProvider>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultTheme` | `'light' \| 'dark' \| 'system'` | `'system'` | Initial theme |
| `tokens` | `PartialTokens` | `{}` | Deep-merged over defaults |
| `fonts` | `FontOverride` | `undefined` | Runtime font paths |
| `storageKey` | `string` | `'claymark-theme'` | Preference storage key |

### `<ThemeToggle>`

Prebuilt, accessible light/dark control.

| Prop | Type | Default |
|---|---|---|
| `className` | `string` | `undefined` |
| `labels` | `{ light: string; dark: string; system: string }` | English defaults |

---

## Hooks

### `useMarkdown(source, options?)`

Renders to a React node without mounting a component. Memoized and cache-backed.

```ts
const { node, meta, error } = useMarkdown(source);
```

Returns:

| Field | Type | Description |
|---|---|---|
| `node` | `ReactNode` | The rendered tree |
| `meta` | `RenderMeta` | Heading list, word count, detected languages, whether math or diagrams are present |
| `error` | `RenderError \| null` | Non-fatal subsystem failure, if any |

### `useStreamingMarkdown(source, isComplete?)`

Same return shape, with streaming reconciliation applied.

### `useTheme()`

```ts
const { theme, resolvedTheme, setTheme } = useTheme();
```

| Field | Type | Description |
|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system'` | The user's selection |
| `resolvedTheme` | `'light' \| 'dark'` | What is actually applied |
| `setTheme` | `(t) => void` | Set and persist |

---

## Functions

### `renderToReact(source, options?): Promise<PipelineResult>`

Imperative render outside React. Same pipeline, same guarantees.

### `configureCache(config): void`

```ts
configureCache({ maxEntries: 200, maxBytes: 50_000_000 });
```

| Field | Type | Default |
|---|---|---|
| `maxEntries` | `number` | `100` |
| `maxBytes` | `number` | `20_000_000` |

### `clearCache(): void`

Empties the document cache. Useful when token overrides change.

---

## Types

### `PipelineOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `gfm` | `boolean` | `true` | Tables, strikethrough, task lists, autolinks |
| `math` | `boolean` | `true` | KaTeX support |
| `diagrams` | `boolean` | `true` | Mermaid support |
| `highlight` | `boolean` | `true` | Syntax highlighting |
| `lineNumbers` | `boolean` | `false` | Line numbers in code blocks |
| `linkTarget` | `'_blank' \| '_self'` | `'_blank'` | External link target |
| `fastPath` | `boolean` | `true` | Bypass the parser for syntax-free strings |

> There is no `sanitize` option. Sanitization is unconditional (NFR-1.1). This is not an oversight and will not be added.

### `ComponentMap`

Keys are HTML element names produced by the pipeline. Each value receives standard props for that element plus a `node` prop carrying the source hast node.

```
a · blockquote · code · em · h1 · h2 · h3 · h4 · h5 · h6 · hr · img
li · ol · p · pre · strong · table · tbody · td · th · thead · tr · ul
```

Plus claymark-specific keys:

```
codeBlock · mermaid · math · mathDisplay · taskListItem · lightbox
```

Example:

```tsx
const components: Partial<ComponentMap> = {
  a: ({ href, children, ...rest }) => (
    <a href={href} {...rest} data-tracked>{children}</a>
  ),
};
```

> Overrides receive **already-sanitized** props. You cannot reintroduce unsafe content through the component map, and you should not attempt to — props arrive after the trust boundary.

### `RenderError`

| Field | Type | Description |
|---|---|---|
| `subsystem` | `'math' \| 'diagram' \| 'highlight' \| 'parse'` | Where it occurred |
| `message` | `string` | Human-readable |
| `nodePosition` | `Position \| null` | Source location if known |
| `recovered` | `boolean` | Always `true` in v1.0 — errors never propagate |

---

## Versioning

Semantic Versioning 2.0.0.

- **Patch** — bug fixes, internal changes, dependency updates with no surface change
- **Minor** — additive: new options, new component map keys, new exports
- **Major** — removals, renames, default behavior changes, or a change to the security posture

Sanitization behavior is treated as a **major** surface: any change that could alter what passes the trust boundary is a major release, regardless of how small the code change is.
