# Security Policy

Claymark's entire reason for existing is rendering untrusted content without letting it execute. If you've found a way past that boundary, this is the most useful bug report you can give the project, and it deserves a private channel, not a public issue.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Instead, report it privately using [GitHub's private vulnerability reporting](https://github.com/vchhikara/Claymark/security/advisories/new) on this repository. If that's unavailable to you, open an issue that says only "security report, please contact me privately" with no technical detail, and a maintainer will follow up for a private channel.

Include, where you can:

- The surface affected (library, desktop, Android, or web extension, they don't all share every dependency).
- A minimal Markdown input that reproduces the issue.
- What you'd expect to happen versus what actually happens.
- Whether the issue requires the document to come from a specific source (a remote fetch, a pasted string, streamed tokens) or reproduces regardless.

You do not need a working exploit to report a bug. A sanitizer gap you've spotted by reading the code is just as useful as one you've demonstrated.

## What's in scope

- Any path by which document content (Markdown, embedded math, Mermaid source, code fences) results in script execution, DOM-based XSS, or a runtime network request the user didn't initiate.
- Any way the web extension's closed shadow-DOM boundary can be reached from the host page, or the reverse.
- Any way a document can escape the renderer's sandbox to read or modify data outside itself (local files, other tabs, extension storage it shouldn't have access to).
- Dependency vulnerabilities in the render path with a realistic exploitation route, as opposed to a CVE in a transitive dependency that's unreachable from any document-rendering code path.

## What's out of scope

- Vulnerabilities in the developer's own application code that embeds the Claymark library (Claymark is not responsible for how a host app handles its own auth, routing, or state).
- Denial-of-service via pathologically large or deeply nested input; the renderer is expected to degrade, not to guarantee unbounded input handling.
- Issues that require the attacker to already have code execution on the user's machine.

## Response

There's no SLA on this yet, this is a small project, but every private report gets read and acknowledged, and a fix for a confirmed issue takes priority over feature work. If a report turns out to be a duplicate of something already tracked in [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) or [`plan/`](plan/), you'll be told which entry it matches.

## Supported versions

Claymark is pre-1.x in spirit even where the version string says 1.0.0, there's one actively maintained line, and security fixes land there rather than being backported to older tags.

## Further reading

- [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) — the dependency and vulnerability audit trail, including what's already been found and fixed.
- [`docs/SPEC.md`](docs/SPEC.md) — the security-relevant guarantees this project ships against (§6, "what it deliberately will not do").
