// Phase 3.5 (android-to-desktop-checklist.md §4): pure text-transform
// helpers, kept framework-agnostic so they're directly unit-testable
// against a { value, selectionStart, selectionEnd } snapshot rather than a
// real DOM textarea.
export interface TextFieldSnapshot {
  value: string
  selectionStart: number
  selectionEnd: number
}

export interface TextFieldResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

function wrapOrInsert(field: TextFieldSnapshot, marker: string): TextFieldResult {
  const { value, selectionStart, selectionEnd } = field
  const before = value.slice(0, selectionStart)
  const selected = value.slice(selectionStart, selectionEnd)
  const after = value.slice(selectionEnd)

  if (selectionStart === selectionEnd) {
    const value2 = before + marker + marker + after
    const caret = selectionStart + marker.length
    return { value: value2, selectionStart: caret, selectionEnd: caret }
  }

  const value2 = before + marker + selected + marker + after
  return {
    value: value2,
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionEnd + marker.length,
  }
}

export function applyBold(field: TextFieldSnapshot): TextFieldResult {
  return wrapOrInsert(field, '**')
}

export function applyItalic(field: TextFieldSnapshot): TextFieldResult {
  return wrapOrInsert(field, '_')
}

export function applyCode(field: TextFieldSnapshot): TextFieldResult {
  return wrapOrInsert(field, '`')
}

export function applyList(field: TextFieldSnapshot): TextFieldResult {
  const { value, selectionStart, selectionEnd } = field
  const before = value.slice(0, selectionStart)
  const lineStart = before.lastIndexOf('\n') + 1
  const value2 = value.slice(0, lineStart) + '- ' + value.slice(lineStart)
  return { value: value2, selectionStart: selectionStart + 2, selectionEnd: selectionEnd + 2 }
}

export function applyLink(field: TextFieldSnapshot): TextFieldResult {
  const { value, selectionStart, selectionEnd } = field
  const before = value.slice(0, selectionStart)
  const selected = value.slice(selectionStart, selectionEnd)
  const after = value.slice(selectionEnd)

  if (selectionStart === selectionEnd) {
    const value2 = before + '[](url)' + after
    const caret = selectionStart + 1
    return { value: value2, selectionStart: caret, selectionEnd: caret }
  }

  const value2 = before + '[' + selected + '](url)' + after
  const caret = selectionStart + selected.length + 3
  return { value: value2, selectionStart: caret, selectionEnd: caret + 3 }
}
