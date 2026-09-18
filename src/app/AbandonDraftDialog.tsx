import type { ReactElement } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/Dialog'
import { Button } from './ui/Button'

// Phase 4.4 (android-to-desktop-checklist.md §5): checklist flags this as
// safety-critical — must be a true platform-level modal (Radix portal,
// verified in ui/Dialog.tsx), not an in-layout overlay, because of a
// precedent bug where a runaway-width row pushed a positioned overlay
// off-screen and made its buttons untappable. Triggers: Back-while-dirty,
// Open-while-dirty, Back-to-preview-from-failed-save.
export interface AbandonDraftDialogProps {
  open: boolean
  onCancel: () => void
  onDiscard: () => void
  onSave: () => void
}

export function AbandonDraftDialog({ open, onCancel, onDiscard, onSave }: AbandonDraftDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent data-testid="abandon-draft-dialog">
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>This document has unsaved edits that will be lost.</DialogDescription>
        </DialogHeader>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" size="sm" data-testid="abandon-cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" data-testid="abandon-discard" onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="default" size="sm" data-testid="abandon-save" onClick={onSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
