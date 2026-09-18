import type { ReactElement } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog'
import { collectHeadings } from './toc'

export interface TocDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: string
  onJumpToLine: (line: number) => void
}

export function TocDialog({ open, onOpenChange, source, onJumpToLine }: TocDialogProps): ReactElement {
  const headings = collectHeadings(source)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="toc-dialog">
        <DialogHeader>
          <DialogTitle>Outline</DialogTitle>
        </DialogHeader>
        {headings.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(var(--text-muted))' }}>No headings found.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '60vh', overflowY: 'auto' }}>
            {headings.map((heading, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => {
                    onJumpToLine(heading.line)
                    onOpenChange(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    padding: 'var(--space-1) 0',
                    paddingLeft: `${(heading.level - 1) * 1}rem`,
                    fontSize: heading.level <= 2 ? '0.9375rem' : '0.8125rem',
                    fontWeight: heading.level === 1 ? 600 : 400,
                    color: 'hsl(var(--text-primary))',
                  }}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
