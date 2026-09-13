import type { BundledLanguage, BundledTheme, Highlighter } from 'shiki'
import { getHighlighter } from 'shiki'

// R-LANG: fixed registry of 34 grammars. Adding a language is a DEC- decision,
// not a task-level choice — see plan/REFERENCES.md §R-LANG.
export const SUPPORTED_LANGUAGES = [
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'dockerfile',
  'go',
  'graphql',
  'html',
  'ini',
  'java',
  'javascript',
  'json',
  'jsx',
  'kotlin',
  'lua',
  'makefile',
  'markdown',
  'nginx',
  'php',
  'python',
  'r',
  'ruby',
  'rust',
  'scala',
  'scss',
  'sql',
  'swift',
  'toml',
  'tsx',
  'typescript',
  'xml',
  'yaml',
] as const satisfies readonly BundledLanguage[]

// docs/THEMING.md §8: paired light/dark themes, resolved by the data-theme
// attribute. Overridable with any VS Code theme.
export const DEFAULT_THEMES = {
  light: 'github-light',
  dark: 'github-dark-dimmed',
} as const satisfies Record<'light' | 'dark', BundledTheme>

export type ShikiHighlighter = Highlighter

let highlighterPromise: Promise<ShikiHighlighter> | null = null

// Singleton, lazily created on first code fence (docs/ARCHITECTURE.md: Shiki is
// not in the initial chunk). Only the 34 pinned grammars and 2 pinned themes
// are loaded — never the full bundle.
export function getShikiHighlighter(): Promise<ShikiHighlighter> {
  const existing = highlighterPromise
  if (existing) return existing
  const created: Promise<ShikiHighlighter> = getHighlighter({
    langs: [...SUPPORTED_LANGUAGES],
    themes: [DEFAULT_THEMES.light, DEFAULT_THEMES.dark],
  })
  highlighterPromise = created
  return created
}
