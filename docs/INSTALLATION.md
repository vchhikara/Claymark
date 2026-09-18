# INSTALLATION

Covers three audiences: developers embedding the library, users installing the app, and contributors building from source.

---

## 1. Library — embedding in a React app

### Requirements
- Node.js 20.11.1 or later
- React 18.3.1 or later (peer dependency)
- A bundler supporting ESM and dynamic `import()` — Vite, webpack 5, Rollup, Next.js

### Install

```bash
npm install claymark
# or
pnpm add claymark
# or
yarn add claymark
```

### Minimal integration

> **As-built note (T-P9-06):** there is no `<Markdown>` convenience component in the shipped package (see `API.md`). Rendering a document is a two-step call into `processor`/`toReact`, mounted inside `<MarkdownRoot>`:

```tsx
import { processor, toReact, MarkdownRoot, ThemeProvider } from 'claymark';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import 'claymark/styles.css';

export function App() {
  const [content, setContent] = useState<ReactNode>(null);

  useEffect(() => {
    (async () => {
      const tree = processor.parse('# Hello\n\nRendered with **claymark**.');
      const hastTree = await processor.run(tree);
      setContent(toReact(hastTree));
    })();
  }, []);

  return (
    <ThemeProvider>
      <MarkdownRoot>{content}</MarkdownRoot>
    </ThemeProvider>
  );
}
```

`claymark/styles.css` carries the token definitions, the font faces, and the KaTeX stylesheet. Import it once, at the application root.

### Bundler notes

**Vite** — works with no configuration.

**Next.js App Router** — the renderer is a client component:
```tsx
'use client';
import { MarkdownRoot, processor, toReact } from 'claymark';
```

**webpack 5** — ensure `experiments.topLevelAwait` is enabled where `processor.run(tree)` is awaited.

**Jest** — Jest does not natively resolve ESM-only dependencies. Either migrate to Vitest, or add:
```js
transformIgnorePatterns: ['node_modules/(?!(claymark|unified|remark-.*|rehype-.*|mdast-.*|hast-.*|unist-.*|vfile.*|bail|trough|micromark.*|decode-named-character-reference|character-entities.*|property-information|space-separated-tokens|comma-separated-tokens|zwitch|html-void-elements)/)']
```

---

## 2. Desktop application

### Pre-built binaries

Download from the releases page and install:

| Platform | File | Install |
|---|---|---|
| macOS (Apple Silicon) | `claymark_1.0.0_aarch64.dmg` | Open, drag to Applications |
| macOS (Intel) | `claymark_1.0.0_x64.dmg` | Open, drag to Applications |
| Windows | `claymark_1.0.0_x64-setup.exe` | Run the installer |
| Linux (Debian/Ubuntu) | `claymark_1.0.0_amd64.deb` | `sudo dpkg -i claymark_1.0.0_amd64.deb` |
| Linux (universal) | `claymark_1.0.0_amd64.AppImage` | `chmod +x` then run |

**macOS Gatekeeper.** Unsigned builds are quarantined. Either right-click → Open the first time, or:
```bash
xattr -d com.apple.quarantine /Applications/claymark.app
```

**Linux dependencies.** The Tauri WebView requires:
```bash
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0
```

---

## 3. Web app and mobile

Visit the hosted app in any modern browser, then install it:

| Platform | Procedure |
|---|---|
| Chrome / Edge (desktop) | Install icon in the address bar |
| Safari (macOS) | File → Add to Dock |
| iOS Safari | Share → Add to Home Screen |
| Android Chrome | Menu → Install app |

Once installed the app works fully offline. All assets — fonts, highlighter grammars, math and diagram runtimes — are cached by the service worker on first load.

---

## 4. Building from source

```bash
git clone <repository-url>
cd claymark

# Node must match .nvmrc exactly
nvm use

# Reproducible install — do not use plain `pnpm install`
pnpm install --frozen-lockfile

pnpm dev            # dev server, http://localhost:5173
pnpm build          # library + app into dist/
pnpm test           # unit suite
pnpm test:security  # XSS corpus — must be 100%
```

### Desktop build

Additionally requires the Rust toolchain (stable 1.77+):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
pnpm tauri build    # binary in desktop/target/release/bundle/
```

### Full verification suite

```bash
pnpm verify         # tsc + lint + test + security + a11y + contrast
pnpm bench:stress   # stress matrix S-01…S-12
pnpm bench:backtest # 250-document corpus replay
```

---

## 5. Configuration

Zero configuration is required — and, as-built (T-P9-06), none is currently exposed: `<ThemeProvider>` takes only `children` (theme itself always follows `prefers-color-scheme` until the user clicks `<ThemeToggle>`), `toReact` takes a `components` override and an optional `subtreeCache`, and there is no runtime token override, font override, or cache-capacity configuration function.

See `API.md` for full signatures and `THEMING.md` for the token schema (token/font customization currently requires forking the CSS token files, not a runtime API).

---

## 6. Upgrade and rollback

**Library.** Pin exact versions (no range specifiers, per this project's own dependency policy) and read `CHANGELOG.md` before bumping — a **Major** entry per the Version policy means removals, renames, default-behavior changes, or any sanitization change. To roll back, reinstall the prior exact version (`pnpm add claymark@<version>`); no persisted state or schema exists to migrate, since the library holds no storage of its own beyond the caller's own `prefers-color-scheme`/`<ThemeToggle>` preference in the host page.

**PWA.** The service worker is versioned by build hash and updates on next load once the new `dist/app` is deployed; a user on an old cached version keeps working offline until they reload with connectivity. Rollback is redeploying the previous `dist/app` build — there is no server-side state to reconcile.

**Desktop (Tauri).** Rollback is reinstalling the prior binary. Uninstall first on Linux (`sudo dpkg -r claymark` for `.deb`, or delete the AppImage) since Tauri does not manage version coexistence. The app persists only the theme preference; no data migration is required between versions.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Unstyled output | Stylesheet not imported | `import 'claymark/styles.css'` at the app root |
| Math renders as raw TeX | KaTeX chunk failed to load | Check the network tab; verify CSP allows the chunk origin |
| Code blocks unhighlighted | Language not in the 34-language registry | Expected behavior — falls back to plain text |
| Diagrams show as code blocks | Invalid Mermaid syntax | Validate the source; this is the deliberate fail-closed path |
| `ERR_REQUIRE_ESM` | CJS context importing ESM deps | Use the CJS build entry, or migrate the consumer to ESM |
| Flash of light theme | Blocking theme script missing | Add the init snippet from `THEMING.md §6` to your HTML head |
| Fonts fall back to Georgia | WOFF2 files not served | Verify your bundler copies `public/fonts/` |
| CSP violation on styles | Inline styles blocked | claymark emits none from content; check your own inline styles |
| Slow first render of a long doc | Highlighter chunk loading | Expected once per session; subsequent renders are cached |

If a problem is not listed, capture the input that triggers it and file it with the minimal reproducing Markdown. Input-specific rendering bugs are the highest-value bug reports.
