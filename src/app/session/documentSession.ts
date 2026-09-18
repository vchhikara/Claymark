// Phase 2.2 (android-to-desktop-checklist.md §3): session state machine.
// A discriminated union + reducer so illegal state combinations (e.g.
// status=SAVING with saveStatus=CLEAN) are unrepresentable rather than
// merely "shouldn't happen". Framework-agnostic (no React) so it's testable
// in isolation and wired into a context in Phase 3.

export type SessionStatus = 'NO_DOCUMENT' | 'VIEWING' | 'EDITING' | 'SAVING' | 'SAVE_FAILED'
export type SaveStatus = 'CLEAN' | 'DIRTY' | 'SAVING' | 'SAVED' | 'FAILED'

export interface OpenDocument {
  id: string
  name: string
  /** Re-checked before every save (checklist §3) — this is the last-known
   *  value, not a permanent grant. */
  writable: boolean
  /** "Open with"/externally-launched docs are read-only regardless of
   *  filesystem writability. */
  readOnly?: boolean
}

export interface SessionState {
  status: SessionStatus
  saveStatus: SaveStatus
  document: OpenDocument | null
  lastError: string | null
}

export type SessionAction =
  | { type: 'OPEN'; document: OpenDocument }
  | { type: 'START_EDIT' }
  | { type: 'EDIT_CHANGE' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'BACK_TO_PREVIEW' }
  | { type: 'CLOSE' }

export function createInitialSession(): SessionState {
  return { status: 'NO_DOCUMENT', saveStatus: 'CLEAN', document: null, lastError: null }
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'OPEN':
      return { status: 'VIEWING', saveStatus: 'CLEAN', document: action.document, lastError: null }

    case 'START_EDIT':
      if (state.status !== 'VIEWING' || !state.document) return state
      return { ...state, status: 'EDITING' }

    case 'EDIT_CHANGE':
      if (state.status !== 'EDITING') return state
      return { ...state, saveStatus: 'DIRTY' }

    case 'SAVE_START':
      // Only a legal transition while actively editing a dirty document —
      // matches the checklist's "never silently triggers a save mid-nothing"
      // framing; an illegal call is a no-op, not a broken intermediate state.
      if (state.status !== 'EDITING' || state.saveStatus !== 'DIRTY') return state
      return { ...state, status: 'SAVING', saveStatus: 'SAVING' }

    case 'SAVE_SUCCESS':
      if (state.status !== 'SAVING') return state
      return { ...state, status: 'EDITING', saveStatus: 'SAVED', lastError: null }

    case 'SAVE_ERROR':
      if (state.status !== 'SAVING') return state
      return { ...state, status: 'SAVE_FAILED', saveStatus: 'FAILED', lastError: action.error }

    case 'BACK_TO_PREVIEW':
      // checklist §3: "back to preview" from a *failed* save also routes
      // through the abandon prompt at the UI layer (Phase 4.4) — the state
      // machine itself just needs to allow returning to VIEWING from either
      // EDITING or SAVE_FAILED.
      if (state.status !== 'EDITING' && state.status !== 'SAVE_FAILED') return state
      return { ...state, status: 'VIEWING' }

    case 'CLOSE':
      return createInitialSession()

    default:
      return state
  }
}
