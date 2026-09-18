/**
 * FR-4.1: 34-language registry, light + dark themes, each grammar a lazy chunk.
 * Shiki core with the inlined Oniguruma WASM — no fetch, needs only
 * CSP 'wasm-unsafe-eval' (LEDGER X-016).
 */
import { getHighlighterCore, type HighlighterCore, type ThemedToken } from 'shiki/core'
import getWasm from 'shiki/wasm'
import githubLight from 'shiki/themes/github-light.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'

const LANGS: Record<string, () => Promise<any>> = {
  javascript: () => import('shiki/langs/javascript.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  ruby: () => import('shiki/langs/ruby.mjs'),
  php: () => import('shiki/langs/php.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  powershell: () => import('shiki/langs/powershell.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  dockerfile: () => import('shiki/langs/dockerfile.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  lua: () => import('shiki/langs/lua.mjs'),
  r: () => import('shiki/langs/r.mjs'),
  dart: () => import('shiki/langs/dart.mjs'),
  scala: () => import('shiki/langs/scala.mjs'),
  graphql: () => import('shiki/langs/graphql.mjs'),
  ini: () => import('shiki/langs/ini.mjs'),
}

import { resolveLang } from './lang-registry'
export { resolveLang }

let core: Promise<HighlighterCore> | null = null
const loaded = new Map<string, Promise<void>>()
const cache = new Map<string, ThemedToken[][]>()

function highlighter() {
  core ??= getHighlighterCore({ themes: [githubLight, githubDark], langs: [], loadWasm: getWasm })
  return core
}

export async function tokenize(code: string, lang: string): Promise<ThemedToken[][] | null> {
  const id = resolveLang(lang)
  if (!id) return null
  const key = id + '\u0000' + code
  const hit = cache.get(key)
  if (hit) return hit
  const hl = await highlighter()
  if (!loaded.has(id)) loaded.set(id, LANGS[id]!().then((m) => hl.loadLanguage(m.default)))
  await loaded.get(id)
  const tokens = hl.codeToTokens(code, {
    lang: id,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  }).tokens
  if (cache.size > 300) cache.delete(cache.keys().next().value!)
  cache.set(key, tokens)
  return tokens
}
