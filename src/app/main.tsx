import { createRoot } from 'react-dom/client'
import { cloneElement, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ThemeProvider } from '../theme/ThemeProvider'
import { MarkdownRoot } from '../components/MarkdownRoot'
import { useStreamingMarkdown } from '../hooks/useStreamingMarkdown'
import { RouteContext, createInitialRoute, routeReducer } from './routing'
import type { Route } from './routing'
import { createInitialSession, sessionReducer } from './session/documentSession'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { HelpScreen } from './screens/HelpScreen'
import { AboutScreen } from './screens/AboutScreen'
import { PrivacyScreen } from './screens/PrivacyScreen'
import { Drawer } from './Drawer'
import { ReaderHeader } from './ReaderHeader'
import { FormattingToolbar } from './FormattingToolbar'
import { openDocument, openDocumentAtPath, saveDocument, saveDocumentAs } from './document/fileIO'
import { createAutosave } from './document/autosave'
import { createDraftBuffer } from './document/draftStore'
import { getRecentFiles, addRecentFile } from './document/recentFiles'
import { onOpenFileFromOS, onWindowFileDrop } from './document/tauriEvents'
import { DEFAULT_TEXT_SCALE, type TextScaleStep } from '../theme/tokens/textScale'
import { AbandonDraftDialog } from './AbandonDraftDialog'
import { TocDialog } from './TocDialog'
import { SearchBar } from './SearchBar'
import { Toaster, useToast } from './ui/Toast'
import { useGlobalShortcuts } from './useGlobalShortcuts'

// A short, hand-written sample (not a bench/corpus/ fixture — those are
// synthetic benchmark filler, not fit for a first impression) that exercises
// headings, a list, a fenced code block, a table, and a link, so the reader
// visibly demonstrates the default component map on first load.
const SAMPLE_MD = `# claymark

A Markdown renderer built for **streamed, untrusted LLM output**.

## What it renders

- CommonMark + GFM (tables, task lists, strikethrough)
- Syntax-highlighted code
- Math and Mermaid diagrams

\`\`\`typescript
import { processor, toReact } from 'claymark'

const tree = processor.parse(source)
const hast = await processor.run(tree)
\`\`\`

| Feature | Status |
| --- | --- |
| Streaming | ✅ |
| Sanitization | ✅ |
| Theming | ✅ |

Try replacing this text in the box below — see [\`docs/API.md\`](https://github.com/vchhikara/Claymark) for the full surface.
`

const AUTOSAVE_STORAGE_KEY = 'claymark-autosave-enabled'

function getStoredAutosaveEnabled(): boolean {
  try {
    return window.localStorage.getItem(AUTOSAVE_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

// Phase 3 app shell: routing (welcome/reader/settings/help/about/privacy),
// the document session state machine (Phase 2.2), open/save/autosave/draft
// mechanisms (Phase 2.3/2.4/2.5), the Drawer, and the Reader/Edit header —
// wired into the single-view demo shell that main.tsx used to be.
function App() {
  const [route, dispatchRoute] = useReducer(routeReducer, undefined, createInitialRoute)
  const [session, dispatchSession] = useReducer(sessionReducer, undefined, createInitialSession)
  const [source, setSource] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [autosaveEnabled, setAutosaveEnabled] = useState(getStoredAutosaveEnabled)
  const [textScale, setTextScale] = useState<TextScaleStep>(DEFAULT_TEXT_SCALE)
  const [recentFiles, setRecentFiles] = useState(() => getRecentFiles())
  const [tocOpen, setTocOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [pendingAbandonAction, setPendingAbandonAction] = useState<(() => void) | null>(null)
  const { elements } = useStreamingMarkdown(source)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const draftRef = useRef<ReturnType<typeof createDraftBuffer> | null>(null)
  const autosaveRef = useRef<ReturnType<typeof createAutosave> | null>(null)
  // Last-known-saved content, so Discard can revert the in-memory source
  // instead of just navigating past it with the edit still applied.
  const lastCommittedSourceRef = useRef('')
  // Mirrors `source` outside React's render cycle so callbacks captured in
  // effects (e.g. autosave's onSaved) can read the current value instead of
  // a stale closure over the source at effect-creation time.
  const sourceRef = useRef('')
  const { success: toastSuccess } = useToast()

  const routeContextValue = useMemo(
    () => ({
      route,
      navigate: (to: Route) => dispatchRoute({ type: 'NAVIGATE', to }),
      // routeReducer's BACK always lands sub-screens on 'reader' (its
      // documented, tested contract) — but a sub-screen reached from the
      // Welcome-screen drawer (no document loaded) has no reader to return
      // to. Redirect to 'welcome' in that case instead of landing on an
      // empty reader.
      back: () => {
        const isSubScreen = route !== 'welcome' && route !== 'reader'
        if (isSubScreen && !session.document) {
          dispatchRoute({ type: 'NAVIGATE', to: 'welcome' })
        } else {
          dispatchRoute({ type: 'BACK' })
        }
      },
    }),
    [route, session.document]
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, String(autosaveEnabled))
    } catch {
      // no-op: private-browsing/storage-blocked environments
    }
  }, [autosaveEnabled])

  // Autosave: recreated whenever its inputs change so it always closes over
  // the current path/writable/enabled state, per Phase 2.4's contract.
  useEffect(() => {
    if (!session.document) {
      autosaveRef.current = null
      return
    }
    const autosave = createAutosave({
      path: session.document.id,
      enabled: autosaveEnabled,
      writable: session.document.writable && !session.document.readOnly,
      onSaved: () => {
        lastCommittedSourceRef.current = sourceRef.current
        dispatchSession({ type: 'SAVE_SUCCESS' })
        toastSuccess('Autosaved')
      },
    })
    autosaveRef.current = autosave
    return () => autosave.dispose()
  }, [session.document, autosaveEnabled])

  // Crash-recovery draft buffer: independent of autosave, keyed by document id.
  useEffect(() => {
    if (!session.document) {
      draftRef.current = null
      return
    }
    const buffer = createDraftBuffer(session.document.id, source)
    draftRef.current = buffer
    return () => buffer.dispose()
  }, [session.document?.id])

  const applyLoadedDocument = (loaded: {
    path: string
    name: string
    content: string
    writable: boolean
    readOnly: boolean
  }): void => {
    setSource(loaded.content)
    sourceRef.current = loaded.content
    lastCommittedSourceRef.current = loaded.content
    dispatchSession({
      type: 'OPEN',
      document: { id: loaded.path, name: loaded.name, writable: loaded.writable, readOnly: loaded.readOnly },
    })
    if (!loaded.readOnly) {
      addRecentFile({ path: loaded.path, name: loaded.name })
      setRecentFiles(getRecentFiles())
    }
    dispatchRoute({ type: 'NAVIGATE', to: 'reader' })
  }

  const isDirty = session.saveStatus === 'DIRTY' || session.saveStatus === 'FAILED'

  // checklist §3/§5: Back-while-dirty, Open-while-dirty, and Back-to-
  // preview-from-failed-save all route through the abandon-draft dialog
  // rather than silently discarding — dirty documents never lose data
  // without an explicit confirmation.
  const guardIfDirty = (action: () => void): void => {
    if (isDirty) {
      setPendingAbandonAction(() => action)
    } else {
      action()
    }
  }

  const handleOpenFile = async (): Promise<void> => {
    const loaded = await openDocument()
    if (!loaded) return
    applyLoadedDocument(loaded)
  }

  const handleOpenRecent = async (path: string): Promise<void> => {
    const loaded = await openDocumentAtPath(path, false)
    applyLoadedDocument(loaded)
  }

  const handleOpenAtPath = async (path: string, readOnly: boolean): Promise<void> => {
    const loaded = await openDocumentAtPath(path, readOnly)
    applyLoadedDocument(loaded)
  }

  // Phase 5.1: OS "open with" launch — always read-only per checklist §3
  // (a transient external-launch grant, not one the app can trust to
  // reopen after restart).
  useEffect(() => {
    return onOpenFileFromOS((path) => guardIfDirty(() => void handleOpenAtPath(path, true)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])

  // Phase 5.2: window-wide drag-and-drop, replacing the old textarea-scoped
  // FileReader approach — a real file path from Tauri, routed through the
  // same fileIO.ts open path as the picker/recent-files/OS-launch so it
  // participates in the session/MRU/draft system correctly.
  useEffect(() => {
    return onWindowFileDrop((path) => guardIfDirty(() => void handleOpenAtPath(path, false)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])

  // Phase 5.3: pasting into the page (not into an already-focused editor
  // field) creates a new, unsaved, no-writable-handle document — distinct
  // from a normal in-editor paste, which this deliberately does not touch.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return
      const text = event.clipboardData?.getData('text/plain')
      if (!text) return
      guardIfDirty(() => {
        setSource(text)
        sourceRef.current = text
        lastCommittedSourceRef.current = text
        dispatchSession({ type: 'OPEN', document: { id: 'pasted', name: 'Pasted document', writable: false } })
        dispatchRoute({ type: 'NAVIGATE', to: 'reader' })
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])

  const handleSave = async (): Promise<void> => {
    if (!session.document) return
    dispatchSession({ type: 'SAVE_START' })
    try {
      await saveDocument(session.document.id, source)
      lastCommittedSourceRef.current = source
      dispatchSession({ type: 'SAVE_SUCCESS' })
    } catch (err) {
      dispatchSession({ type: 'SAVE_ERROR', error: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleSaveAs = async (): Promise<void> => {
    const result = await saveDocumentAs(session.document?.name, source)
    if (!result) return
    lastCommittedSourceRef.current = source
    dispatchSession({
      type: 'OPEN',
      document: { id: result.path, name: result.name, writable: true },
    })
    addRecentFile({ path: result.path, name: result.name })
    setRecentFiles(getRecentFiles())
  }

  const handleSourceChange = (value: string): void => {
    setSource(value)
    sourceRef.current = value
    dispatchSession({ type: 'EDIT_CHANGE' })
    draftRef.current?.onChange(value)
    autosaveRef.current?.onChange(value)
  }

  useGlobalShortcuts({
    onFind: () => setSearchOpen(true),
    onSave: () => {
      if (session.status === 'EDITING' && session.document?.writable) void handleSave()
    },
    onToggleEdit: () => {
      if (session.status === 'VIEWING') dispatchSession({ type: 'START_EDIT' })
      else if (session.status === 'EDITING') guardIfDirty(() => dispatchSession({ type: 'BACK_TO_PREVIEW' }))
    },
  })

  return (
    <RouteContext.Provider value={routeContextValue}>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        recentFiles={recentFiles}
        onOpenRecent={(path) => {
          setDrawerOpen(false)
          guardIfDirty(() => void handleOpenRecent(path))
        }}
      />

      <AbandonDraftDialog
        open={pendingAbandonAction !== null}
        onCancel={() => setPendingAbandonAction(null)}
        onDiscard={() => {
          setSource(lastCommittedSourceRef.current)
          sourceRef.current = lastCommittedSourceRef.current
          pendingAbandonAction?.()
          setPendingAbandonAction(null)
        }}
        onSave={() => {
          void handleSave().then(() => {
            pendingAbandonAction?.()
            setPendingAbandonAction(null)
          })
        }}
      />

      <TocDialog
        open={tocOpen}
        onOpenChange={setTocOpen}
        source={source}
        onJumpToLine={() => {
          // Line-precise scroll requires a source-to-DOM line map the
          // streaming renderer doesn't expose yet — jumping opens the
          // outline entry's screen context (reader) as a first step.
        }}
      />

      {route === 'welcome' && (
        <WelcomeScreen
          onOpenFile={() => guardIfDirty(() => void handleOpenFile())}
          onOpenDrawer={() => setDrawerOpen(true)}
          sampleMarkdown={SAMPLE_MD}
          onLoadSample={(markdown) => {
            setSource(markdown)
            sourceRef.current = markdown
            lastCommittedSourceRef.current = markdown
            dispatchSession({ type: 'OPEN', document: { id: 'sample', name: 'Sample', writable: false, readOnly: true } })
          }}
        />
      )}

      {route === 'reader' && (
        <div
          style={{
            padding: 'var(--space-6) var(--space-5)',
            boxSizing: 'border-box',
          }}
        >
          <ReaderHeader
            editing={session.status === 'EDITING' || session.status === 'SAVING' || session.status === 'SAVE_FAILED'}
            fileName={session.document?.name ?? null}
            writable={Boolean(session.document?.writable) && !session.document?.readOnly}
            saveStatus={session.saveStatus}
            onOpenDrawer={() => setDrawerOpen(true)}
            onEdit={() => dispatchSession({ type: 'START_EDIT' })}
            onBackToPreview={() => guardIfDirty(() => dispatchSession({ type: 'BACK_TO_PREVIEW' }))}
            onSave={() => void handleSave()}
            onSaveAs={() => void handleSaveAs()}
          />

          <div style={{ maxWidth: 'var(--measure)', margin: '0 auto' }}>
            {searchOpen && (
              <SearchBar
                source={source}
                editing={session.status === 'EDITING'}
                onClose={() => setSearchOpen(false)}
                onReplace={(next) => handleSourceChange(next)}
              />
            )}

            {(session.status === 'EDITING' || session.status === 'SAVING' || session.status === 'SAVE_FAILED') && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
                  <button
                    type="button"
                    data-testid="open-outline"
                    onClick={() => setTocOpen(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'hsl(var(--text-muted))' }}
                  >
                    Outline
                  </button>
                </div>
                <FormattingToolbar textareaRef={textareaRef} onChange={handleSourceChange} />
                <textarea
                  ref={textareaRef}
                  aria-label="Markdown source"
                  className="pb-clay-inset cm-source-textarea"
                  value={source}
                  onChange={(event) => handleSourceChange(event.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '12rem',
                    marginBottom: 'var(--space-6)',
                    font: 'var(--text-code)/1.5 var(--font-mono)',
                    boxSizing: 'border-box',
                    background: 'hsl(var(--surface-raised))',
                    color: 'hsl(var(--text-primary))',
                    border: '1px solid hsl(var(--border-subtle))',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3)',
                    resize: 'vertical',
                  }}
                />
              </>
            )}

            <MarkdownRoot>
              {
                // FR-3.3 monotonicity means a block's position is stable once
                // emitted, so an index key is safe here — only the trailing
                // (still-open) block's element is ever replaced in place.
                elements.map((element, index) => cloneElement(element, { key: index }))
              }
            </MarkdownRoot>
          </div>
        </div>
      )}

      {route === 'settings' && (
        <SettingsScreen
          autosaveEnabled={autosaveEnabled}
          onAutosaveChange={setAutosaveEnabled}
          textScale={textScale}
          onTextScaleChange={setTextScale}
          onOpenThemePicker={() => {
            // Phase 4.3: real Theme Picker dialog. For now the existing
            // ThemeToggle mechanism (light/dark persistence) already works;
            // this row is a placeholder hook-up point.
          }}
        />
      )}

      {route === 'help' && <HelpScreen />}
      {route === 'about' && <AboutScreen />}
      {route === 'privacy' && <PrivacyScreen />}
    </RouteContext.Provider>
  )
}

function Root() {
  return (
    <ThemeProvider>
      <Toaster>
        <App />
      </Toaster>
    </ThemeProvider>
  )
}

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(<Root />)
}

// T-P9-02: register the offline service worker (built only for the
// `app`-mode demo build — see vite.config.ts's second rollup input).
// Registration is safe to attempt in dev too: the fetch fails harmlessly
// (404 on /sw.js under the library's dev server) and is swallowed below.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // no-op: absent under `vite dev`/lib-mode builds where sw.js isn't emitted
    })
  })
}
