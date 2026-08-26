import { useState } from 'react'
import type { ReactElement } from 'react'

export interface CopyButtonProps {
  // FR-4.4/T-P4-05: exact source text to copy, excluding any line-number
  // gutter markup — callers pass the raw fence content, not rendered HTML.
  text: string
}

type CopyState = 'idle' | 'copied' | 'error'

// T-P4-06: `navigator.clipboard` is undefined in insecure (non-HTTPS/non-localhost)
// contexts. Falls back to a hidden textarea + document.execCommand('copy'),
// the only copy mechanism available there.
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)
  let succeeded = false
  try {
    succeeded = document.execCommand('copy')
  } catch {
    succeeded = false
  } finally {
    document.body.removeChild(textarea)
  }
  return succeeded
}

export function CopyButton({ text }: CopyButtonProps): ReactElement {
  const [state, setState] = useState<CopyState>('idle')

  async function handleClick(): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        setState('copied')
      } else if (legacyCopy(text)) {
        setState('copied')
      } else {
        setState('error')
      }
    } catch {
      setState(legacyCopy(text) ? 'copied' : 'error')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      type="button"
      className="claymark-copy-button"
      data-state={state}
      aria-label={state === 'copied' ? 'Copied to clipboard' : 'Copy code to clipboard'}
      onClick={() => {
        void handleClick()
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'error' ? 'Failed' : 'Copy'}
    </button>
  )
}
