// Phase 5.1/5.2 (android-to-desktop-checklist.md §3/§5): thin wrappers
// around the two native-launch signals the app shell listens for —
// "open with" (Rust emits 'claymark://open-file') and window-wide file
// drag-and-drop (Tauri's own webview drag-drop event, which hands a real
// file path, not a browser File/Blob — routes through fileIO.ts like any
// other open, so it participates in the session/MRU/draft system).
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'

// Both listen() and getCurrentWebview() talk to window.__TAURI_INTERNALS__,
// which only exists inside a real Tauri webview — calling them from a plain
// browser (the Vite dev-preview / PWA build) throws immediately on mount.
// fs/dialog calls elsewhere are safe because they only run on a user
// action (button click); these two run eagerly in a mount-time effect, so
// they need an explicit environment guard instead.
function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function onOpenFileFromOS(handler: (path: string) => void): () => void {
  if (!isTauriRuntime()) return () => {}
  let unlisten: (() => void) | null = null
  let cancelled = false
  listen<string>('claymark://open-file', (event) => handler(event.payload)).then((fn) => {
    if (cancelled) fn()
    else unlisten = fn
  })
  return () => {
    cancelled = true
    unlisten?.()
  }
}

export function onWindowFileDrop(handler: (path: string) => void): () => void {
  if (!isTauriRuntime()) return () => {}
  let unlisten: (() => void) | null = null
  let cancelled = false
  getCurrentWebview()
    .onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        const path = event.payload.paths[0]
        if (path) handler(path)
      }
    })
    .then((fn) => {
      if (cancelled) fn()
      else unlisten = fn
    })
  return () => {
    cancelled = true
    unlisten?.()
  }
}
