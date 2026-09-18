![Claymark banner](brand/banner.jpg)

# Claymark

**A pixel-faithful, security-hardened Markdown rendering engine, built for text that is still arriving.**

Most Markdown renderers assume they're handed a finished document. Claymark assumes the opposite: a stream of tokens arriving from an LLM, one chunk at a time, that has to become a stable, typeset page *while it's still incomplete*, without flickering, without breaking, and without ever executing anything the document contains. That constraint shaped everything downstream of it, from the diff-based render path to the sanitizer that runs on every single frame.

It ships four ways: as a React library, a Progressive Web App, a native Android app, a Tauri desktop app, and a Manifest V3 browser extension. One rendering core, one security model, five surfaces.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](package.json)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri&logoColor=white)](desktop/tauri.conf.json)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0-7F52FF?logo=kotlin&logoColor=white)](android/build.gradle.kts)
[![Manifest V3](https://img.shields.io/badge/Extension-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](web-extension/public/manifest.json)
[![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-4C1?logo=accessibility&logoColor=white)](docs/SPEC.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Offline First](https://img.shields.io/badge/offline-first-blueviolet)](docs/SPEC.md)
[![Zero Runtime Network](https://img.shields.io/badge/runtime%20network-zero-critical)](SECURITY.md)

---

## Why this exists

Rendering trusted, complete Markdown is a solved problem. Rendering *untrusted, incomplete* Markdown, streamed token by token from a language model, while guaranteeing it can never execute a single line of what it renders, is a different problem entirely. It sits at the intersection of typography, incremental parsing, and a threat model where the attacker's payload arrives disguised as your own output.

Claymark treats the renderer as the trust boundary. Not a linter pass, not a "sanitize on save" step, a boundary the untrusted content can never cross, on every frame, by construction.

## What it does

- Renders GitHub-Flavored Markdown into a serif reading surface with syntax-highlighted code (34 languages), typeset mathematics (KaTeX), diagrams (Mermaid), and readable tables.
- Streams. Partial fences, half-closed bold, mid-token math delimiters, none of it breaks the render or flashes unstyled content.
- Refuses to execute. Raw HTML in a document is shown as text, never rendered. No `dangerouslySetInnerHTML` path exists for document content, anywhere, on any surface.
- Works offline, everywhere. Zero runtime network requests is a shipped guarantee, not an aspiration, because a renderer that can silently call home isn't a renderer you can trust with someone else's stream.
- Follows the system theme, respects `prefers-reduced-motion`, and holds WCAG 2.2 AA in both themes, including MathML for screen readers and text alternatives for diagrams.

## What it deliberately refuses to do

| Behavior | Why |
|---|---|
| Render raw HTML from a document | HTML in untrusted input is the primary attack surface. Disabled entirely, no override. |
| Let a document load a remote resource | Zero runtime network requests is what makes offline reliable and tracking structurally impossible. |
| Let a document style itself | A document that can restyle itself can disguise itself. |
| Make task checkboxes interactive | This is a renderer, not a form. State lives in the source, not in the DOM. |
| Highlight an unregistered language | Bundling every grammar multiplies the download size for a feature most documents never use. |

These read like missing features. They're decisions, and they're load-bearing ones.

## The four surfaces

| Surface | What it is | Where it lives |
|---|---|---|
| **Library** | The rendering engine itself, published as an npm package for embedding in an existing React app | [`src/`](src/) |
| **Desktop** | A native app built on Tauri 2.0, Rust shell around the same rendering core | [`desktop/`](desktop/) |
| **Android** | A native Jetpack Compose app (Kotlin 2.0, min SDK 26) with its own document backend | [`android/`](android/) |
| **Web extension** | A Manifest V3 extension that turns any `.md` URL into a rendered reading surface, closed-shadow-DOM isolated from the host page | [`web-extension/`](web-extension/) |

Every surface shares the same non-negotiable: it renders, it never executes.

## Performance budgets

Not targets. Budgets, measured on a mid-tier 2020 laptop, cold cache, and enforced by the test suite.

| Metric | Budget |
|---|---|
| First render, 2 KB document | < 16 ms |
| First render, 100 KB document | < 250 ms |
| Streaming append, per token | < 4 ms |
| Initial bundle, core only | < 120 KB gzipped |
| Cumulative layout shift | 0 |
| Memory, 10k-render soak | < 150 MB steady state |

## Security model

The full threat model and audit trail live in [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) and [`plan/`](plan/). The short version: every document is treated as hostile input, sanitization runs on every render pass rather than once at parse time, and the extension surface additionally isolates itself from the host page behind a closed shadow root so the page it's reading can't reach in and the extension can't leak out. See [`SECURITY.md`](SECURITY.md) for how to report a vulnerability.

## Getting started

```bash
pnpm install
pnpm build       # library build
pnpm test        # full test suite
pnpm lint
```

Platform-specific setup lives in each surface's own README: [`desktop/README.md`](desktop/README.md), [`android/README.md`](android/README.md), [`web-extension/README.md`](web-extension/README.md).

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — the functional and non-functional contract this product ships against
- [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) — dependency and vulnerability audit trail
- [`plan/`](plan/) — the original roadmap and build checklist (historical, frozen)
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to propose a change
- [`SECURITY.md`](SECURITY.md) — how to report a vulnerability

## License

MIT, see [`LICENSE`](LICENSE).
