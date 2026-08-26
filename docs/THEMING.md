# THEMING

Every visual value in claymark resolves to a CSS custom property. No component contains a literal color or size. This means the entire surface can be restyled without touching a line of logic.

---

## 1. Token layers

Three layers. Each references only the layer below it.

```
SEMANTIC   --surface, --text-primary, --border-subtle
              │  (references ↓, never a literal)
PRIMITIVE  --neutral-100 … --neutral-1200, --clay-500
              │  (literal HSL values live here, and only here)
SYSTEM     --font-body, --measure, --space-4, --radius-md
```

Restyle at the **semantic** layer to change meaning; at the **primitive** layer to change palette.

---

## 2. Primitive tokens

### Neutral ramp — 12 steps

| Token | Role |
|---|---|
| `--neutral-100` | Lightest surface |
| `--neutral-200` | Raised surface |
| `--neutral-300` | Subtle fill |
| `--neutral-400` | Subtle border |
| `--neutral-500` | Border |
| `--neutral-600` | Strong border |
| `--neutral-700` | Disabled text |
| `--neutral-800` | Muted text |
| `--neutral-900` | Secondary text |
| `--neutral-1000` | Body text |
| `--neutral-1100` | Strong text |
| `--neutral-1200` | Maximum contrast |

Values are HSL triples without the `hsl()` wrapper, so they compose with alpha:

```css
--neutral-1000: 60 3.4% 15%;
color: hsl(var(--neutral-1000) / 0.8);
```

### Accent

| Token | Value | Role |
|---|---|---|
| `--clay-500` | `#d97757` | Primary accent, calls to action |
| `--clay-400` | Lighter | Hover |
| `--clay-600` | Darker | Active |
| `--accent-brand` | → `--clay-500` | Semantic alias |

---

## 3. Semantic tokens

| Token | Light source | Dark source |
|---|---|---|
| `--surface` | `--neutral-100` | `--neutral-1200` |
| `--surface-raised` | `--neutral-200` | `--neutral-1100` |
| `--surface-code` | `--neutral-200` | `--neutral-1100` |
| `--text-primary` | `--neutral-1000` | `--neutral-200` |
| `--text-secondary` | `--neutral-900` | `--neutral-400` |
| `--text-muted` | `--neutral-800` | `--neutral-600` |
| `--border-subtle` | `--neutral-400` | `--neutral-800` |
| `--border-default` | `--neutral-500` | `--neutral-700` |
| `--link` | `--clay-600` | `--clay-400` |
| `--quote-rule` | `--neutral-500` | `--neutral-700` |

Every semantic token has a dark counterpart. Parity is verified at Gate G1 criterion 4.

---

## 4. Typography

| Token | Value |
|---|---|
| `--font-body` | `'Source Serif 4', Georgia, 'Times New Roman', serif` |
| `--font-ui` | `Inter, -apple-system, 'Segoe UI', sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', Menlo, monospace` |
| `--text-body` | `20px` |
| `--leading-body` | `1.4` |
| `--text-code` | `16px` |

### Heading scale

| Level | Size | Weight | Leading |
|---|---|---|---|
| h1 | `2.0rem` | 600 | 1.2 |
| h2 | `1.6rem` | 600 | 1.25 |
| h3 | `1.35rem` | 600 | 1.3 |
| h4 | `1.15rem` | 600 | 1.35 |
| h5 | `1.0rem` | 600 | 1.4 |
| h6 | `0.9rem` | 600 | 1.4 |

Strictly descending, verified at Gate G3 criterion 5.

---

## 5. Layout

| Token | Value | Role |
|---|---|---|
| `--measure` | `48rem` | Content width — the single most important value for reading comfort |
| `--space-1` … `--space-12` | `0.25rem` … `6rem` | Spacing scale |
| `--radius-sm` / `--md` / `--lg` | `4px` / `8px` / `12px` | Corner radii |
| `--z-lightbox` | `1000` | Lightbox stacking |

---

## 6. Preventing the theme flash

A dark-mode user loading a light-default page sees a white flash. Prevent it with a blocking script in `<head>`, before any stylesheet:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('claymark-theme') || 'system';
      var d = t === 'dark' || (t === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (d) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) {}
  })();
</script>
```

Must be inline and synchronous. Deferring it defeats the purpose.

---

## 7. Overriding tokens

### At the provider

```tsx
<ThemeProvider tokens={{
  accent: { clay500: '#5b8def' },
  layout: { measure: '42rem' },
  typography: { textBody: '18px' },
}}>
```

Deep-merged over defaults. Unspecified tokens keep their values.

### In CSS

```css
:root {
  --measure: 42rem;
  --clay-500: #5b8def;
}
[data-theme='dark'] {
  --surface: 220 15% 8%;
}
```

### Fonts

```tsx
<ThemeProvider fonts={{
  body: '/fonts/MySerif.woff2',
  ui: '/fonts/MySans.woff2',
  mono: '/fonts/MyMono.woff2',
}}>
```

Local paths only — remote URLs are rejected, because the product makes zero runtime network requests (NFR-1.6).

> **Licensing is yours.** This hook exists so you can use fonts *you* are licensed to use. claymark ships open-licensed substitutes precisely because the fonts it visually references are proprietary and not redistributable.

---

## 8. Code themes

Shiki themes, paired light and dark, resolved by the `data-theme` attribute. Override with any VS Code theme:

```ts
{ highlight: { themes: { light: 'github-light', dark: 'github-dark-dimmed' } } }
```

Record the provenance and license of any theme you bundle (R-LEGAL-04).

---

## 9. Contrast requirements

Any override must preserve WCAG 2.2 AA:

| Pair | Minimum |
|---|---|
| `--text-primary` on `--surface` | 4.5:1 |
| `--text-secondary` on `--surface` | 4.5:1 |
| `--text-muted` on `--surface` | 4.5:1 |
| Headings ≥ 24px on `--surface` | 3:1 |
| `--link` on `--surface` | 4.5:1 |
| Focus ring on any surface | 3:1 |

Verify with `pnpm test:contrast`. The default tokens pass in both themes; **overrides are not automatically checked at runtime** — run the test after changing them.
