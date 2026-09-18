// Phase 2.4 (android-to-desktop-checklist.md §3): crash-recovery draft
// buffer — always-on, 700ms debounce, keyed by document id, auto-clears once
// text matches last-saved state, force-flushed synchronously on backgrounding.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const store = new Map<string, string>()
vi.mock('../src/app/document/draftPersistence', () => ({
  readDraft: vi.fn((id: string) => store.get(id) ?? null),
  writeDraft: vi.fn((id: string, content: string) => {
    store.set(id, content)
  }),
  clearDraft: vi.fn((id: string) => {
    store.delete(id)
  }),
}))

import { createDraftBuffer } from '../src/app/document/draftStore'
import { clearDraft, writeDraft } from '../src/app/document/draftPersistence'

beforeEach(() => {
  vi.useFakeTimers()
  store.clear()
  vi.clearAllMocks()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('draft buffer', () => {
  it('debounces writes by 700ms', () => {
    const buffer = createDraftBuffer('doc-1', 'saved content')
    buffer.onChange('draft v1')
    expect(writeDraft).not.toHaveBeenCalled()
    vi.advanceTimersByTime(699)
    expect(writeDraft).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(writeDraft).toHaveBeenCalledWith('doc-1', 'draft v1')
  })

  it('auto-clears the draft once the text matches last-saved state', () => {
    const buffer = createDraftBuffer('doc-1', 'saved content')
    buffer.onChange('saved content')
    vi.advanceTimersByTime(700)
    expect(clearDraft).toHaveBeenCalledWith('doc-1')
    expect(writeDraft).not.toHaveBeenCalled()
  })

  it('force-flushes synchronously (no debounce) on flush()', () => {
    const buffer = createDraftBuffer('doc-1', 'saved content')
    buffer.onChange('unsaved edit')
    buffer.flush()
    expect(writeDraft).toHaveBeenCalledWith('doc-1', 'unsaved edit')
  })

  it('is keyed per document id — two buffers do not clobber each other', () => {
    const a = createDraftBuffer('doc-a', '')
    const b = createDraftBuffer('doc-b', '')
    a.onChange('A content')
    b.onChange('B content')
    a.flush()
    b.flush()
    expect(writeDraft).toHaveBeenCalledWith('doc-a', 'A content')
    expect(writeDraft).toHaveBeenCalledWith('doc-b', 'B content')
  })
})
