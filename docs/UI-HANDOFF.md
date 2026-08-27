# UI work handoff

Read only this file to start. Don't read `plan/04-STATE-LEDGER.md`, `SPEC.md`, or
past commit history unless you hit a specific question this file doesn't answer —
they're large and mostly irrelevant to UI work.

## What this project is

`claymark` — a Markdown renderer library (React) built to safely render streamed,
untrusted LLM output. Core rendering logic (`src/index.ts`, `src/hooks/`,
`src/processor*`) is stable and out of scope for UI work — don't touch it.

## What you're working on

The **app shell** around the renderer: `src/app/main.tsx`. This is the single
entry point for both the PWA (`pnpm build:app`) and the Tauri desktop build — one
file, no router, no other app-level components exist yet. It currently renders:
a streaming sample-doc demo, a toggleable textarea (paste/drop a `.md` file to
load it), and a theme toggle top-right. Functionally complete, visually plain —
this is what needs UI work.

## Component inventory (don't rebuild these — style/compose them)

- `src/components/` — one file per Markdown element (`Heading.tsx`, `Table.tsx`,
  `CodeBlock.tsx`, `Blockquote.tsx`, `Lightbox.tsx`, etc.) plus `MarkdownRoot.tsx`
  (the render root) and `ThemeToggle.tsx`. `map.tsx` wires element types to
  components. These are the actual rendered-content styling — if a heading looks
  wrong, the fix is here, not in `main.tsx`.
- `src/theme/ThemeProvider.tsx` — theme context + `<html data-theme>` sync (fixed
  recently, don't re-break: both `.claymark-root`'s div AND `<html>` must carry
  `data-theme`, kept in sync via a `useEffect` on every `theme` change — the
  anti-FOUC script in `index.html` sets `<html>`'s once at load, this provider
  must keep it current after).
- `src/theme/tokens.css` — every design token as CSS custom properties, HSL
  channel values so consumers do `hsl(var(--surface))`. Both themes' values live
  here (`:root` = light, `[data-theme='dark']` overrides). Key ones:
  `--surface`, `--surface-raised`, `--surface-code`, `--text-primary`,
  `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-default`,
  `--link`, `--accent-brand`, plus `--space-1`..`--space-12`, `--radius-sm/md/lg`,
  `--text-h1`..`--text-h6`/`--weight-h*`/`--leading-h*`, `--font-body/ui/mono`.
  **Always style new UI with these tokens, never hardcoded colors** — that's how
  both themes stay correct automatically.
- `src/theme/claymark.css` — global/base styles built from those tokens.

## Constraints (don't violate)

- **No new dependencies** without asking — the library ships lean on purpose.
- **SSR-safety**: any new code touching `window`/`document` needs a
  `typeof window/document === 'undefined'` guard (see `ThemeProvider.tsx` for
  the pattern) — some consumers render this library server-side.
- **Security**: never bypass the sanitization pipeline (`src/processor*`) to
  render raw HTML/user content directly — that's the library's core guarantee.
- Match existing code style: TSX, inline `style={{}}` is used in `main.tsx`
  currently (not CSS modules/Tailwind) — check what's already there before
  introducing a new styling approach; propose it first if you want to change it.

## How to run and see it

```bash
cd claymark
pnpm install --frozen-lockfile
npx vite --mode app --port 5173   # no "pnpm dev" script — this is the equivalent
```
Open `http://localhost:5173`. Hot reload works. `docs/HUMAN-TESTING-GUIDE.md` §3
has a full manual test script (code blocks, math, mermaid, XSS payloads, keyboard
nav) if you want a regression pass after UI changes.

## Verify before calling anything done

```bash
pnpm tsc            # 0 errors expected
pnpm test            # 118/118 expected (unrelated to UI styling, but don't regress it)
pnpm build:app        # confirm it still builds after UI changes
```
Then actually look at it in a browser in both themes — don't just trust the
build succeeding.

## Workflow note

This repo has no PR process — commits go straight to `master` on
`https://github.com/vchhikara/Claymark`. Push when a change is verified working.
