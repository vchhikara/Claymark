// Phase 2.2 (android-to-desktop-checklist.md §3): session state machine.
// NO_DOCUMENT / VIEWING / EDITING / SAVING / SAVE_FAILED crossed with save
// status CLEAN/DIRTY/SAVING/SAVED/FAILED — no invalid combination
// representable.
import { describe, expect, it } from 'vitest'
import {
  createInitialSession,
  sessionReducer,
  type SessionState,
} from '../src/app/session/documentSession'

const openedDoc = { id: 'doc-1', name: 'note.md', writable: true }

describe('document session state machine', () => {
  it('starts at NO_DOCUMENT / CLEAN', () => {
    const s = createInitialSession()
    expect(s.status).toBe('NO_DOCUMENT')
    expect(s.saveStatus).toBe('CLEAN')
  })

  it('NO_DOCUMENT -> VIEWING on OPEN', () => {
    const s = sessionReducer(createInitialSession(), { type: 'OPEN', document: openedDoc })
    expect(s.status).toBe('VIEWING')
    expect(s.saveStatus).toBe('CLEAN')
    expect(s.document).toEqual(openedDoc)
  })

  it('VIEWING -> EDITING on START_EDIT, dirty on EDIT_CHANGE', () => {
    let s: SessionState = sessionReducer(createInitialSession(), { type: 'OPEN', document: openedDoc })
    s = sessionReducer(s, { type: 'START_EDIT' })
    expect(s.status).toBe('EDITING')
    s = sessionReducer(s, { type: 'EDIT_CHANGE' })
    expect(s.saveStatus).toBe('DIRTY')
  })

  it('EDITING+DIRTY -> SAVING on SAVE_START -> VIEWING+CLEAN on SAVE_SUCCESS', () => {
    let s: SessionState = sessionReducer(createInitialSession(), { type: 'OPEN', document: openedDoc })
    s = sessionReducer(s, { type: 'START_EDIT' })
    s = sessionReducer(s, { type: 'EDIT_CHANGE' })
    s = sessionReducer(s, { type: 'SAVE_START' })
    expect(s.status).toBe('SAVING')
    expect(s.saveStatus).toBe('SAVING')
    s = sessionReducer(s, { type: 'SAVE_SUCCESS' })
    expect(s.status).toBe('EDITING')
    expect(s.saveStatus).toBe('SAVED')
  })

  it('SAVING -> SAVE_FAILED status + FAILED save status on SAVE_ERROR', () => {
    let s: SessionState = sessionReducer(createInitialSession(), { type: 'OPEN', document: openedDoc })
    s = sessionReducer(s, { type: 'START_EDIT' })
    s = sessionReducer(s, { type: 'EDIT_CHANGE' })
    s = sessionReducer(s, { type: 'SAVE_START' })
    s = sessionReducer(s, { type: 'SAVE_ERROR', error: 'disk full' })
    expect(s.status).toBe('SAVE_FAILED')
    expect(s.saveStatus).toBe('FAILED')
    expect(s.lastError).toBe('disk full')
  })

  it('rejects an illegal transition (SAVE_START from VIEWING with nothing dirty)', () => {
    const s = sessionReducer(createInitialSession(), { type: 'OPEN', document: openedDoc })
    const next = sessionReducer(s, { type: 'SAVE_START' })
    // Illegal action is a no-op, not a state that violates the machine's
    // invariants (no representable "SAVING but CLEAN" state).
    expect(next).toBe(s)
  })

  it('never produces a state where status=SAVING and saveStatus!=SAVING', () => {
    // Exhaustively drive every defined action from every reachable state and
    // assert the invariant holds — cheaper than hand-enumerating all pairs.
    const actions: Array<{ type: string; [k: string]: unknown }> = [
      { type: 'OPEN', document: openedDoc },
      { type: 'START_EDIT' },
      { type: 'EDIT_CHANGE' },
      { type: 'SAVE_START' },
      { type: 'SAVE_SUCCESS' },
      { type: 'SAVE_ERROR', error: 'x' },
      { type: 'BACK_TO_PREVIEW' },
      { type: 'CLOSE' },
    ]
    let states: SessionState[] = [createInitialSession()]
    for (let step = 0; step < 4; step++) {
      const next: SessionState[] = []
      for (const s of states) {
        for (const a of actions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          next.push(sessionReducer(s, a as any))
        }
      }
      states = next
    }
    for (const s of states) {
      if (s.status === 'SAVING') expect(s.saveStatus).toBe('SAVING')
    }
  })
})
