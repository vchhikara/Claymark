import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'

// Minimal reference-app entry point for T-P7-08's `index.html` demo build
// (`vite build --mode app`). This is not a distributed part of the library
// (src/index.ts's public exports are unaffected) — it exists so index.html's
// flash-of-incorrect-color fix has something real to render into and be
// checked against.
const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    createElement(ThemeProvider, null, createElement(ThemeToggle)),
  )
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
