import { cloneElement } from 'react'
import type { ReactElement } from 'react'
import { MarkdownRoot } from '../../components/MarkdownRoot'
import { useStreamingMarkdown } from '../../hooks/useStreamingMarkdown'
import { ScreenShell } from './ScreenShell'

// Phase 3.2 (android-to-desktop-checklist.md §1): Help/About/Privacy render
// their static content through the app's own markdown pipeline ("dogfooding"
// per the checklist), not hand-rolled HTML. Shared by all three so the
// integration is written once.
export function StaticMarkdownScreen({
  title,
  markdown,
}: {
  title: string
  markdown: string
}): ReactElement {
  const { elements } = useStreamingMarkdown(markdown)
  return (
    <ScreenShell title={title}>
      <MarkdownRoot>
        {elements.map((element, index) => cloneElement(element, { key: index }))}
      </MarkdownRoot>
    </ScreenShell>
  )
}
