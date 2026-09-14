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

// Real-device finding (POCO M2 Pro): a document opened via Android's
// "Documents"/"Recent" drawer arrives as a
// content://com.android.providers.media.documents/document/... URI —
// MediaDocumentsProvider gives out no persisted write grant for these, so a
// save always fails with a real PermissionDenial ("requires
// android.permission.MANAGE_DOCUMENTS or grantUriPermission()"), confirmed
// live on-device. The direct storage-volume route
// (content://.../primary:Download/..., ExternalStorageProvider) is the only
// content:// route this app has confirmed writable. Without this check,
// persistAction() reports 'save' for both routes alike and offers a Save
// button that's guaranteed to fail for the drawer route.
function isKnownNonWritableUri(pathOrUri: string): boolean {
  return pathOrUri.startsWith('content://com.android.providers.media.documents/')
}

// The same MediaDocumentsProvider URIs have no filename anywhere in the URI
// itself, so basename()'s naive last-path-segment parsing (which works fine
// for desktop paths and the ExternalStorageProvider content:// route)
// produces a meaningless "document:<id>"-shaped string. The only way to
// recover a real name is to ask the platform's ContentResolver for
// OpenableColumns.DISPLAY_NAME via the native `get_display_name` command
// (src-tauri/src/lib.rs + ContentResolverPlugin.kt) — a best-effort
// enhancement layered on top of the naive name, not a replacement for it:
// it no-ops to `null` on every non-Android target and on any lookup failure.
async function displayNameFor(pathOrUri: string): Promise<string> {
  const naive = basename(pathOrUri)
  if (!pathOrUri.startsWith('content://')) return naive
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const name = await invoke<string | null>('get_display_name', { uri: pathOrUri })
    return name && name.length > 0 ? name : naive
  } catch {
    return naive
  }
}

async function refFor(pathOrUri: string, writable: boolean): Promise<DocumentRef> {
  return {
    id: pathOrUri,
    name: await displayNameFor(pathOrUri),
    writable: writable && !isKnownNonWritableUri(pathOrUri),
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
      return { ref: await refFor(selected, true), text }
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
      return await refFor(destination, true)
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
