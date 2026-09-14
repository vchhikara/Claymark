// Tauri DocumentBackend adapter — desktop (real fs paths) and Android
// (`content://` URIs, per audit §14/§16). Uses @tauri-apps/plugin-dialog
// for the native picker and @tauri-apps/plugin-fs for read/write; the
// dialog plugin's selection is what adds the path/URI to the fs scope
// (capabilities/default.json), so open-then-read/write is the only path
// that works — never construct a path manually.

import type { DocumentBackend, DocumentRef, DocumentSnapshot, PersistAction } from '../types'

function basename(pathOrUri: string): string {
  const clean = pathOrUri.split(/[?#]/)[0] ?? pathOrUri
  const parts = clean.split(/[/\\]/)
  return decodeURIComponent(parts[parts.length - 1] || pathOrUri)
}

function refFor(pathOrUri: string, writable: boolean): DocumentRef {
  return {
    id: pathOrUri,
    name: basename(pathOrUri),
    writable,
    // Android content resolvers return `content://`; every other Tauri
    // target (desktop, and iOS if ever added) returns a real path/`file://`.
    sourceKind: pathOrUri.startsWith('content://') ? 'tauri-content-uri' : 'tauri-path',
    handle: pathOrUri,
  }
}

export function createTauriDocumentBackend(): DocumentBackend {
  return {
    kind: 'tauri',

    openFile: async () => {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readTextFile } = await import('@tauri-apps/plugin-fs')
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
      })
      if (!selected || Array.isArray(selected)) return null
      const text = await readTextFile(selected)
      return { ref: refFor(selected, true), text }
    },

    read: async (ref) => {
      const { readTextFile } = await import('@tauri-apps/plugin-fs')
      const text = await readTextFile(ref.handle as string)
      return { ref, text }
    },

    save: async (ref, text) => {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      await writeTextFile(ref.handle as string, text)
    },

    saveAs: async (_ref, text) => {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      const destination = await save({
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
      })
      if (!destination) return null
      await writeTextFile(destination, text)
      return refFor(destination, true)
    },

    downloadCopy: async () => {
      // Tauri always has a real writable destination via saveAs(); a
      // browser-style download is never the right fallback here.
      throw new Error('downloadCopy is not applicable on Tauri — use Save as.')
    },

    persistAction: (ref): PersistAction => (ref.writable ? 'save' : 'save-as'),
  }
}

export type { DocumentSnapshot }
