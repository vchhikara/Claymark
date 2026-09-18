import type { ReactElement } from 'react'
import { Button } from './ui/Button'
import type { SaveStatus } from './session/documentSession'

// Phase 3.4 (android-to-desktop-checklist.md §4): extracted from main.tsx's
// inline header. Not-editing layout: hamburger + filename + Edit button.
// Editing layout: Back + filename/save-status + Save/Save-as controls.
// Fixed 36px control height, centered at the --measure column width.
export interface ReaderHeaderProps {
  editing: boolean
  fileName: string | null
  writable: boolean
  saveStatus: SaveStatus
  onOpenDrawer: () => void
  onEdit: () => void
  onBackToPreview: () => void
  onSave: () => void
  onSaveAs: () => void
}

function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case 'DIRTY':
      return 'Unsaved changes'
    case 'SAVING':
      return 'Saving…'
    case 'SAVED':
      return 'Saved'
    case 'FAILED':
      return 'Save failed'
    default:
      return ''
  }
}

export function ReaderHeader({
  editing,
  fileName,
  writable,
  saveStatus,
  onOpenDrawer,
  onEdit,
  onBackToPreview,
  onSave,
  onSaveAs,
}: ReaderHeaderProps): ReactElement {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '36px',
        maxWidth: 'var(--measure)',
        margin: '0 auto var(--space-5)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid hsl(var(--border-subtle))',
      }}
    >
      {!editing ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              type="button"
              aria-label="Menu"
              data-testid="reader-hamburger"
              onClick={onOpenDrawer}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'hsl(var(--text-primary))' }}
            >
              ☰
            </button>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem' }}>{fileName ?? 'Untitled'}</span>
          </div>
          <Button variant="outline" size="sm" data-testid="reader-edit" onClick={onEdit}>
            Edit
          </Button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Button variant="ghost" size="sm" data-testid="reader-back" onClick={onBackToPreview}>
              ← Back
            </Button>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem' }}>{fileName ?? 'Untitled'}</div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }} data-testid="save-status">
                {saveStatusLabel(saveStatus)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {writable && (
              <Button variant="outline" size="sm" data-testid="reader-save" onClick={onSave}>
                Save
              </Button>
            )}
            <Button variant="default" size="sm" data-testid="reader-save-as" onClick={onSaveAs}>
              Save as…
            </Button>
          </div>
        </>
      )}
    </header>
  )
}
