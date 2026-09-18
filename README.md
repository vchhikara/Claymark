# Claymark v1.0.0

![Claymark banner](brand/banner.jpg)

**Functional and non-functional specification of the shipped product.**
This document is the contract. Where the roadmap and this specification disagree, **this document wins** and the roadmap is corrected.

>For people **using** claymark to read documents. If you are integrating it into an application, read `API.md` instead.

---

## What it does

claymark turns Markdown into a clean reading surface: serif body type on a comfortable measure, syntax-highlighted code, typeset mathematics, rendered diagrams, and readable tables. It works offline, follows your system theme, and never executes anything a document asks it to.

---

## Supported syntax

### Text

| You write | You get |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `~~struck~~` | ~~struck~~ |
| `` `code` `` | inline code |
| `[text](url)` | a link, underlined |
| `> quoted` | an indented quotation |
| `---` | a horizontal rule |

### Headings

Six levels, `#` through `######`. Each gets an anchor you can link to.

### Lists

```markdown
- unordered
- items
  - nest with two spaces

1. ordered
2. items

- [x] completed task
- [ ] pending task
```

Task checkboxes are display-only — they show state but are not clickable, because the document is a rendering, not a form.

### Code

Tag the fence with a language for highlighting:

````markdown
```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```
````

Thirty-four languages are supported. Anything else renders as plain preformatted text — that is expected, not a failure.

**Highlighting specific lines** — add a range in braces:

````markdown
```js {2,4-6}
```
````

Every code block has a **copy button** in its header. It copies exactly the source, without line numbers or highlighting artifacts.

### Tables

```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| a    |   b    |     c |
```

Wide tables scroll horizontally inside their own container. The page itself never scrolls sideways.

### Mathematics

Inline with single dollars, display with double:

```markdown
Euler's identity is $e^{i\pi} + 1 = 0$.

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
```

Malformed TeX shows an error inline rather than breaking the page.

### Diagrams

Use a `mermaid` fence:

````markdown
```mermaid
flowchart LR
    A[Input] --> B[Parse]
    B --> C[Sanitize]
    C --> D[Render]
```
````

Flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, and pie charts are supported. Invalid syntax falls back to showing the diagram source as a code block.

### Images

```markdown
![alt text](image.png "Caption text")
```

Alt text is used by screen readers; the title becomes a visible caption. Click any image to open it in a lightbox — Escape closes it.

---

## Reading features

**Theme.** Follows your system light/dark setting automatically. Use the toggle to override; your choice is remembered.

**Lightbox.** Click an image to enlarge. Escape or clicking outside closes it and returns focus to where you were.

**Copy.** Every code block copies with one click.

**Offline.** After the first load, everything works without a network connection.

---

## Keyboard

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move between links, buttons, and scrollable regions |
| `Enter` / `Space` | Activate the focused control |
| `Escape` | Close the lightbox |
| `←` `→` | Scroll a focused code block or table horizontally |

Everything is reachable without a mouse. Focus is always visible and, after a dialog closes, always restored.

---

## Accessibility

- Conforms to WCAG 2.2 Level AA
- Semantic HTML throughout — headings, lists, and tables are announced correctly
- Math is exposed as MathML to screen readers
- Diagrams carry text alternatives
- Contrast meets AA in both themes
- Animations are suppressed when your system requests reduced motion

---

## What it deliberately will not do

Some of these look like missing features. They are decisions.

| Behavior | Why |
|---|---|
| Raw HTML in a document is shown as text, not rendered | HTML in untrusted documents is the primary attack surface. It is disabled entirely, without an override. |
| Task checkboxes are not clickable | This is a renderer, not a form. State lives in the source. |
| Documents cannot load remote resources | Zero runtime network requests, by design. This is what makes offline reliable and tracking impossible. |
| Unregistered code languages are not highlighted | Bundling every grammar would multiply the download size. |
| Documents cannot supply their own styles | A document that can style itself can disguise itself. |

---

## Troubleshooting

| Symptom | Explanation |
|---|---|
| Code block is not colored | Language is outside the 34-language registry, or the fence has no language tag |
| Math shows as raw `$…$` | The math runtime is still loading, or the TeX has a syntax error |
| Diagram shows as a code block | The Mermaid syntax is invalid — check for a missing diagram-type keyword on the first line |
| HTML appears as literal text | Working as intended, see §6 |
| Image does not display | The URL scheme is blocked; only `http`, `https`, and image `data:` URIs are permitted |
| Theme resets on reload | Browser storage is blocked or cleared — check private-browsing settings |

---

## Users and use cases

| User | Use case | Primary surface |
|---|---|---|
| Application developer | Embed a rendering surface in an existing React app | Library (`npm`) |
| End user | Read and interact with rendered documents | PWA / desktop app |
| Designer | Restyle the surface without touching logic | Token layer |
| Security reviewer | Audit the trust boundary | `SECURITY.md` + test suite |

---

## Performance budgets

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

### Accessibility
WCAG 2.2 AA. Zero axe-core violations. Body contrast ≥ 4.5:1 and large text ≥ 3:1 in both themes. Text alternatives for math and diagrams. `prefers-reduced-motion` honoured.

### Compatibility
Chromium 120+, Firefox 121+, Safari 17+. React 18.3+ as a peer dependency. ESM and CJS builds with TypeScript declarations.

### Reliability
No input crashes the renderer. Malformed math, invalid diagrams, pathological nesting, and truncated streams all degrade gracefully. Error boundaries isolate subsystem failures to the affected block.

---
