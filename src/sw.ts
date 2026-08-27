// T-P9-02: offline service worker for the Claymark reference/demo app
// (`vite build --mode app`). Caches the app shell so a repeat visit — and a
// PWA install — works offline. This file is not part of the library's
// public build (src/index.ts is untouched); it is copied to dist/app/sw.js
// as a plain script by vite-plugin-pwa during the `app`-mode build only.
/// <reference lib="webworker" />
export {}
declare const self: ServiceWorkerGlobalScope

const CACHE_NAME = 'claymark-shell-v1'
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

// Cache-first for the shell, network-first with cache fallback for
// everything else — keeps the app usable offline without serving stale
// hashed build assets over a fresh deploy indefinitely.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  )
})
