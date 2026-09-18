/** Language ids + aliases — tiny, so the main bundle can decide without loading Shiki. */
export const LANG_IDS = new Set(['javascript','typescript','jsx','tsx','json','html','css','scss','markdown','python','java','kotlin','swift','c','cpp','csharp','go','rust','ruby','php','shellscript','powershell','sql','yaml','toml','xml','dockerfile','diff','lua','r','dart','scala','graphql','ini'])

const ALIASES: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', mts: 'typescript',
  py: 'python', rb: 'ruby', sh: 'shellscript', bash: 'shellscript', zsh: 'shellscript', shell: 'shellscript',
  console: 'shellscript', ps1: 'powershell', pwsh: 'powershell', yml: 'yaml', md: 'markdown',
  'c++': 'cpp', cs: 'csharp', 'c#': 'csharp', kt: 'kotlin', rs: 'rust', golang: 'go', docker: 'dockerfile',
  patch: 'diff', gql: 'graphql', htm: 'html', svg: 'xml', jsonc: 'json', json5: 'json', conf: 'ini', cfg: 'ini',
}

export function resolveLang(lang: string | undefined): string | undefined {
  if (!lang) return undefined
  const l = lang.toLowerCase()
  const id = ALIASES[l] ?? l
  return LANG_IDS.has(id) ? id : undefined // FR-4.2: unregistered → plain text
}

