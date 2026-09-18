# Contributing to Claymark

Claymark is a rendering engine whose central promise is that it never executes what it renders. That promise constrains how contributions get reviewed more than most projects, so read this before opening a PR, it'll save you a review round-trip.

## Before you start

For anything beyond a small fix, open an issue first describing what you want to change and why. This project treats certain behaviors as deliberate refusals, not gaps (see the table in [`README.md`](README.md#what-it-deliberately-refuses-to-do)). A PR that reintroduces raw HTML rendering, adds a runtime network call, or makes a task checkbox interactive will be closed regardless of how well it's implemented, so it's worth confirming the direction before you write the code.

## Project layout

| Path | What it is |
|---|---|
| [`src/`](src/) | The core rendering engine and React library |
| [`desktop/`](desktop/) | Tauri 2.0 desktop shell |
| [`android/`](android/) | Native Android app (Kotlin, Jetpack Compose) |
| [`web-extension/`](web-extension/) | Manifest V3 browser extension |
| [`tests/`](tests/) | Unit, security, accessibility, and visual regression tests for the core library |
| [`docs/SPEC.md`](docs/SPEC.md) | The functional and non-functional contract. This document wins any disagreement with the roadmap. |

Each platform folder is close to self-contained; changes to the rendering core in `src/` affect all of them.

## Development setup

```bash
pnpm install
pnpm build
pnpm test
```

For a specific test suite:

```bash
pnpm test:security     # sanitization and XSS-vector coverage
pnpm test:a11y         # accessibility
pnpm test:contrast     # WCAG contrast ratios
pnpm test:commonmark   # spec conformance
pnpm test:visual       # Playwright visual regression
```

Platform-specific setup (Android SDK, Tauri prerequisites, extension build) is documented in each surface's own README: [`desktop/README.md`](desktop/README.md), [`android/README.md`](android/README.md), [`web-extension/README.md`](web-extension/README.md).

## Making a change

1. **Fork and branch.** Branch names aren't enforced, but a name that says what the branch does helps reviewers.
2. **Write the test first if you're fixing a bug.** A failing test that reproduces the bug is the fastest way to get a fix reviewed and merged.
3. **Match the surrounding code.** This repo pins dependency versions exactly (no `^` or `~` ranges) and avoids introducing new UI abstractions where an existing pattern already covers the case. If you're touching `src/app/ui/pb/`, that's a deliberately thin port layer, keep it thin.
4. **Run the full suite before opening the PR.**
   ```bash
   pnpm lint
   pnpm tsc
   pnpm test
   ```
5. **Keep the diff scoped.** One concern per PR. A bug fix doesn't need an adjacent refactor riding along with it, even a good one, it just makes the fix harder to review and harder to revert if something's wrong with it.

## Security-sensitive changes

Anything touching the sanitization path (`rehype-sanitize` config, `DOMPurify` calls, the URL policy, the extension's shadow-DOM boundary) needs to explain, in the PR description, which attack vectors it was tested against and what test coverage backs the claim. See [`SECURITY.md`](SECURITY.md) for how to report a vulnerability rather than fix it in the open, if that's what you found.

## What a good PR description looks like

- What changed and why, one or two sentences.
- Which test(s) cover it, or why it's untestable and what manual verification you did instead.
- Any deliberate behavior change to a surface other than the one you were working on.

Screenshots are useful for anything visual; the `test:visual` suite already keeps its own snapshots, so a screenshot in the PR description is for human reviewers, not a replacement for that suite passing.

## Code of conduct

Be direct, be specific, disagree with the change rather than the person who proposed it. Reviews here focus on correctness and security first, style second, because the second kind of feedback is cheap to give and the first kind is the entire point of the project.
