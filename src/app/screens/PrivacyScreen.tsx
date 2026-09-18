import type { ReactElement } from 'react'
import { StaticMarkdownScreen } from './StaticMarkdownScreen'

// checklist §1: "collects nothing" statement.
const PRIVACY_MD = `# Privacy

Claymark collects nothing.

- No analytics.
- No crash reporting.
- Zero runtime network requests.

## What is stored locally

- Your theme preference (light/dark/AMOLED).
- Your text-size preference.
- A crash-recovery draft of the document you're editing, and your recent
  files list — both stay on this device and are never transmitted anywhere.
`

export function PrivacyScreen(): ReactElement {
  return <StaticMarkdownScreen title="Privacy" markdown={PRIVACY_MD} />
}
