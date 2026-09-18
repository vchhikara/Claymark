import type { ReactElement } from 'react'
import { StaticMarkdownScreen } from './StaticMarkdownScreen'

const HELP_MD = `# Help

## Opening a document

Use **Open file** from the drawer, or drag a \`.md\` file onto the window.

## Editing

Press **Edit** (or \`Ctrl+E\`) to switch into edit mode. Use the formatting
toolbar for Bold, Italic, Code, List, and Link.

## Saving

- \`Ctrl+S\` saves in place, if the document is writable.
- **Save as…** always opens a picker for a new location.

## Search

\`Ctrl+F\` opens the search bar. While editing, a Replace row is also
available.
`

export function HelpScreen(): ReactElement {
  return <StaticMarkdownScreen title="Help" markdown={HELP_MD} />
}
