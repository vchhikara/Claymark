# Claymark — Brand Guidelines

**Status:** derived from the shipped product (`src/theme/tokens.css`, `src/theme/fonts.css`, `src/theme/claymark.css`, `public/manifest.json`, `README.md`, `spec.md`). Where this document and the code disagree, the code wins — update this file, don't override the code to match it.

---

## 1. What Claymark is

> A pixel-faithful, security-hardened Markdown rendering engine in the Claude visual idiom.
> — `package.json`, `public/manifest.json`

Claymark turns Markdown into a clean reading surface — serif body type on a comfortable measure, syntax-highlighted code, typeset mathematics, rendered diagrams, readable tables — built specifically to render **streamed, untrusted LLM output** safely. It ships three ways: an npm library, an installable PWA, and Tauri desktop/Android binaries.

**The brand promise, in one line:** *documents render exactly as written, nothing they contain ever runs, and the surface looks considered enough to read for an hour.*

### Positioning pillars

1. **Fidelity** — pixel-faithful rendering of CommonMark+GFM, math, diagrams, and 34 highlighted languages. Nothing degrades silently; malformed input fails visibly and locally (an inline error, a fallback code block), never by breaking the page.
2. **Security by construction** — no raw HTML execution, no runtime network requests, allow-listed URL schemes, no ability for a document to style or script itself. This is a trust boundary, not a feature toggle — see `SECURITY.md`.
3. **Editorial calm** — the reading experience is the product. Chrome (buttons, headers, controls) stays quiet and secondary; the serif body text is the loudest thing on the page.
4. **The Claude visual idiom** — Claymark's palette and warmth are a deliberate cousin of Anthropic's Claude, not a generic dark-mode dev tool. The name itself comes from the clay/terracotta accent that anchors the whole palette.

---

## 2. Name & wordmark

- **Product name:** `Claymark` — one word, capital C, no space, no hyphen. Never "ClayMark", "clay-mark", or "Clay Mark".
- **Lowercase in running prose:** the product's own docs (`README.md`) consistently write `claymark` lowercase mid-sentence ("claymark turns Markdown into..."), reserving `Claymark` (capitalized) for titles, headings, and the app UI. Follow whichever convention the surrounding document already uses — don't mix both in one document.
- **In-app wordmark:** the header shows `CLAYMARK` — uppercase, letter-spaced (`0.08em`), set in the UI sans (Inter), muted text color (`--text-muted`), never bold. This is the no-document/empty state treatment; once a document is open, the wordmark is replaced by the document's own filename (the reading surface always wins over the brand chrome).
- **Tagline** (from the PWA manifest and package metadata): *"A pixel-faithful, security-hardened Markdown rendering engine in the Claude visual idiom."* Use verbatim when a one-line description is needed; don't paraphrase the three claims (pixel-faithful, security-hardened, Claude visual idiom) out of it.

---

## 3. Color

Claymark's palette is HSL-token-driven (`src/theme/tokens.css`) so every color resolves per theme. **Always reference the CSS custom properties — never hardcode a hex value in product surfaces.** The hex values below are for external, non-CSS contexts only (slide decks, marketing pages, app-store listings).

### Brand accent — "Clay"

| Token | Hex | Use |
|---|---|---|
| `--clay-400` | `#e29981` | Lightest tint — decorative accents only, never as text |
| `--clay-500` | `#d97757` | The core Claymark/Claude clay — logo, marketing surfaces, large accent fills |
| `--clay-600` | `#c8542d` | PWA `theme_color` (browser chrome tinting) |
| `--clay-700` | `#bd4d28` | **In-app link/accent color, light theme** — darkened from clay-600 specifically to clear WCAG AA 4.5:1 text contrast against `--surface`; clay-600 measured 4.23:1 and failed |

Dark theme uses `--clay-400` for links/accent instead of `--clay-700` — the darkening correction is a light-theme-only need, since dark surfaces don't have the same contrast failure.

**Rule:** never pick a clay shade by eye for text-on-surface use. If a new accent placement needs contrast validation, measure it — don't assume `clay-500` (the "true" brand color) is legible as text; it isn't reliably at AA on either theme's body surface, which is exactly why `clay-700`/`clay-400` exist as the corrected link/accent tokens.

### Neutrals

A single warm-neutral ramp (`--neutral-100` through `--neutral-1200`, hue 60° sat 3.4%) drives every surface, border, and text-muting value in both themes — light theme reads from the light end of the ramp, dark theme from the dark end. This is what keeps light and dark mode feeling like the same product rather than an inverted one: same hue family throughout, just walked in opposite directions.

| Role | Token | Light | Dark |
|---|---|---|---|
| Page surface | `--surface` | warm off-white (`48 45% 98%`) | near-black (`0 0% 9.8%`) |
| Raised surface (code blocks, cards) | `--surface-raised` | `--neutral-200` | `--neutral-1100` |
| Primary text | `--text-primary` | `--neutral-1000` | `--neutral-200` |
| Secondary text | `--text-secondary` | `--neutral-900` | `--neutral-400` |
| Muted text | `--text-muted` | `--neutral-800` | `--neutral-600` |
| Subtle border | `--border-subtle` | `--neutral-400` | `--neutral-800` |
| Default border | `--border-default` | `--neutral-500` | `--neutral-700` |

Note the page surface is **not neutral gray** even in light mode — `48 45% 98%` is a warm, faintly parchment-toned white, not `#ffffff`. This warmth is part of the "editorial calm" pillar; a pure-white or pure-gray background reads as generic app chrome, not a reading surface.

### Contrast is non-negotiable

Claymark ships to WCAG 2.2 AA (`README.md` §Accessibility, §Performance budgets: "Zero axe-core violations. Body contrast ≥ 4.5:1 and large text ≥ 3:1 in both themes."). Any new brand application — a marketing page, a slide, a social card — inherits this bar. If a design pairs `clay-500` directly against `surface` as text, it will fail; use `clay-700` (light) / `clay-400` (dark), or treat clay-500 as a fill/graphic color only.

---

## 4. Typography

Three typefaces, each with one job (`--font-body` / `--font-ui` / `--font-mono` in `src/theme/tokens.css`; loaded via `@font-face` in `src/theme/fonts.css`):

| Role | Token | Family | Fallback stack | Weights shipped |
|---|---|---|---|---|
| Reading body | `--font-body` | **Source Serif 4** | Georgia, Times New Roman, serif | 400, 600 |
| UI chrome | `--font-ui` | **Inter** | -apple-system, Segoe UI, sans-serif | 400, 600 |
| Code | `--font-mono` | **JetBrains Mono** | SF Mono, Menlo, monospace | 400, 700 |

**The serif is the brand.** Source Serif 4 at 18px/1.4 (`--text-body`/`--leading-body`) on a 48rem measure (`--measure`) is the entire reading experience — this is not a generic system-font app. Headings (h1–h6) stay in the body serif too, at weight 600, not a separate display face; Claymark doesn't use a distinct "display" typeface anywhere.

Inter is reserved for **UI chrome only** — buttons, the header wordmark, labels, status text. Never set body/document content in Inter, and never set a button or header label in Source Serif 4. This split is how the reading surface stays visually distinct from the app shell around it.

JetBrains Mono covers both inline `code` and fenced code blocks, at two sizes: `--text-code` (15px, inline) and the one-point-smaller `--text-code-block` (12px, fenced) — a deliberate density difference matching most code-heavy reading UIs, not an inconsistency to fix.

**Type scale** (all set in the body serif, weight 600):

| Level | Size | Line height |
|---|---|---|
| H1 | 2rem | 1.2 |
| H2 | 1.6rem | 1.25 |
| H3 | 1.35rem | 1.3 |
| H4 | 1.15rem | 1.35 |
| H5 | 1rem | 1.4 |
| H6 | 0.9rem | 1.4 |

---

## 5. Shape, spacing, and chrome

- **Corner radius:** three steps only — `--radius-sm` (4px, small controls/pills), `--radius-md` (8px, buttons/code blocks — the default), `--radius-lg` (12px, larger containers). Don't introduce a fourth radius value; pick the nearest of these three.
- **Spacing:** an 11-step scale from `--space-1` (0.25rem) to `--space-12` (6rem), all in `rem`. Compose layout from these steps rather than arbitrary pixel values.
- **Buttons** (`.claymark-button` / `.claymark-button--compact`): set in Inter, `--radius-md` corners, quiet by default — the product has no single loud "primary CTA" button anywhere in the reading UI; even Save/Edit read as understated outline buttons (`variant="outline"`), because the document being read is always the visual priority over the chrome around it.
- **Measure:** body content is capped at `--measure` (48rem) and centered — never let reading content run edge-to-edge on wide viewports.
- **No horizontal page scroll, ever.** Wide content (tables, long code lines) scrolls inside its own bounded container; the page itself never does. This is a hard product rule, not a preference — see `src/theme/claymark.css`'s `overflow-x: hidden` on `html, body` and the real-device regression it was added to prevent (a header row that overflowed the viewport dragged even fixed-position modals off-screen). Any new layout — including marketing pages built outside this codebase — should honor the same rule.

---

## 6. Voice

Drawn from `README.md` and the in-repo specs, which are unusually consistent in register:

- **Direct, declarative, no hedging.** "claymark turns Markdown into a clean reading surface." Not "claymark helps you turn Markdown into...".
- **State what it does, then what it deliberately doesn't — and say why.** README's "What it deliberately will not do" table is the house style for explaining a constraint: name the behavior, then the reason, in one terse sentence each ("HTML in untrusted documents is the primary attack surface. It is disabled entirely, without an override."). Never apologize for a security-motivated limitation — state it as a decision.
- **No marketing superlatives.** No "blazing fast," "seamless," "beautiful." Claims are specific and falsifiable instead: "< 16 ms," "34 languages," "WCAG 2.2 Level AA," "zero runtime network requests." If a claim can't be measured or verified, it doesn't go in copy.
- **Second person for instructions, third person for the product.** "Use the toggle to override; your choice is remembered." / "claymark works offline."
- **Tables over paragraphs** wherever there's a structured comparison (syntax reference, troubleshooting, "what it won't do", user/use-case matrix). This is the default explanatory format, not an occasional device.

---

## 7. What Claymark is not

Useful via negativa, since several of these are easy brand drift to fall into:

- Not a generic "dark mode dev tool" palette — the neutral ramp is warm (hue 60°), not cool-gray; the page background is parchment-toned, not `#000`/`#fff`.
- Not a WYSIWYG editor brand — editing is a secondary, deliberately plain mode (a single header action, a plain textarea), never presented as co-equal with reading. See `src/app/main.tsx`'s own comment: "the primary job is VIEWING a Markdown file fast... with an Edit mode present but deliberately secondary."
- Not permissive about untrusted content — nothing in the brand voice or product ever frames sandboxing/sanitization as optional, configurable, or a power-user toggle.
- Not loud. No large filled CTA buttons, no saturated clay-500 backgrounds behind body text, no display typeface. If a design decision makes Claymark's UI feel more like a landing page than a reading surface, it's off-brand.

---

## 8. Assets on disk

- App icons: `src-tauri/icons/` (desktop/mobile — `icon.png`, `icon.icns`, `icon.ico`, platform-specific Windows tile sizes, `android/`, `ios/`) and `public/icon-192.png` / `icon-512.png` / `icon-maskable-512.png` (PWA).
- Fonts: `public/fonts/*.woff2` (Source Serif 4, Inter, JetBrains Mono — the exact weights listed in §4), loaded by `src/theme/fonts.css`.
- Color/type/spacing tokens: `src/theme/tokens.css` (source of truth — this document summarizes it, never the reverse).
