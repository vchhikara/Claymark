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
