import type { ReactElement, RefObject } from 'react'
import { applyBold, applyCode, applyItalic, applyLink, applyList } from './formattingActions'
import { Button } from './ui/Button'

// Phase 3.5: text-glyph buttons (not icon-font) per checklist §4.
export interface FormattingToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
}

export function FormattingToolbar({ textareaRef, onChange }: FormattingToolbarProps): ReactElement {
  const run = (action: typeof applyBold): void => {
    const el = textareaRef.current
    if (!el) return
    const result = action({
      value: el.value,
      selectionStart: el.selectionStart ?? el.value.length,
      selectionEnd: el.selectionEnd ?? el.value.length,
    })
    onChange(result.value)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  return (
    <div
      data-testid="formatting-toolbar"
      style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}
    >
      <Button variant="outline" size="sm" data-testid="format-bold" onClick={() => run(applyBold)}>
        B
      </Button>
      <Button variant="outline" size="sm" data-testid="format-italic" onClick={() => run(applyItalic)}>
        I
      </Button>
      <Button variant="outline" size="sm" data-testid="format-code" onClick={() => run(applyCode)}>
        {'</>'}
      </Button>
      <Button variant="outline" size="sm" data-testid="format-list" onClick={() => run(applyList)}>
        •
      </Button>
      <Button variant="outline" size="sm" data-testid="format-link" onClick={() => run(applyLink)}>
        🔗
      </Button>
    </div>
  )
}
