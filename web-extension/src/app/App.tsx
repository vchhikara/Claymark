import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownRoot, useMarkdown } from '../engine/render'
import { ThemeContext } from '../engine/theme-context'
import { collectHeadings } from '../engine/toc'
import type { OutlineEntry } from '../engine/pipeline'
import { usePrefs, useSystemDark, TEXT_STEPS, type ThemePref } from './store/prefs'
import {
  type Doc, type RecentEntry, type Draft, uid, pickFile, docFromHandle, docFromFile, saveInPlace, saveAs,
  listRecent, touchRecent, openRecent, clearRecent, saveDraft, loadDraft, clearDraft, isMarkdownName,
} from './store/files'
import { Logo } from './ui/Logo'
import { Drawer } from './ui/Drawer'
import { SearchBar } from './ui/SearchBar'
import { PortedButton } from './ui/pb/button'
import { PortedBadge } from './ui/pb/badge'
import { Menu, ArrowLeft, ExternalLink, ListTree, Pencil, Bold, Italic, Code2, List, Link2, ArrowUp, Minus, Plus } from 'lucide-react'
import sampleMd from './content/sample.md?raw'
import helpMd from './content/help.md?raw'
import aboutMd from './content/about.md?raw'
import privacyMd from './content/privacy.md?raw'

// Lazy: Dialog pulls in Radix's focus-trap/dismissable-layer machinery, only
// needed once the user opens one (outline/theme/discard/draft-restore) —
// keeps that weight out of the initial bundle.
const Dialog = lazy(() => import('./ui/Dialog').then((m) => ({ default: m.Dialog })))

declare const chrome: any
type View = 'welcome' | 'reader' | 'settings' | 'help' | 'about' | 'privacy'
const PAGES = { help: helpMd, about: aboutMd, privacy: privacyMd } as const
const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

/* ------------------------------------------------------------------ */
export function App({ popup = false }: { popup?: boolean } = {}) {
  const [prefs, setPref] = usePrefs()
  const systemDark = useSystemDark()
  const effective: 'light' | 'dark' = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme

  const [view, setView] = useState<View>('welcome')
  const [returnTo, setReturnTo] = useState<View>('welcome')
  const [doc, setDoc] = useState<Doc | null>(null)
  const [editing, setEditing] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState(false)
  const [outline, setOutline] = useState(false)
  const [themeDlg, setThemeDlg] = useState(false)
  const [pending, setPending] = useState<null | (() => void)>(null)
  const [draftOffer, setDraftOffer] = useState<Draft | null>(null)
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [toast, setToast] = useState<{ msg: string; kind?: 'error' } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showTop, setShowTop] = useState(false)

  const docRef = useRef(doc)
  docRef.current = doc
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const articleRef = useRef<HTMLDivElement>(null)
  const dirty = !!doc && doc.content !== doc.savedContent

  /* ---- theme onto <html> (FR-5.3) ---- */
  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = effective
    el.dataset.amoled = String(prefs.amoled)
    el.style.setProperty('--text-scale', String(prefs.textScale))
    el.style.colorScheme = effective
  }, [effective, prefs.amoled, prefs.textScale])

  const notify = useCallback((msg: string, kind?: 'error') => {
    setToast({ msg, kind })
    setTimeout(() => setToast((t) => (t?.msg === msg ? null : t)), kind ? 5000 : 2200)
  }, [])

  const refreshRecent = useCallback(() => listRecent().then(setRecent), [])
  useEffect(() => {
    refreshRecent()
  }, [refreshRecent])

  /* ---- open a document ---- */
  const show = useCallback(
    (d: Doc, edit = false) => {
      setDoc(d)
      setEditing(edit)
      setView('reader')
      setDrawer(false)
      setSearch(false)
      window.scrollTo(0, 0)
      if (d.kind === 'file' || d.kind === 'selection') touchRecent(d).then(refreshRecent)
    },
    [refreshRecent],
  )

  /** Run `action` now, or after the discard/save dialog if there are unsaved edits. */
  const guard = useCallback((action: () => void) => {
    const d = docRef.current
    if (d && d.content !== d.savedContent) setPending(() => action)
    else action()
  }, [])

  const openFile = useCallback(
    () =>
      guard(async () => {
        try {
          const d = await pickFile()
          if (d) show(d)
        } catch (e: any) {
          notify(`Couldn't open file: ${e?.message ?? e}`, 'error')
        }
      }),
    [guard, show, notify],
  )
  const openSample = () =>
    guard(() => show({ id: 'sample', name: 'Sample', content: sampleMd, savedContent: sampleMd, kind: 'sample' }))
  const newDoc = () => guard(() => show({ id: uid(), name: 'Untitled', content: '', savedContent: '', kind: 'new' }, true))
  const openRecentEntry = (r: RecentEntry) =>
    guard(async () => {
      try {
        const d = await openRecent(r)
        show(d)
        if (d.kind === 'snapshot') notify('Opened the saved copy — the original file is unavailable.')
      } catch (e: any) {
        notify(`Couldn't open: ${e?.message ?? e}`, 'error')
      }
    })

  /* ---- save ---- */
  const markSaved = (content: string, patch: Partial<Doc> = {}) =>
    setDoc((d) => (d ? { ...d, ...patch, savedContent: content } : d))

  const save = useCallback(
    async (forceAs = false): Promise<boolean> => {
      const d = docRef.current
      if (!d) return false
      try {
        if (!forceAs && d.handle && (await saveInPlace(d))) {
          markSaved(d.content)
          clearDraft()
          touchRecent({ ...d, savedContent: d.content }).then(refreshRecent)
          notify('Saved')
          return true
        }
        const r = await saveAs(d)
        if (!r) return false
        if (r === 'downloaded') {
          markSaved(d.content)
          notify('Downloaded to your Downloads folder')
        } else {
          const next = { ...d, handle: r, name: r.name, kind: 'file' as const, savedContent: d.content }
          setDoc((cur) => (cur ? { ...cur, handle: r, name: r.name, kind: 'file', savedContent: d.content } : cur))
          touchRecent(next).then(refreshRecent)
          notify(`Saved as ${r.name}`)
        }
        clearDraft()
        return true
      } catch (e: any) {
        notify(`Couldn't save: ${e?.message ?? e}`, 'error')
        return false
      }
    },
    [notify, refreshRecent],
  )

  /* ---- autosave + crash-recovery draft ---- */
  useEffect(() => {
    if (!doc || !dirty) return
    const t = setTimeout(async () => {
      if (prefs.autosave && doc.handle) {
        try {
          if (await saveInPlace(doc, false)) {
            markSaved(doc.content)
            clearDraft()
            return
          }
        } catch {}
      }
      saveDraft({ docId: doc.id, name: doc.name, content: doc.content, savedAt: Date.now(), kind: doc.kind })
    }, 1200)
    return () => clearTimeout(t)
  }, [doc?.content, dirty, prefs.autosave])

  useEffect(() => {
    loadDraft().then((d) => d && d.content && setDraftOffer(d))
  }, [])

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      const d = docRef.current
      if (d && d.content !== d.savedContent) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  /* ---- selection hand-off from the context menu ---- */
  const loadSelection = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) return
    const got = await chrome.storage.session.get('claymark:selection')
    const sel = got?.['claymark:selection']
    if (!sel?.text) return
    await chrome.storage.session.remove('claymark:selection')
    const name = sel.title ? `Selection — ${String(sel.title).slice(0, 60)}` : 'Selection'
    guard(() => show({ id: uid(), name, content: sel.text, savedContent: sel.text, kind: 'selection' }))
  }, [guard, show])

  useEffect(() => {
    if (new URLSearchParams(location.search).has('selection')) {
      history.replaceState(null, '', location.pathname)
      loadSelection()
    }
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return
    const on = (m: any) => m?.type === 'claymark:selection' && loadSelection()
    chrome.runtime.onMessage.addListener(on)
    return () => chrome.runtime.onMessage.removeListener(on)
  }, [loadSelection])

  /* ---- drag & drop ---- */
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setDragging(true) } }
    const leave = (e: DragEvent) => { if (hasFiles(e) && --depth <= 0) { depth = 0; setDragging(false) } }
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault() }
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const item = e.dataTransfer?.items?.[0]
      const file = e.dataTransfer?.files?.[0]
      if (!item || !file) return
      if (!isMarkdownName(file.name) && !file.type.startsWith('text/')) {
        notify('Only Markdown or text files can be opened.', 'error')
        return
      }
      const handleP = (item as any).getAsFileSystemHandle?.() as Promise<FileSystemFileHandle> | undefined
      guard(async () => {
        try {
          const h = await handleP
          show(h && h.kind === 'file' ? await docFromHandle(h) : await docFromFile(file))
        } catch (err: any) {
          notify(`Couldn't open file: ${err?.message ?? err}`, 'error')
        }
      })
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [guard, show, notify])

  /* ---- scroll-to-top ---- */
  useEffect(() => {
    const on = () => setShowTop(window.scrollY > 700)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  /* ---- document title ---- */
  useEffect(() => {
    const base = view === 'reader' && doc ? `${dirty ? '• ' : ''}${doc.name}` : view === 'welcome' ? '' : view[0]!.toUpperCase() + view.slice(1)
    document.title = base ? `${base} — Claymark` : 'Claymark'
  }, [view, doc?.name, dirty])

  /* ---- leaving edit mode ---- */
  const exitEdit = () => {
    const d = docRef.current
    if (d && d.content !== d.savedContent) setPending(() => () => setEditing(false))
    else setEditing(false)
  }
  const goBackFromReader = () => guard(() => { setDoc(null); setEditing(false); setView('welcome') })

  /** Pop out of the popup into the full-tab surface. Recent files/prefs are
   *  shared storage, so the tab picks up where the popup left off even
   *  though the in-memory document itself doesn't travel with it. */
  const openInTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('app.html') })
      window.close()
    } else {
      window.open('app.html', '_blank')
    }
  }

  const nav = (v: 'settings' | 'help' | 'about' | 'privacy') => {
    setReturnTo(view === 'reader' || view === 'welcome' ? view : returnTo)
    setView(v)
    setDrawer(false)
    setSearch(false)
    window.scrollTo(0, 0)
  }

  /* ---- keyboard (FR-5.4) ---- */
  const keyState = useRef({ view, doc, editing, dialog: false })
  keyState.current = { view, doc, editing, dialog: !!pending || outline || themeDlg || !!draftOffer }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey
      const k = e.key.toLowerCase()
      const st = keyState.current
      if (st.dialog) return
      if (mod && k === 'o') { e.preventDefault(); openFile() }
      else if (mod && k === 's' && st.doc) { e.preventDefault(); save(e.shiftKey) }
      else if (mod && k === 'e' && st.doc && st.view === 'reader') { e.preventDefault(); st.editing ? exitEdit() : setEditing(true) }
      else if (mod && k === 'f' && st.doc && st.view === 'reader') { e.preventDefault(); setSearch(true) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [openFile, save])

  /* ---- editor helpers ---- */
  const setContent = (content: string) => setDoc((d) => (d ? { ...d, content } : d))

  const format = (kind: 'bold' | 'italic' | 'code' | 'list' | 'link') => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e)
    let insert = sel
    let selFrom = 0
    let selTo = 0
    if (kind === 'bold' || kind === 'italic') {
      const m = kind === 'bold' ? '**' : '*'
      const body = sel || (kind === 'bold' ? 'bold text' : 'italic text')
      insert = m + body + m
      selFrom = m.length
      selTo = m.length + body.length
    } else if (kind === 'code') {
      if (sel.includes('\n')) {
        insert = '```\n' + sel + '\n```'
        selFrom = 4
        selTo = 4 + sel.length
      } else {
        const body = sel || 'code'
        insert = '`' + body + '`'
        selFrom = 1
        selTo = 1 + body.length
      }
    } else if (kind === 'list') {
      const lineStart = value.lastIndexOf('\n', s - 1) + 1
      const block = value.slice(lineStart, e)
      const lines = block.split('\n')
      const allListed = lines.every((l) => /^\s*[-*+] /.test(l))
      const out = lines.map((l) => (allListed ? l.replace(/^(\s*)[-*+] /, '$1') : '- ' + l)).join('\n')
      ta.setSelectionRange(lineStart, e)
      document.execCommand('insertText', false, out)
      setContent(ta.value)
      return
    } else if (kind === 'link') {
      const text = sel || 'link text'
      insert = `[${text}](https://)`
      selFrom = text.length + 3
      selTo = selFrom + 8
    }
    // execCommand keeps the native undo stack intact.
    if (!document.execCommand('insertText', false, insert)) {
      ta.setRangeText(insert, s, e, 'end')
    }
    ta.setSelectionRange(s + selFrom, s + selTo)
    setContent(ta.value)
  }

  const onEditorKey = (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = isMac ? ev.metaKey : ev.ctrlKey
    if (!mod) return
    const k = ev.key.toLowerCase()
    if (k === 'b') { ev.preventDefault(); format('bold') }
    else if (k === 'i') { ev.preventDefault(); format('italic') }
    else if (k === 'k') { ev.preventDefault(); format('link') }
  }

  /* ---- outline jump ---- */
  const jumpTo = (entry: OutlineEntry, index: number) => {
    setOutline(false)
    requestAnimationFrame(() => {
      document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const ta = textareaRef.current
      const d = docRef.current
      if (editing && ta && d) {
        // Map the heading to its source line (ATX walker, toc.ts) when counts agree.
        const atx = collectHeadings(d.content)
        const hit = atx[index]
        if (hit && hit.text.replace(/[*_`]/g, '') .trim().startsWith(entry.text.slice(0, 8))) {
          const offset = d.content.split('\n').slice(0, hit.line).join('\n').length + (hit.line ? 1 : 0)
          ta.setSelectionRange(offset, offset)
          const lh = parseFloat(getComputedStyle(ta).lineHeight) || 18
          ta.scrollTop = Math.max(0, hit.line * lh - 20)
        }
      }
    })
  }

  /* ---- render ---- */
  const docSource = doc?.content ?? ''
  const rendered = useMarkdown(view === 'reader' ? docSource : view in PAGES ? PAGES[view as keyof typeof PAGES] : '')
  const themeLabel = { system: `System (${effective === 'dark' ? 'Dark' : 'Light'})`, light: 'Light', dark: 'Dark' }[prefs.theme]
  const scaleLabel = prefs.textScale === 1 ? 'Default' : `${Math.round(prefs.textScale * 100)}%`
  const stepIdx = TEXT_STEPS.indexOf(prefs.textScale)

  return (
    <ThemeContext.Provider value={useMemo(() => ({ effective }), [effective])}>
      <div className={dragging ? 'cm-drop-active' : undefined}>
        {popup && (
          <div className="cm-popup-bar">
            <span className="cm-popup-bar-label">Claymark</span>
            <PortedButton variant="link" size="sm" onClick={openInTab}>
              Open in tab <ExternalLink size={13} className="cm-icon" aria-hidden="true" />
            </PortedButton>
          </div>
        )}
        {view === 'welcome' && (
          <main className="cm-welcome">
            
              <PortedButton variant="ghost" size="icon" className="cm-welcome-menu" aria-label="Open menu" title="Open menu" onClick={() => setDrawer(true)}>
                <Menu size={20} aria-hidden="true" />
              </PortedButton>
            
            <div className="cm-welcome-inner">
              <Logo size={64} />
              <p className="cm-welcome-tag">A Markdown renderer built for streamed, untrusted LLM output.</p>
              <PortedButton size="lg" className="cm-welcome-open" onClick={openFile}>Open file</PortedButton>
              <div className="cm-welcome-links">
                <PortedButton variant="link" onClick={openSample}>View sample</PortedButton>
                <PortedButton variant="link" onClick={newDoc}>New document</PortedButton>
              </div>
              <p className="cm-welcome-hint">or drop a .md file anywhere on this page</p>
            </div>
          </main>
        )}

        {view === 'reader' && doc && (
          <div className={`cm-page${editing ? ' cm-page--wide' : ''}`}>
            <header className="cm-header">
              {editing ? (
                <PortedButton variant="ghost" size="sm" className="cm-back" onClick={exitEdit}>
                  <ArrowLeft size={16} aria-hidden="true" /> Back
                </PortedButton>
              ) : (
                
                  <PortedButton variant="ghost" size="icon" aria-label="Open menu" title="Open menu" onClick={() => setDrawer(true)}>
                    <Menu size={20} aria-hidden="true" />
                  </PortedButton>
                
              )}
              <div className="cm-header-titles">
                <h1 className="cm-header-title" title={doc.name}>{doc.name}</h1>
                {dirty && <PortedBadge variant="secondary" className="cm-header-sub">Unsaved changes</PortedBadge>}
                {!dirty && editing && doc.handle && prefs.autosave && <PortedBadge variant="outline" className="cm-header-sub">Autosave on</PortedBadge>}
              </div>
              <div className="cm-header-actions">
                {editing ? (
                  <>
                    {doc.handle && <PortedButton variant="secondary" onClick={() => save()}>Save</PortedButton>}
                    <PortedButton onClick={() => save(true)}>Save as…</PortedButton>
                  </>
                ) : (
                  <>
                    <PortedButton variant="outline" size="sm" onClick={() => setOutline(true)}>
                      <ListTree size={15} aria-hidden="true" /> Outline
                    </PortedButton>
                    <PortedButton size="sm" onClick={() => setEditing(true)}>
                      <Pencil size={15} aria-hidden="true" /> Edit
                    </PortedButton>
                  </>
                )}
              </div>
            </header>

            {search && (
              <SearchBar
                editing={editing}
                articleRef={articleRef}
                textareaRef={textareaRef}
                source={docSource}
                onReplace={(next) => setContent(next)}
                onClose={() => setSearch(false)}
              />
            )}

            {editing && (
              <div className="cm-edit-bar">
                <PortedButton variant="outline" size="sm" onClick={() => setOutline(true)}>
                  <ListTree size={15} aria-hidden="true" /> Outline
                </PortedButton>
              </div>
            )}

            <div className={editing ? 'cm-split' : undefined}>
              {editing && (
                <div className="cm-editor">
                  <div className="cm-toolbar" role="toolbar" aria-label="Formatting">
                    <PortedButton variant="outline" size="icon" className="cm-tool" onClick={() => format('bold')} aria-label="Bold" title="Bold (Ctrl+B)"><Bold size={15} aria-hidden="true" /></PortedButton>
                    <PortedButton variant="outline" size="icon" className="cm-tool" onClick={() => format('italic')} aria-label="Italic" title="Italic (Ctrl+I)"><Italic size={15} aria-hidden="true" /></PortedButton>
                    <PortedButton variant="outline" size="icon" className="cm-tool" onClick={() => format('code')} aria-label="Code" title="Code"><Code2 size={15} aria-hidden="true" /></PortedButton>
                    <PortedButton variant="outline" size="icon" className="cm-tool" onClick={() => format('list')} aria-label="Bulleted list" title="List"><List size={15} aria-hidden="true" /></PortedButton>
                    <PortedButton variant="outline" size="icon" className="cm-tool" onClick={() => format('link')} aria-label="Link" title="Link (Ctrl+K)"><Link2 size={15} aria-hidden="true" /></PortedButton>
                  </div>
                  <label className="sr-only" htmlFor="cm-source">Markdown source</label>
                  <textarea
                    id="cm-source"
                    ref={textareaRef}
                    className="cm-textarea pb-clay-inset"
                    value={doc.content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={onEditorKey}
                    spellCheck={false}
                    autoFocus
                    placeholder="Write Markdown here…"
                  />
                </div>
              )}
              <div className={editing ? 'cm-preview' : 'cm-reader-body'} ref={articleRef}>
                <MarkdownRoot blocks={rendered.blocks} />
              </div>
            </div>
          </div>
        )}

        {(view === 'help' || view === 'about' || view === 'privacy') && (
          <div className="cm-page">
            <header className="cm-header">
              <PortedButton variant="ghost" size="icon" className="cm-back" aria-label="Back" title="Back" onClick={() => setView(returnTo)}><ArrowLeft size={18} aria-hidden="true" /></PortedButton>
              <div className="cm-header-titles">
                <h1 className="cm-header-title cm-header-title--page">{view[0]!.toUpperCase() + view.slice(1)}</h1>
              </div>
            </header>
            <div className="cm-page-body">
              <MarkdownRoot blocks={rendered.blocks} />
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="cm-page">
            <header className="cm-header">
              <PortedButton variant="ghost" size="icon" className="cm-back" aria-label="Back" title="Back" onClick={() => setView(returnTo)}><ArrowLeft size={18} aria-hidden="true" /></PortedButton>
              <div className="cm-header-titles">
                <h1 className="cm-header-title cm-header-title--page">Settings</h1>
              </div>
            </header>
            <ul className="cm-settings">
              <li className="cm-setting">
                <div>
                  <h2 className="cm-setting-title" id="s-autosave">Enable autosave</h2>
                  <p className="cm-setting-desc">Files opened from disk are saved automatically.</p>
                </div>
                <input type="checkbox" className="cm-check" aria-labelledby="s-autosave" checked={prefs.autosave} onChange={(e) => setPref({ autosave: e.target.checked })} />
              </li>
              <li className="cm-setting">
                <div>
                  <h2 className="cm-setting-title">Theme</h2>
                  <p className="cm-setting-desc">{themeLabel}</p>
                </div>
                <PortedButton variant="outline" size="sm" onClick={() => setThemeDlg(true)}>Change</PortedButton>
              </li>
              <li className="cm-setting">
                <div>
                  <h2 className="cm-setting-title" id="s-amoled">AMOLED Dark Theme</h2>
                  <p className="cm-setting-desc">Use a pure black background instead of the default.</p>
                </div>
                <input type="checkbox" className="cm-check" aria-labelledby="s-amoled" checked={prefs.amoled} onChange={(e) => setPref({ amoled: e.target.checked })} />
              </li>
              <li className="cm-setting">
                <div>
                  <h2 className="cm-setting-title">Text size</h2>
                  <p className="cm-setting-desc" aria-live="polite">{scaleLabel}</p>
                </div>
                <div className="cm-stepper">
                  <PortedButton variant="outline" size="icon" className="cm-step" aria-label="Smaller text" title="Smaller text" disabled={stepIdx <= 0} onClick={() => setPref({ textScale: TEXT_STEPS[stepIdx - 1]! })}><Minus size={14} aria-hidden="true" /></PortedButton>
                  <PortedButton variant="outline" size="icon" className="cm-step" aria-label="Larger text" title="Larger text" disabled={stepIdx >= TEXT_STEPS.length - 1} onClick={() => setPref({ textScale: TEXT_STEPS[stepIdx + 1]! })}><Plus size={14} aria-hidden="true" /></PortedButton>
                </div>
              </li>
            </ul>
          </div>
        )}

        {drawer && (
          <Drawer
            recent={recent}
            onClose={() => setDrawer(false)}
            onOpenFile={() => { setDrawer(false); openFile() }}
            onNew={() => { setDrawer(false); newDoc() }}
            onOpenRecent={(r) => { setDrawer(false); openRecentEntry(r) }}
            onClearRecent={() => clearRecent().then(refreshRecent)}
            onNav={nav}
          />
        )}

        {(outline || themeDlg || pending || (draftOffer && !pending)) && (
        <Suspense fallback={null}>
        {outline && (
          <Dialog title="Outline" onClose={() => setOutline(false)}>
            {rendered.outline.length === 0 ? (
              <p className="cm-outline-empty">This document has no headings.</p>
            ) : (
              <ul className="cm-outline-list">
                {rendered.outline.map((h, i) => (
                  <li key={h.id} style={{ paddingInlineStart: `${(h.depth - 1) * 1.1}rem` }}>
                    <button type="button" className="cm-outline-item" data-depth={h.depth} onClick={() => jumpTo(h, i)} {...(i === 0 ? { 'data-autofocus': true } : {})}>
                      {h.text || '(untitled)'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Dialog>
        )}

        {themeDlg && (
          <Dialog title="Theme" onClose={() => setThemeDlg(false)}>
            <div className="cm-radio-list" role="radiogroup" aria-label="Theme">
              {(['system', 'light', 'dark'] as ThemePref[]).map((t) => (
                <label key={t} className="cm-radio">
                  <input type="radio" name="theme" checked={prefs.theme === t} onChange={() => { setPref({ theme: t }); setThemeDlg(false) }} {...(prefs.theme === t ? { 'data-autofocus': true } : {})} />
                  {t === 'system' ? 'Follow system' : t[0]!.toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>
          </Dialog>
        )}

        {pending && (
          <Dialog
            title="Discard unsaved changes?"
            onClose={() => setPending(null)}
            actions={
              <>
                <PortedButton variant="ghost" onClick={() => setPending(null)}>Cancel</PortedButton>
                <PortedButton
                  variant="destructive"
                  onClick={() => {
                    const act = pending
                    setDoc((d) => (d ? { ...d, content: d.savedContent } : d))
                    clearDraft()
                    setPending(null)
                    // Let the revert commit before the action reads state.
                    setTimeout(act, 0)
                  }}
                >
                  Discard
                </PortedButton>
                <PortedButton
                  data-autofocus
                  onClick={async () => {
                    const act = pending
                    setPending(null)
                    if (await save()) setTimeout(act, 0)
                  }}
                >
                  Save
                </PortedButton>
              </>
            }
          >
            <p className="cm-dialog-body">This document has unsaved edits that will be lost.</p>
          </Dialog>
        )}

        {draftOffer && !pending && (
          <Dialog
            title="Restore unsaved draft?"
            onClose={() => setDraftOffer(null)}
            actions={
              <>
                <PortedButton variant="ghost" onClick={() => { clearDraft(); setDraftOffer(null) }}>Discard draft</PortedButton>
                <PortedButton
                  data-autofocus
                  onClick={() => {
                    const d = draftOffer
                    setDraftOffer(null)
                    show({ id: d.docId, name: d.name, content: d.content, savedContent: '', kind: d.kind === 'file' ? 'snapshot' : d.kind }, true)
                    notify('Draft restored — use Save as… to keep it.')
                  }}
                >
                  Restore
                </PortedButton>
              </>
            }
          >
            <p className="cm-dialog-body">
              Claymark found an unsaved draft of <strong>{draftOffer.name}</strong> from {new Date(draftOffer.savedAt).toLocaleString()}.
            </p>
          </Dialog>
        )}
        </Suspense>
        )}

        {showTop && view !== 'welcome' && (
          <PortedButton variant="default" size="icon" className="claymark-scroll-top" aria-label="Scroll to top" title="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp size={18} aria-hidden="true" /></PortedButton>
        )}

        {toast && (
          <div className="cm-toast pb-clay-raised" role={toast.kind === 'error' ? 'alert' : 'status'} data-kind={toast.kind}>
            {toast.msg}
          </div>
        )}
      </div>
    </ThemeContext.Provider>
  )
}
