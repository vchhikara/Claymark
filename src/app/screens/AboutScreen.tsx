import type { ReactElement } from 'react'
import { StaticMarkdownScreen } from './StaticMarkdownScreen'

// checklist §1: bundled-library attribution.
const ABOUT_MD = `# About Claymark

Claymark is a Markdown renderer built for streamed, untrusted LLM output.

## Open-source attribution

- **KaTeX** — MIT License
- **Mermaid** — MIT License
- **Source Serif 4 / Inter / JetBrains Mono** — SIL Open Font License 1.1
- **commonmark-java** (Android port reference) — BSD-2-Clause

Version: \`1.0.0\`
`

export function AboutScreen(): ReactElement {
  return <StaticMarkdownScreen title="About" markdown={ABOUT_MD} />
}
