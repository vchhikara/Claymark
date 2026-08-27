// T-P9-05 — Responsive verification at three breakpoints.
//
// This drives real chromium via the bare `playwright` package directly
// (not the `playwright test` runner — see Advisory AD-005 in
// plan/04-STATE-LEDGER.md: `@playwright/test` is not installed and no
// playwright.config.* exists in this repo, so `pnpm test:visual` is a
// non-functional entry point). This spec instead runs under vitest,
// which IS the project's working test runner, following the same
// precedent as tests/__snapshots__/g3-eval.mjs.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium, type Browser } from 'playwright'
import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = join(process.cwd(), 'dist/app')

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function startServer(): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        let filePath = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname)
        let body: Buffer
        try {
          body = await readFile(filePath)
        } catch {
          // SPA fallback for any unresolved path
          filePath = join(DIST, 'index.html')
          body = await readFile(filePath)
        }
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' })
        res.end(body)
      } catch (err) {
        res.writeHead(500)
        res.end(String(err))
      }
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') resolve({ server, port: addr.port })
      else reject(new Error('failed to bind server'))
    })
  })
}

describe('T-P9-05 — Responsive layout (320px / 768px / 1024px)', () => {
  let server: Server
  let port: number
  let browser: Browser

  beforeAll(async () => {
    ;({ server, port } = await startServer())
    browser = await chromium.launch({ headless: true })
  }, 30_000)

  afterAll(async () => {
    await browser?.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  const breakpoints = [320, 768, 1024]

  for (const width of breakpoints) {
    it(`no horizontal overflow at ${width}px`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 800 } })
      const page = await context.newPage()
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' })
      // give the app a moment to mount and render its content
      await page.waitForTimeout(300)

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      await context.close()

      expect(scrollWidth, `scrollWidth (${scrollWidth}) must not exceed clientWidth (${clientWidth}) at ${width}px`).toBeLessThanOrEqual(clientWidth)
    }, 20_000)
  }
})
