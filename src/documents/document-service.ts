// Selects the concrete DocumentBackend once, per audit §4: `isTauri()` is
// checked first, and each backend's implementation (plus its native-only
// deps) is dynamically imported only after that check — so a PWA build
// never evaluates any `@tauri-apps/*` module.
import type { DocumentBackend } from './types'

let cached: Promise<DocumentBackend> | null = null

async function detectAndCreate(): Promise<DocumentBackend> {
  const { isTauri } = await import('@tauri-apps/api/core')
  if (isTauri()) {
    const { createTauriDocumentBackend } = await import('./backends/tauri')
    return createTauriDocumentBackend()
  }
  const { createWebDocumentBackend } = await import('./backends/web')
  return createWebDocumentBackend()
}

// Memoized — every caller in one session shares one backend instance.
export function createDocumentBackend(): Promise<DocumentBackend> {
  if (!cached) cached = detectAndCreate()
  return cached
}
