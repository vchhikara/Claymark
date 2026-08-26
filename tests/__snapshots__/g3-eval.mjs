import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.env.CLAYMARK_ROOT;
const repoRequire = createRequire(join(REPO, 'package.json'));

const mdContent = readFileSync(join(REPO, 'tests/fixtures/reference.md'), 'utf8');
const tokensCSS = readFileSync(join(REPO, 'src/theme/tokens.css'), 'utf8');
const claymarkCSS = readFileSync(join(REPO, 'src/theme/claymark.css'), 'utf8');

const FONTS = [
  ['Source Serif 4', 400, 'source-serif-4-latin-400-normal.woff2'],
  ['Source Serif 4', 600, 'source-serif-4-latin-600-normal.woff2'],
  ['Inter', 400, 'inter-latin-400-normal.woff2'],
  ['Inter', 600, 'inter-latin-600-normal.woff2'],
  ['JetBrains Mono', 400, 'jetbrains-mono-latin-400-normal.woff2'],
  ['JetBrows Mono', 700, 'jetbrains-mono-latin-700-normal.woff2'],
];

function fontFaces() {
  return FONTS.map(([family, weight, file]) => {
    const b64 = readFileSync(join(REPO, 'public/fonts', file)).toString('base64');
    return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  }).join('\n');
}

const { processor } = await import(join(REPO, 'src/pipeline/processor.ts'));
const { toReact } = await import(join(REPO, 'src/pipeline/to-react.tsx'));
const { DEFAULT_COMPONENTS } = await import(join(REPO, 'src/components/map.tsx'));
const { MarkdownRoot } = await import(join(REPO, 'src/components/MarkdownRoot.tsx'));
const { createElement } = repoRequire('react');
const { renderToStaticMarkup } = repoRequire('react-dom/server');

async function generatePage(theme) {
  const tree = processor.parse(mdContent);
  const processedTree = await processor.run(tree);
  const content = toReact(processedTree, { components: DEFAULT_COMPONENTS });
  const html = renderToStaticMarkup(createElement(MarkdownRoot, { theme }, content));
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head><meta charset="utf-8"><style>
${fontFaces()}
${tokensCSS}
${claymarkCSS}
html,body{margin:0;padding:0;background:hsl(var(--surface));color:hsl(var(--text-primary));}
</style></head>
<body>${html}</body></html>`;
}

async function testG3Criteria(theme) {
  const pageContent = await generatePage(theme);
  const tmpHtml = `/tmp/opencode/test-g3-${theme}.html`;
  writeFileSync(tmpHtml, pageContent);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`file://${tmpHtml}`, { waitUntil: 'load' });
  
  const results = {};
  
  // C4: max-width should resolve via --measure CSS var on .claymark-root
  results.c4_max_width = await page.evaluate(() => {
    const container = document.querySelector('.claymark-root');
    return container ? window.getComputedStyle(container).maxWidth : 'not found';
  });
  console.log(`${theme}: C4 max-width = ${results.c4_max_width}`);
  
  // C5: h2 font-size must be strictly larger than h3
  results.c5_h2_h3 = await page.evaluate(() => {
    const h2 = document.querySelector('.claymark-h2');
    const h3 = document.querySelector('.claymark-h3');
    if (!h2 || !h3) return 'not found';
    const h2fs = parseFloat(window.getComputedStyle(h2).fontSize);
    const h3fs = parseFloat(window.getComputedStyle(h3).fontSize);
    return h2fs > h3fs ? 'PASS' : `FAIL (h2=${h2fs}px, h3=${h3fs}px)`;
  });
  console.log(`${theme}: C5 h2>h3 = ${results.c5_h2_h3}`);
  
  // C7: 3-level list markers must all be distinct (check computed list-style-type on each li)
  results.c7_list_markers = await page.evaluate(() => {
    const lis = document.querySelectorAll('.claymark-li');
    if (lis.length < 3) return 'not enough lis';
    const markerTypes = Array.from(lis).map(li => {
      return window.getComputedStyle(li).listStyleType;
    });
    const unique = new Set(markerTypes).size;
    return unique >= 3 ? `PASS (${unique} distinct: ${Array.from(new Set(markerTypes)).join(', ')})` : `FAIL (only ${unique} distinct: ${markerTypes.join(', ')})`;
  });
  console.log(`${theme}: C7 list markers = ${results.c7_list_markers}`);
  
  await browser.close();
  return results;
}

(async () => {
  console.log('=== LIGHT ===');
  await testG3Criteria('light');
  console.log('=== DARK ===');
  await testG3Criteria('dark');
})();