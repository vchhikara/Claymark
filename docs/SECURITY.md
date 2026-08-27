# SECURITY

claymark's core assumption: **every document is hostile.** The threat model below is what the architecture is built around, not a checklist applied afterward.

---

## 1. Threat model

### Trust boundary

```
UNTRUSTED                    │  TRUSTED
Markdown source              │  Sanitized hast → React tree → DOM
Streamed chunks              │
Embedded URLs                │
Fence contents               │
TeX expressions              │
Diagram definitions          │
─────────────────────────────┼─────────────────────────
        crossed at exactly one stage: rehype-sanitize
```

Anything that reaches the DOM has crossed that stage. There is one crossing, it is unconditional, and there is no configuration flag that disables it.

### Attackers considered

| Actor | Capability | Goal |
|---|---|---|
| Malicious document author | Full control of Markdown source | Script execution, credential theft, phishing |
| Compromised upstream model | Full control of streamed output | Same, delivered incrementally |
| Malicious link target | Controls the destination page | Reverse tabnabbing via `window.opener` |
| Supply-chain attacker | Compromises a dependency | Arbitrary code in the build |

### Explicitly out of scope

- Compromise of the host application embedding claymark
- Compromise of the user's browser or OS
- Attacks requiring physical device access
- Denial of service through resource exhaustion by an already-trusted caller

---

## 2. Controls

Every control below has at least one passing test. A control without a test is not a control.

| ID | Control | Implementation | Test |
|---|---|---|---|
| SC-01 | Raw HTML disabled | `allowDangerousHtml: false`; HTML escaped to text | `security.spec.ts` |
| SC-02 | Allow-list sanitization | `rehype-sanitize` with an explicit schema; no wildcard attributes | `security.spec.ts` |
| SC-03 | No `dangerouslySetInnerHTML` | Tree-level materialization via `hast-util-to-jsx-runtime` | Static scan, G2 c.7 |
| SC-04 | URL scheme policy | `http`, `https`, `mailto`, and `data:` limited to png/jpeg/gif/webp | `security.spec.ts` |
| SC-05 | Reverse-tabnabbing prevention | `rel="noopener noreferrer"` on all external anchors | `security.spec.ts` |
| SC-06 | No inline styles from content | `style` attribute stripped by schema | `security.spec.ts` |
| SC-07 | No event handlers | All `on*` attributes stripped | `security.spec.ts` |
| SC-08 | SVG sanitization | Mermaid output passed through DOMPurify before insertion | `mermaid.spec.ts` |
| SC-09 | Mermaid strict mode | `securityLevel: 'strict'`, `htmlLabels: false` | `mermaid.spec.ts` |
| SC-10 | Math fails closed | KaTeX `throwOnError: false`, output constrained by schema | `math.spec.ts` |
| SC-11 | Zero runtime network | All assets bundled; no CDN references | `grep`, G5 c.4 |
| SC-12 | CSP compatible | No `unsafe-inline`, no `unsafe-eval` required | Manual, G8 |
| SC-13 | Pinned dependencies | No range specifiers anywhere | G0 c.3 |
| SC-14 | Bounded memory | LRU with entry and byte ceilings | `cache.spec.ts`, S-09 |

Final security re-run for GATE G8: `bench/security-final.ts` re-exercises the SC-01–SC-07 corpus (XSS corpus, malicious-URL fixtures, rel hardening, no-`<script>`-nodes) against the as-built pipeline and pins the result to `bench/results/security-final.json`, enforced by `tests/security-final.spec.ts` (T-P8-08). Dependency vulnerability disposition is tracked in `SECURITY-AUDIT.md` (T-P8-07).

---

## 3. Sanitization schema

The allow-list is explicit and minimal. Everything not listed is removed.

**Elements permitted:**
```
a blockquote br code del em h1 h2 h3 h4 h5 h6 hr img input li ol p pre
span strong sup sub table tbody td th thead tr ul
+ KaTeX MathML subset: math semantics mrow mi mn mo msup msub mfrac annotation
+ svg subset for Mermaid output, post-DOMPurify
```

**Attributes permitted, per element:**

| Element | Attributes |
|---|---|
| `a` | `href`, `title`, `target`, `rel` |
| `img` | `src`, `alt`, `title`, `width`, `height`, `loading` |
| `input` | `type` (checkbox only), `checked`, `disabled` |
| `code`, `pre`, `span` | `className` (allow-list-prefixed only) |
| `td`, `th` | `align` |
| All | `id` (slug-prefixed only) |

**Categorically forbidden:** `style`, every `on*` handler, `srcset`, `formaction`, `xlink:href`, `data-*` originating from content.

---

## 4. Known limitations

Disclosed rather than hidden.

| ID | Limitation | Risk | Mitigation |
|---|---|---|---|
| KL-01 | Mermaid is a large third-party runtime with its own history of SVG injection findings | Medium | Strict mode, `htmlLabels: false`, DOMPurify on output, error boundary. Diagrams can be disabled entirely via `options.diagrams: false`. |
| KL-02 | KaTeX renders a MathML subset that must be allowed through the schema | Low | Subset is explicit and minimal; the XSS suite is re-run after the schema is widened (G5 c.3) |
| KL-03 | A pathological document can consume CPU during parse | Low | Stress matrix S-01…S-03 bound the worst observed cases; callers should render untrusted documents off the critical path |
| KL-04 | Component-map overrides run in the host application's context | Medium | Overrides receive already-sanitized props; the risk is host code, not claymark. Documented in `API.md`. |
| KL-05 | Shiki grammars are third-party regex sets | Low | Sandboxed to tokenization; output constrained by the schema |
| KL-06 | Fonts and themes are vendored, so upstream security fixes require a release | Low | Tracked in `SECURITY-AUDIT.md` (G8) |

---

## 5. Reporting a vulnerability

Do **not** open a public issue.

Report privately to the maintainer contact listed in the repository. Include:

1. Minimal reproducing Markdown source
2. Observed behavior
3. Expected behavior
4. Version and browser

Target response: acknowledgment within 72 hours, triage within 7 days, fix or documented mitigation within 30 days for high severity.

A reproducing Markdown string is by far the most useful thing you can send. The test corpus grows from reports.

---

## 6. Severity

| Level | Definition | Example |
|---|---|---|
| Critical | Script execution from document content | Any XSS |
| High | Bypass of a stated control | Sanitizer evasion, blocked URL scheme rendering |
| Medium | Information disclosure or unexpected network request | Content triggering an outbound request |
| Low | Degraded protection without direct exploitation | Missing `rel` on an edge-case anchor |

**Any confirmed Critical finding triggers an immediate patch release**, ahead of all other work.

---

## 7. For integrators

claymark protects against document content. It cannot protect against your application.

- Serve with a strict CSP. claymark requires no `unsafe-*` directives.
- Do not reintroduce `dangerouslySetInnerHTML` in component-map overrides.
- Do not disable subsystems selectively and assume the rest compensates — the controls are designed as a set.
- Treat model output as untrusted, always. That it came from your own model changes nothing; the model's input may not have been yours.
