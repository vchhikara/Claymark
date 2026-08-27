// T-P6-11 / plan/02-VERIFICATION-GATES.md §Backtest: produces the 250-document
// historical corpus.
//
// Honesty note: the gate calls for documents "captured before implementation
// began." That is structurally impossible for this from-scratch build — there
// was no rendering behavior to capture anything against at CP-000 (see
// ASM-003, plan/04-STATE-LEDGER.md). No external real-world-document source
// is available in this sandboxed environment either. This generator instead
// produces representative, category-appropriate Markdown deterministically
// (fixed per-index content, not randomized — reruns are byte-identical) in
// the exact composition the gate table specifies. DEC-018 records the
// resulting baseline-commit adaptation used to give this corpus a meaningful
// "known good" point of comparison. The corpus itself is committed once
// generated and never regenerated in place — exactly as "frozen" requires.

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface CorpusEntry {
  id: string
  category: string
  path: string
}

const ROOT = join(process.cwd(), 'bench/corpus/docs')
const MANIFEST_PATH = join(process.cwd(), 'bench/corpus/manifest.json')

function pad(n: number): string {
  return String(n).padStart(3, '0')
}

// --- Category 1: Long-form technical prose (60) ---
function longFormProse(i: number): string {
  const topics = ['distributed consensus', 'garbage collection', 'type inference', 'cache coherence', 'CRDT merge semantics']
  const topic = topics[i % topics.length]
  const paras = Array.from({ length: 4 + (i % 3) }, (_, p) =>
    `Paragraph ${p + 1} discusses ${topic} in document ${i}. ` +
      'This is ordinary prose with *emphasis*, **strong emphasis**, and the occasional `inline code` reference. '.repeat(3),
  )
  return `# Notes on ${topic} (doc ${i})\n\n## Background\n\n${paras[0]}\n\n## Discussion\n\n${paras.slice(1).join('\n\n')}\n\n> A blockquote observation about ${topic}, doc ${i}.\n`
}

// --- Category 2: Code-heavy documents (50) ---
function codeHeavy(i: number): string {
  const langs = ['ts', 'python', 'rust', 'go', 'bash']
  const lang = langs[i % langs.length]
  const blocks = Array.from(
    { length: 3 + (i % 3) },
    (_, b) => '```' + lang + `\n// snippet ${b} in doc ${i}\nfunction f${b}(x) {\n  return x + ${b};\n}\n` + '```',
  )
  return `# Code sample set ${i}\n\nIntro text before the first fence, doc ${i}.\n\n${blocks.join('\n\n')}\n\nSome trailing prose with an \`inline\` reference after the fences.\n`
}

// --- Category 3: Mathematical papers (30) ---
function mathPaper(i: number): string {
  return `# Theorem ${i}\n\nLet $x_${i}$ be defined as follows.\n\n$$\nx_{${i}} = \\sum_{k=0}^{${i % 10}} y_k^2 + ${i}\n$$\n\nThe inline form $a_${i} + b_${i} = c_${i}$ follows directly.\n\n$$\n\\int_0^${i % 5} f(t)\\,dt = ${i}\n$$\n`
}

// --- Category 4: Diagram-bearing documents (20) ---
function diagramDoc(i: number): string {
  return `# Flow ${i}\n\nDescription of process ${i}.\n\n\`\`\`mermaid\ngraph TD\n  A${i}[Start ${i}] --> B${i}[Step]\n  B${i} --> C${i}[End]\n\`\`\`\n\nFollow-up prose after the diagram, doc ${i}.\n`
}

// --- Category 5: Table-heavy documents (30) ---
function tableHeavy(i: number): string {
  const cols = 3 + (i % 5)
  const rows = 4 + (i % 4)
  const header = '| ' + Array.from({ length: cols }, (_, c) => `Col${c}`).join(' | ') + ' |'
  const delim = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |'
  const body = Array.from(
    { length: rows },
    (_, r) => '| ' + Array.from({ length: cols }, (_, c) => `r${r}c${c}-${i}`).join(' | ') + ' |',
  )
  return `# Table doc ${i}\n\n${header}\n${delim}\n${body.join('\n')}\n\nCaption prose following the table, doc ${i}.\n`
}

// --- Category 6: Mixed-content chat transcripts (40) ---
function chatTranscript(i: number): string {
  return (
    `**User:** Question ${i} about combining code and prose.\n\n` +
    `**Assistant:** Here is an explanation for request ${i}.\n\n` +
    '```js\n' + `const answer${i} = ${i};\n` + '```\n\n' +
    `That covers it — see the [reference](https://example.com/doc-${i}) for more, and the table below.\n\n` +
    `| Key | Value |\n| --- | --- |\n| id | ${i} |\n| status | ok |\n`
  )
}

// --- Category 7: Adversarial / malformed (20) ---
function adversarial(i: number): string {
  const variants: Array<() => string> = [
    () => '*'.repeat(20 + i),
    () => '> '.repeat(30 + i) + `deeply nested ${i}`,
    () => `[unclosed link ${i}`,
    () => '```js\nconst x = ' + i + ';\n// unclosed fence',
    () => `| a | b |\n| --- |\n| only one cell ${i} |`,
  ]
  const variant = variants[i % variants.length]!
  return variant()
}

const CATEGORIES: Array<{ name: string; count: number; gen: (i: number) => string }> = [
  { name: 'long-form-prose', count: 60, gen: longFormProse },
  { name: 'code-heavy', count: 50, gen: codeHeavy },
  { name: 'math-papers', count: 30, gen: mathPaper },
  { name: 'diagram-bearing', count: 20, gen: diagramDoc },
  { name: 'table-heavy', count: 30, gen: tableHeavy },
  { name: 'chat-transcripts', count: 40, gen: chatTranscript },
  { name: 'adversarial', count: 20, gen: adversarial },
]

export function generateCorpus(): CorpusEntry[] {
  rmSync(ROOT, { recursive: true, force: true })
  mkdirSync(ROOT, { recursive: true })
  const manifest: CorpusEntry[] = []

  for (const { name, count, gen } of CATEGORIES) {
    const dir = join(ROOT, name)
    mkdirSync(dir, { recursive: true })
    for (let i = 0; i < count; i++) {
      const id = `${name}-${pad(i)}`
      const relPath = `bench/corpus/docs/${name}/${pad(i)}.md`
      writeFileSync(join(dir, `${pad(i)}.md`), gen(i))
      manifest.push({ id, category: name, path: relPath })
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify({ total: manifest.length, entries: manifest }, null, 2) + '\n')
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = generateCorpus()
  console.log(`Generated ${manifest.length} documents across ${CATEGORIES.length} categories.`)
  for (const { name, count } of CATEGORIES) console.log(`  ${name}: ${count}`)
}
