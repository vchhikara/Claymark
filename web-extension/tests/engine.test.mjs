import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
await build({ entryPoints: ['tests/engine.test.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'tests/.out/engine.mjs', logLevel: 'error' })
execFileSync('node', ['tests/.out/engine.mjs'], { stdio: 'inherit' })
