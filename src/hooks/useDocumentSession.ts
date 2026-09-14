import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createDocumentBackend } from '../documents/document-service'
import { draftStore } from '../documents/draft-store'
import type { DocumentRef, PersistAction } from '../documents/types'

// P0/P1 reader-shell state machine — progress.md "Reader-shell backlog".
// Deliberately a plain reducer-by-hand (not a literal discriminated-union
// switch) kept small enough to read as one hook; the invalid-combination
// guard the audit's §88 wants (no saving+no-document at once) comes from
// `mode` being the single source of truth every action funnels through.

export type SessionMode =
  | 'no-document'
  | 'viewing'
  | 'editing'
  | 'saving'
  | 'save-failed'

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

// A pending action queued behind an unsaved-changes confirmation (audit
// §19/§22): Back, Open file, and (future) an incoming associated file all
// resolve through the same Save/Discard/Cancel prompt.
interface PendingAbandon {
  reason: 'back' | 'open-file'
}

export interface DocumentSessionState {
  mode: SessionMode
  ref: DocumentRef | null
  text: string
  saveStatus: SaveStatus
  saveError: string | null
  pendingAbandon: PendingAbandon | null
  persistAction: PersistAction | null
  recoveredDraft: boolean
}

const DRAFT_DEBOUNCE_MS = 700

export interface UseDocumentSessionResult extends DocumentSessionState {
  openFile: () => Promise<void>
  startEdit: () => void
  backToPreview: () => void
  updateText: (text: string) => void
  save: () => Promise<void>
  saveAs: () => Promise<void>
  downloadCopy: () => Promise<void>
  resolveAbandon: (choice: 'save' | 'discard' | 'cancel') => Promise<void>
  discardRecoveredDraft: () => void
}

export function useDocumentSession(): UseDocumentSessionResult {
  const [state, setState] = useState<DocumentSessionState>({
    mode: 'no-document',
    ref: null,
    text: '',
    saveStatus: 'clean',
    saveError: null,
    pendingAbandon: null,
    persistAction: null,
    recoveredDraft: false,
  })

  // The persisted (last-known-saved) text — dirty = text !== persistedText.
  // Kept in a ref (not state) because it's an implementation detail the
  // draft-debounce/effects read synchronously, not something the UI renders.
  const persistedTextRef = useRef('')
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushDraft = useCallback((ref: DocumentRef, text: string) => {
    if (text === persistedTextRef.current) {
      // Back to the last saved state — no draft needed, and an old one
      // would otherwise wrongly survive as "recoverable".
      draftStore.remove(ref.id)
      return
    }
    draftStore.put({
      documentId: ref.id,
      displayName: ref.name,
      text,
      draftModifiedAt: Date.now(),
    })
  }, [])

  const scheduleDraftFlush = useCallback(
    (ref: DocumentRef, text: string) => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => flushDraft(ref, text), DRAFT_DEBOUNCE_MS)
    },
    [flushDraft],
  )

  // Flush immediately (no debounce) on the moments the audit calls out as
  // must-not-lose points: tab hidden, and unmount.
  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState !== 'hidden') return
      if (state.ref && state.text !== persistedTextRef.current) flushDraft(state.ref, state.text)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [state.ref, state.text, flushDraft])

  const applyOpenedDoc = useCallback(
    async (ref: DocumentRef, text: string) => {
      const backend = await createDocumentBackend()
      persistedTextRef.current = text
      const existingDraft = draftStore.get(ref.id)
      const recovered = existingDraft !== null && existingDraft.text !== text
      setState({
        mode: 'viewing',
        ref,
        text: recovered ? existingDraft!.text : text,
        saveStatus: recovered ? 'dirty' : 'clean',
        saveError: null,
        pendingAbandon: null,
        persistAction: backend.persistAction(ref),
        recoveredDraft: recovered,
      })
    },
    [],
  )

  // The actual file-picker + load — no dirty gate. Called directly by
  // `openFile` once it's established the buffer is clean, and by
  // `resolveAbandon` once the user has already resolved the unsaved-changes
  // prompt (so re-checking `state` there, which is still the stale dirty
  // snapshot from before that resolution applied, would wrongly re-gate it).
  const performOpen = useCallback(async () => {
    const backend = await createDocumentBackend()
    const snapshot = await backend.openFile()
    if (!snapshot) return
    await applyOpenedDoc(snapshot.ref, snapshot.text)
  }, [applyOpenedDoc])

  const openFile = useCallback(async () => {
    if (state.mode === 'editing' && state.saveStatus === 'dirty') {
      setState((s) => ({ ...s, pendingAbandon: { reason: 'open-file' } }))
      return // resolveAbandon calls performOpen() directly once the user decides
    }
    await performOpen()
  }, [performOpen, state.mode, state.saveStatus])

  const startEdit = useCallback(() => {
    setState((s) => (s.mode === 'viewing' ? { ...s, mode: 'editing' } : s))
  }, [])

  const backToPreview = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'editing') return s
      if (s.saveStatus === 'dirty') return { ...s, pendingAbandon: { reason: 'back' } }
      return { ...s, mode: 'viewing' }
    })
  }, [])

  const updateText = useCallback(
    (text: string) => {
      setState((s) => {
        if (s.mode !== 'editing' || !s.ref) return s
        scheduleDraftFlush(s.ref, text)
        return { ...s, text, saveStatus: text === persistedTextRef.current ? 'clean' : 'dirty' }
      })
    },
    [scheduleDraftFlush],
  )

  const doSave = useCallback(async (ref: DocumentRef, text: string, mode: 'save' | 'save-as') => {
    const backend = await createDocumentBackend()
    setState((s) => (s.ref?.id === ref.id ? { ...s, mode: 'saving', saveStatus: 'saving', saveError: null } : s))
    try {
      let nextRef = ref
      if (mode === 'save-as' || (mode === 'save' && backend.persistAction(ref) === 'save-as')) {
        const created = await backend.saveAs(ref, text)
        if (!created) {
          // User cancelled the Save-as dialog — return to editing, buffer intact.
          setState((s) => (s.ref?.id === ref.id ? { ...s, mode: 'editing', saveStatus: 'dirty' } : s))
          return
        }
        nextRef = created
      } else {
        await backend.save(ref, text)
      }
      // Save-race guard (audit §90): only clear dirty if the buffer hasn't
      // moved past the snapshot we just persisted.
      persistedTextRef.current = text
      draftStore.remove(ref.id)
      setState((s) => ({
        ...s,
        mode: 'viewing',
        ref: nextRef,
        saveStatus: s.text === text ? 'saved' : 'dirty',
        persistAction: backend.persistAction(nextRef),
      }))
    } catch (error) {
      setState((s) =>
        s.ref?.id === ref.id
          ? { ...s, mode: 'save-failed', saveStatus: 'failed', saveError: error instanceof Error ? error.message : String(error) }
          : s,
      )
    }
  }, [])

  const save = useCallback(async () => {
    if (!state.ref) return
    await doSave(state.ref, state.text, 'save')
  }, [doSave, state.ref, state.text])

  const saveAs = useCallback(async () => {
    if (!state.ref) return
    await doSave(state.ref, state.text, 'save-as')
  }, [doSave, state.ref, state.text])

  const downloadCopy = useCallback(async () => {
    if (!state.ref) return
    const backend = await createDocumentBackend()
    await backend.downloadCopy(state.ref, state.text)
    // A download isn't an in-place save (the buffer still differs from any
    // file on disk, so it stays dirty) — but it does resolve a prior
    // save-failed state, since a copy of the current text now exists.
    setState((s) => (s.mode === 'save-failed' ? { ...s, mode: 'editing', saveStatus: 'dirty', saveError: null } : s))
  }, [state.ref, state.text])

  const resolveAbandon = useCallback(
    async (choice: 'save' | 'discard' | 'cancel') => {
      const pending = state.pendingAbandon
      if (!pending || !state.ref) return
      if (choice === 'cancel') {
        setState((s) => ({ ...s, pendingAbandon: null }))
        return
      }
      if (choice === 'discard') {
        draftStore.remove(state.ref.id) // buffer reverts to persistedTextRef.current, already the last-saved text
        setState((s) =>
          s.ref
            ? { ...s, text: persistedTextRef.current, saveStatus: 'clean', pendingAbandon: null, mode: pending.reason === 'back' ? 'viewing' : s.mode }
            : s,
        )
        if (pending.reason === 'open-file') await performOpen()
        return
      }
      // choice === 'save'
      await doSave(state.ref, state.text, 'save')
      setState((s) => ({ ...s, pendingAbandon: null, mode: pending.reason === 'back' ? 'viewing' : s.mode }))
      if (pending.reason === 'open-file') await performOpen()
    },
    [doSave, performOpen, state.pendingAbandon, state.ref, state.text],
  )

  const discardRecoveredDraft = useCallback(() => {
    setState((s) => {
      if (!s.ref) return s
      draftStore.remove(s.ref.id)
      return { ...s, text: persistedTextRef.current, saveStatus: 'clean', recoveredDraft: false }
    })
  }, [])

  return useMemo(
    () => ({
      ...state,
      openFile,
      startEdit,
      backToPreview,
      updateText,
      save,
      saveAs,
      downloadCopy,
      resolveAbandon,
      discardRecoveredDraft,
    }),
    [state, openFile, startEdit, backToPreview, updateText, save, saveAs, downloadCopy, resolveAbandon, discardRecoveredDraft],
  )
}
