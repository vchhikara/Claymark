import { describe, it, expect } from 'vitest'
import { applyBold, applyItalic, applyCode, applyList, applyLink } from '../src/app/formattingActions'

describe('formattingActions', () => {
  it('wraps a selection in bold markers', () => {
    const result = applyBold({ value: 'hello world', selectionStart: 0, selectionEnd: 5 })
    expect(result.value).toBe('**hello** world')
    expect(result.selectionStart).toBe(2)
    expect(result.selectionEnd).toBe(7)
  })

  it('inserts bold markers with caret between them when nothing is selected', () => {
    const result = applyBold({ value: 'hello', selectionStart: 5, selectionEnd: 5 })
    expect(result.value).toBe('hello****')
    expect(result.selectionStart).toBe(7)
    expect(result.selectionEnd).toBe(7)
  })

  it('wraps a selection in italic underscores', () => {
    const result = applyItalic({ value: 'abc', selectionStart: 0, selectionEnd: 3 })
    expect(result.value).toBe('_abc_')
  })

  it('wraps a selection in backticks for code', () => {
    const result = applyCode({ value: 'x = 1', selectionStart: 0, selectionEnd: 5 })
    expect(result.value).toBe('`x = 1`')
  })

  it('prefixes the current line with a list marker', () => {
    const result = applyList({ value: 'first\nsecond', selectionStart: 8, selectionEnd: 8 })
    expect(result.value).toBe('first\n- second')
  })

  it('wraps a selection as link text with a url placeholder', () => {
    const result = applyLink({ value: 'click here', selectionStart: 0, selectionEnd: 10 })
    expect(result.value).toBe('[click here](url)')
  })

  it('inserts an empty link template with caret inside the brackets when nothing is selected', () => {
    const result = applyLink({ value: '', selectionStart: 0, selectionEnd: 0 })
    expect(result.value).toBe('[](url)')
    expect(result.selectionStart).toBe(1)
    expect(result.selectionEnd).toBe(1)
  })
})
