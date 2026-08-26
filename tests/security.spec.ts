import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Root, Element } from 'hast'
import { visit } from 'unist-util-visit'
import { processor } from '../src/pipeline/processor'
import { safeUrl } from '../src/pipeline/plugins/url-policy'

const here = dirname(fileURLToPath(import.meta.url))

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'em', 'strong', 'del', 'hr', 'br', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input',
])

async function render(markdown: string): Promise<Root> {
  return (await processor.run(processor.parse(markdown))) as Root
}

function assertInert(tree: Root, label: string): void {
  visit(tree, (node) => {
    if (node.type === 'raw') {
      throw new Error(`${label}: raw node reached output`)
    }
    if (node.type !== 'element') return
    const el = node as Element
    expect(
      ALLOWED_TAGS.has(el.tagName),
      `${label}: non-allow-listed tag <${el.tagName}>`,
    ).toBe(true)
    for (const key of Object.keys(el.properties)) {
      expect(key.startsWith('on'), `${label}: event-handler attribute ${key}`).toBe(false)
      expect(key === 'style' || key === 'srcset', `${label}: forbidden attribute ${key}`).toBe(false)
    }
    for (const attr of ['href', 'src'] as const) {
      const value = el.properties[attr]
      if (typeof value === 'string') {
        expect(
          safeUrl(value, attr === 'src'),
          `${label}: dangerous URL survived in ${attr}=${JSON.stringify(value)}`,
        ).not.toBeUndefined()
      }
    }
  })
}

describe('XSS corpus — zero execution from document content (NFR-1.2 · G2-C2)', () => {
  it('neutralizes every corpus fixture', async () => {
    const files = readdirSync(join(here, 'fixtures/xss')).filter((f) => f.endsWith('.md')).sort()
    expect(files.length).toBeGreaterThanOrEqual(80)
    for (const file of files) {
      const markdown = readFileSync(join(here, 'fixtures/xss', file), 'utf8')
      assertInert(await render(markdown), file)
    }
  }, 120_000)

  it('neutralizes all 14 malicious-URL fixtures (G2-C5)', async () => {
    const fixtures: Array<{ tag: 'a' | 'img'; url: string }> = [
      { tag: 'a', url: 'javascript:alert(1)' },
      { tag: 'a', url: 'JaVaScRiPt:alert(1)' },
      { tag: 'a', url: 'java\tscript:alert(1)' },
      { tag: 'a', url: 'java\nscript:alert(1)' },
      { tag: 'a', url: 'vbscript:msgbox(1)' },
      { tag: 'a', url: 'VBSCRIPT:x' },
      { tag: 'a', url: 'data:text/html,<script>alert(1)</script>' },
      { tag: 'a', url: 'data:text/html;base64,PHNjcmlwdD4=' },
      { tag: 'img', url: 'data:image/svg+xml,<svg onload=alert(1)>' },
      { tag: 'img', url: 'data:image/jpg,fake' },
      { tag: 'a', url: '\u0001javascript:alert(1)' },
      { tag: 'a', url: 'javascript&colon;alert(1)' },
      { tag: 'img', url: 'vbscript:alert(1)' },
      { tag: 'a', url: 'jAvAsCrIpT&#58;alert(1)' },
    ]
    let neutralized = 0
    for (const { tag, url } of fixtures) {
      const markdown = tag === 'img' ? `![](<${url}>)` : `[x](<${url}>)`
      const tree = await render(markdown)
      let leaked: string | undefined
      visit(tree, 'element', (node) => {
        if (node.tagName !== tag) return
        const value = node.properties[tag === 'img' ? 'src' : 'href']
        if (typeof value === 'string') leaked = value
      })
      if (!leaked) neutralized++
    }
    expect(neutralized).toBe(fixtures.length)
  })

  it('external links carry rel="noopener noreferrer" (NFR-1.4 · G2-C6)', async () => {
    const tree = await render('[ext](https://example.com)')
    let hardened = false
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return
      const rel = node.properties.rel
      hardened =
        Array.isArray(rel) && rel.includes('noopener') && rel.includes('noreferrer')
    })
    expect(hardened).toBe(true)
  })

  it('no script nodes exist anywhere in any output path (G2-C3)', async () => {
    const samples = [
      '<script>alert(1)</script>',
      '[x](javascript:alert(1))',
      '<img src=x onerror=alert(1)>',
      '```js\nalert(1)\n```',
    ]
    for (const markdown of samples) {
      const tree = await render(markdown)
      visit(tree, 'element', (node) => {
        expect(node.tagName === 'script', `script element from: ${markdown}`).toBe(false)
      })
    }
  })

  it('safeUrl scheme decisions at the boundary', () => {
    expect(safeUrl('https://example.com', false)).toBe('https://example.com')
    expect(safeUrl('/relative/path', false)).toBe('/relative/path')
    expect(safeUrl('#anchor', false)).toBe('#anchor')
    expect(safeUrl('mailto:a@b.c', false)).toBe('mailto:a@b.c')
    expect(safeUrl('data:image/png;base64,iVBOR', true)).toBe('data:image/png;base64,iVBOR')
    expect(safeUrl('data:image/png;base64,iVBOR', false)).toBeUndefined()
    expect(safeUrl('data:image/svg+xml,<svg/>', true)).toBeUndefined()
    expect(safeUrl('data:text/html,<script>alert(1)</script>', true)).toBeUndefined()
    expect(safeUrl('javascript:alert(1)', false)).toBeUndefined()
    expect(safeUrl('JaVaScRiPt:alert(1)', false)).toBeUndefined()
    expect(safeUrl('java%09script:alert(1)', false)).toBeUndefined()
    expect(safeUrl('%01javascript:alert(1)', false)).toBeUndefined()
    expect(safeUrl('java%zzscript:x', false)).toBeUndefined()
    expect(safeUrl('irc://foo.bar', false)).toBeUndefined()
  })

  it('link hardening skips same-origin and unparseable hrefs', async () => {
    const { unified } = await import('unified')
    const remarkParse = (await import('remark-parse')).default
    const remarkRehype = (await import('remark-rehype')).default
    const { linkHardening } = await import('../src/pipeline/plugins/links')

    const p = unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(linkHardening, { baseUrl: 'https://app.example.com/docs' })

    const tree = (await p.run(p.parse('[same](https://app.example.com/x) [ext](https://other.example.com/y)'))) as Root
    const seen: Array<{ href: string | undefined; target: unknown }> = []
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a') {
        seen.push({
          href: node.properties.href as string | undefined,
          target: node.properties.target,
        })
      }
    })
    expect(seen).toHaveLength(2)
    const sameOrigin = seen[0]!
    const external = seen[1]!
    expect(sameOrigin.href).toBe('https://app.example.com/x')
    expect(sameOrigin.target).toBeUndefined()
    expect(external.target).toBe('_blank')

    const broken = unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(linkHardening)
    const tree2 = (await broken.run(broken.parse('[x](<https://exa%zzple.com>)'))) as Root
    let hardenedBroken = false
    let hrefAfter: string | undefined
    visit(tree2, 'element', (node) => {
      if (node.tagName === 'a') {
        hrefAfter = node.properties.href as string | undefined
        hardenedBroken = node.properties.target !== undefined
      }
    })
    expect(hrefAfter).toBeDefined()
    expect(hardenedBroken, 'unparseable href must skip hardening via the catch path').toBe(false)
  })

  it('safeUrl edge branches: unresolvable hosts and encoded data schemes', () => {
    expect(safeUrl('https://exa%zzple.com', false)).toBeUndefined()
    expect(safeUrl('%64ata:image/png;base64,iVBOR', true)).toBe('%64ata:image/png;base64,iVBOR')
    expect(safeUrl('%64ata:text/html,<x>', true)).toBeUndefined()
  })

  it('link hardening skips anchors without properties, non-scheme hrefs, and mailto', async () => {
    const { linkHardening } = await import('../src/pipeline/plugins/links')

    const harden = linkHardening()
    const bare = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: undefined,
          children: [],
        } as unknown as Record<string, unknown>,
      ],
    }
    ;(harden as unknown as (tree: unknown) => void)(bare)
    const bareAnchor = bare.children[0] as { properties?: Record<string, unknown> }
    expect(bareAnchor.properties).toEqual({})

    const { unified } = await import('unified')
    const remarkParse = (await import('remark-parse')).default
    const remarkRehype = (await import('remark-rehype')).default
    const p = unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(linkHardening)

    const tree = (await p.run(p.parse('[rel](/docs) [mail](mailto:a@b.c)'))) as Root
    const targets: unknown[] = []
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a') targets.push(node.properties.target)
    })
    expect(targets).toHaveLength(2)
    expect(targets.every((t) => t === undefined)).toBe(true)
  })
})
