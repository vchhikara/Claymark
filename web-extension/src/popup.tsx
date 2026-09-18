import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/claymark.css'
import './styles/engine-ext.css'
import './styles/pb.css'
import './styles/app.css'
import './styles/popup.css'
import { loadPrefs } from './app/store/prefs'
import { App } from './app/App'

// Apply theme before first paint to avoid a flash — same as main.tsx.
const p = loadPrefs()
const dark = p.theme === 'dark' || (p.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
document.documentElement.dataset.theme = dark ? 'dark' : 'light'
document.documentElement.dataset.amoled = String(p.amoled)
document.documentElement.dataset.popup = 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App popup />
  </StrictMode>,
)
