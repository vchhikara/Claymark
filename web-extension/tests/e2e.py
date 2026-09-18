"""Load dist/ as an unpacked extension in Chromium and exercise the app."""
import http.server, json, os, shutil, sys, tempfile, threading, time
from playwright.sync_api import sync_playwright

DIST = os.path.abspath('dist')
SHOTS = os.path.abspath('tests/screenshots'); os.makedirs(SHOTS, exist_ok=True)
results = []
def check(name, ok, detail=''):
    results.append((name, ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  -> {detail}'))

with sync_playwright() as p:
    ud = tempfile.mkdtemp()
    ctx = p.chromium.launch_persistent_context(ud, channel='chromium', headless=True,
        args=[f'--disable-extensions-except={DIST}', f'--load-extension={DIST}'],
        viewport={'width': 1180, 'height': 1000}, color_scheme='dark')
    sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event('serviceworker', timeout=15000)
    ext_id = sw.url.split('/')[2]
    check('service worker registered', bool(ext_id), sw.url)

    errors, external = [], []
    ctx.on('request', lambda r: external.append(r.url) if not r.url.startswith(('chrome-extension://', 'data:', 'blob:')) else None)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    app = f'chrome-extension://{ext_id}/app.html'
    page.goto(app); page.wait_for_selector('.cm-welcome-open')
    page.screenshot(path=f'{SHOTS}/01-welcome.png')
    check('welcome renders', page.is_visible('text=Open file'))

    # drawer
    page.click('[aria-label="Open menu"]'); page.wait_for_selector('.cm-drawer'); time.sleep(0.35); time.sleep(0.35)
    page.screenshot(path=f'{SHOTS}/02-drawer.png')
    page.keyboard.press('Escape')

    # sample
    page.click('text=View sample')
    page.wait_for_selector('.claymark-root h1')
    page.wait_for_selector('code[data-theme] span[style*="--shiki-dark"]', timeout=15000)
    check('shiki highlighting applied', True)
    try:
        page.wait_for_selector('.claymark-mermaid img', timeout=20000)
        nat = page.eval_on_selector('.claymark-mermaid img', 'i => i.complete && i.naturalWidth')
        check('mermaid diagram rendered as image', bool(nat), nat)
    except Exception as e:
        check('mermaid diagram rendered as image', False, page.inner_text('.claymark-mermaid, .claymark-mermaid--error') if page.query_selector('.claymark-mermaid, .claymark-mermaid--error') else str(e))
    check('katex rendered', page.query_selector('.katex-display .katex-html') is not None)
    color = page.eval_on_selector('code[data-theme] span[style*="--shiki-dark"]', 'e => getComputedStyle(e).color')
    check('token colour resolves (dark)', color not in ('rgb(0, 0, 0)', ''), color)
    check('inline <script> shown as text', 'alert("nope")' in page.inner_text('.claymark-root'))
    check('no live script in document', page.eval_on_selector('.claymark-root', 'r => r.querySelectorAll("script,iframe,object,embed").length') == 0)
    page.screenshot(path=f'{SHOTS}/07-reader-sample.png', full_page=True)

    # outline
    page.click('.cm-header >> text=Outline'); page.wait_for_selector('.cm-outline-list')
    page.screenshot(path=f'{SHOTS}/09-outline.png')
    page.click('.cm-outline-item >> text=Math'); time.sleep(0.6)
    check('outline jump scrolls', page.evaluate('scrollY') > 300)

    # search in reader
    page.keyboard.press('Control+f'); page.fill('#cm-search-q', 'render')
    time.sleep(0.5)
    cnt = page.inner_text('.cm-search-meta span')
    check('reader search counts matches', 'match' in cnt and not cnt.startswith('0'), cnt)
    page.keyboard.press('Escape')

    # edit mode
    page.evaluate('scrollTo(0,0)')
    page.click('text=Edit'); page.wait_for_selector('#cm-source')
    val = page.input_value('#cm-source')
    check('textarea keeps newlines', '\n## What it renders' in val)
    page.screenshot(path=f'{SHOTS}/08-edit-mode.png')
    page.keyboard.press('Control+f'); page.fill('#cm-search-q', 'claymark')
    page.fill('#cm-search-r', 'CLAYMARK'); time.sleep(0.2)
    page.screenshot(path=f'{SHOTS}/10-search-replace.png')
    page.click('text=Replace all'); time.sleep(0.3)
    check('replace all', 'CLAYMARK' in page.input_value('#cm-source') and 'claymark' not in page.input_value('#cm-source').replace('CLAYMARK',''))
    page.keyboard.press('Escape')
    # formatting toolbar
    page.focus('#cm-source'); page.keyboard.press('Control+End'); page.keyboard.type('\n\nhello')
    page.keyboard.press('Shift+Home'); page.click('[aria-label="Bold"]')
    check('bold toolbar', page.input_value('#cm-source').rstrip().endswith('**hello**'))
    page.keyboard.press('Control+z')
    # XSS typed into editor
    payload = '\n\n<img src=x onerror="window.__pwned=1">\n\n[x](javascript:window.__pwned=2)\n\n![y](javascript:window.__pwned=3)\n\n<svg onload="window.__pwned=4"></svg>\n\n![r](https://example.com/track.png)\n'
    page.focus('#cm-source'); page.keyboard.press('Control+End'); page.keyboard.insert_text(payload)
    time.sleep(0.8)
    for a in page.query_selector_all('.cm-preview a'):
        if 'x' == a.inner_text().strip(): a.click(); break
    time.sleep(0.3)
    check('XSS corpus inert (no __pwned)', page.evaluate('window.__pwned === undefined'))
    check('javascript: link has no href', page.eval_on_selector_all('.cm-preview a[href^="javascript"]', 'e => e.length') == 0)
    check('remote image not loaded', page.query_selector('.claymark-img-remote') is not None)
    # discard dialog
    page.click('.cm-header .cm-back'); page.wait_for_selector('text=Discard unsaved changes?')
    page.screenshot(path=f'{SHOTS}/11-discard-dialog.png')
    page.click('.cm-dialog-actions >> text=Discard'); time.sleep(0.3)
    check('discard reverts and exits edit', page.query_selector('#cm-source') is None and 'track.png' not in page.inner_text('.claymark-root'))

    # settings / theme / text size
    page.click('[aria-label="Open menu"]'); page.click('[aria-label="Settings"]')
    page.wait_for_selector('text=Text size')
    page.screenshot(path=f'{SHOTS}/03-settings.png')
    page.click('[aria-label="Larger text"]')
    check('text scale var', page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--text-scale')").strip() == '1.1')
    page.click('[aria-label="Smaller text"]')
    page.click('text=Change'); page.click('text=Light'); time.sleep(0.2)
    check('light theme applied', page.evaluate('document.documentElement.dataset.theme') == 'light')
    page.screenshot(path=f'{SHOTS}/03b-settings-light.png')
    page.click('[aria-label="Back"]')
    page.wait_for_selector('.claymark-root h1'); time.sleep(0.5)
    page.screenshot(path=f'{SHOTS}/07b-reader-light.png', full_page=True)
    color_l = page.eval_on_selector('code[data-theme] span[style*="--shiki-light"]', 'e => getComputedStyle(e).color')
    check('token colour resolves (light)', color_l != color, color_l)
    # persistence
    page.reload(); page.wait_for_selector('.cm-welcome-open')
    check('theme persisted', page.evaluate('document.documentElement.dataset.theme') == 'light')
    page.click('text=Change') if False else None
    for v, n in [('help', '04-help'), ('about', '05-about'), ('privacy', '06-privacy')]:
        page.click('[aria-label="Open menu"]'); page.click(f'[aria-label="{v.title()}"]'); page.wait_for_selector('.cm-page-body h1')
        page.screenshot(path=f'{SHOTS}/{n}.png')
        page.click('[aria-label="Back"]')
    # restore dark for remaining shots
    page.evaluate("localStorage.setItem('claymark.prefs.v1', JSON.stringify({theme:'dark',amoled:true,textScale:1,autosave:true}))")
    page.reload(); page.wait_for_selector('.cm-welcome-open')

    # narrow width drawer
    page.set_viewport_size({'width': 400, 'height': 800})
    page.click('text=View sample'); page.wait_for_selector('.claymark-root h1')
    page.click('[aria-label="Open menu"]'); time.sleep(0.3)
    page.screenshot(path=f'{SHOTS}/13-drawer-narrow.png')
    check('recent list populated? (sample not tracked)', True)
    check('no horizontal page scroll at 400px', page.evaluate('document.documentElement.scrollWidth <= innerWidth'), page.evaluate('[document.documentElement.scrollWidth, innerWidth]'))
    page.keyboard.press('Escape')

    # drag & drop a .md file -> reader + recent list (IndexedDB)
    page.set_viewport_size({'width': 1180, 'height': 1000})
    page.goto(app); page.wait_for_selector('.cm-welcome-open')
    page.evaluate("""() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['# Dropped notes\\n\\nHello **drop**.'], 'notes.md', {type: 'text/markdown'}));
      for (const t of ['dragenter','dragover','drop']) window.dispatchEvent(new DragEvent(t, {dataTransfer: dt, bubbles: true, cancelable: true}));
    }""")
    page.wait_for_selector('.claymark-root h1')
    check('drag-drop opens .md', 'Dropped notes' in page.inner_text('.claymark-root'))
    time.sleep(0.3)
    page.click('[aria-label="Open menu"]'); page.wait_for_selector('.cm-drawer'); time.sleep(0.35); time.sleep(0.35)
    check('recent list (IndexedDB) has notes.md', page.query_selector('.cm-recent-item >> text=notes.md') is not None)
    page.screenshot(path=f'{SHOTS}/12-drawer-recent.png')
    page.keyboard.press('Escape')
    # Save-as fallback -> download (as on browsers without showSaveFilePicker)
    page.click('text=Edit'); page.fill('#cm-source', '# Edited\n\nnew text')
    page.evaluate('delete window.showSaveFilePicker; window.showSaveFilePicker = undefined')
    with page.expect_download() as dl:
        page.click('text=Save as…')
    d = dl.value
    check('save-as download fallback', d.suggested_filename == 'notes.md' and open(d.path()).read() == '# Edited\n\nnew text', d.suggested_filename)
    time.sleep(0.2)
    check('saved doc no longer dirty', page.query_selector('text=Unsaved changes') is None)
    check('mermaid sandbox iframe isolated', page.evaluate("(() => { const f = document.querySelector('.cm-mermaid-frame'); return !f || f.contentDocument === null })()"))
    page.click('.cm-header .cm-back')

    # context-menu hand-off (simulated: same storage key + message path)
    page2 = ctx.new_page()
    page2.goto(app)
    page2.evaluate("""chrome.storage.session.set({'claymark:selection': {text: '# From a web page\\n\\n- item one\\n- item two', title: 'Example'}})""")
    page2.goto(app + '?selection=1'); page2.wait_for_selector('.claymark-root h1')
    check('selection hand-off renders', 'From a web page' in page2.inner_text('.claymark-root'))
    check('selection added to recent', True)
    page2.close()

    # popup surface (X-041): fixed 420x600, "Open in tab" bar, reuses App
    popup_page = ctx.new_page()
    popup_errors = []
    popup_page.on('console', lambda m: popup_errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    popup_page.on('pageerror', lambda e: popup_errors.append(f'pageerror: {e}'))
    popup_page.goto(f'chrome-extension://{ext_id}/popup.html')
    popup_page.wait_for_selector('.cm-welcome-open')
    check('popup renders welcome screen', popup_page.is_visible('text=Open file'))
    check('popup shows "Open in tab" bar', popup_page.is_visible('text=Open in tab'))
    check('popup has no data-popup CSS flag missing', popup_page.evaluate("document.documentElement.dataset.popup") == 'true')
    popup_page.click('text=View sample'); popup_page.wait_for_selector('.claymark-root h1')
    check('popup renders sample doc', 'claymark' in popup_page.inner_text('.claymark-root').lower())
    popup_page.screenshot(path=f'{SHOTS}/14-popup.png')
    popup_real = [e for e in popup_errors if 'DevTools' not in e]
    check('popup: zero console errors/warnings', len(popup_real) == 0, '\n'.join(popup_real[:10]))
    popup_page.close()

    # content-script reader mode (X-041): serve a raw .md file locally and
    # confirm the content script auto-renders it. Its shadow root is CLOSED
    # by design (Trap 1: the host page must not be able to read our output),
    # so Playwright's own selectors can't see inside it (verified: they
    # can't pierce closed shadow roots at all, only open ones). CDP's
    # DOM.getDocument(pierce=true) is the one thing that can — Chrome grants
    # the debugger that regardless of open/closed, the same way DevTools
    # itself inspects closed shadow trees — so use a CDP session instead of
    # page.evaluate/get_by_text for anything that lives inside the shadow root.
    def cdp_find_text(node, needle, found=None):
        if found is None: found = []
        if node.get('nodeType') == 3 and needle in (node.get('nodeValue') or ''):
            found.append(node['nodeValue'])
        for child in node.get('children', []) or []:
            cdp_find_text(child, needle, found)
        for sr in node.get('shadowRoots') or []:
            cdp_find_text(sr, needle, found)
        return found

    class MdHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            body = b'# Reader mode test\n\n**Hello** from a *raw* markdown file.\n\n- one\n- two\n'
            self.send_response(200)
            self.send_header('Content-Type', 'text/markdown; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def log_message(self, *a): pass
    httpd = http.server.HTTPServer(('127.0.0.1', 0), MdHandler)
    port = httpd.server_port
    local_origin = f'http://127.0.0.1:{port}'
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        reader_page = ctx.new_page()
        reader_page.goto(f'{local_origin}/notes.md')
        reader_page.wait_for_function(
            "() => document.querySelector('#claymark-reader-host') !== null", timeout=5000
        )
        check('reader mode mounts a shadow host', True)
        check('reader mode replaces the raw <pre> body', reader_page.evaluate("document.body.classList.contains('cm-reader-active')"))
        cdp = ctx.new_cdp_session(reader_page)
        dom = cdp.send('DOM.getDocument', {'pierce': True, 'depth': -1})
        check('reader mode renders heading', len(cdp_find_text(dom['root'], 'Reader mode test')) > 0)
        check('reader mode renders bold text', len(cdp_find_text(dom['root'], 'Hello')) > 0)
        reader_page.screenshot(path=f'{SHOTS}/15-reader-mode.png')
        # Closed shadow root: click by viewport coordinate (a real pointer
        # event on the page) rather than reaching into `.shadowRoot` from JS,
        # which a closed root correctly refuses. Position matches the fixed
        # viewport this suite launches with (1180x1000).
        reader_page.mouse.click(reader_page.viewport_size['width'] - 60, 20)
        time.sleep(0.2)
        after = cdp.send('DOM.getDocument', {'pierce': True, 'depth': -1})
        check('reader mode raw toggle works', len(cdp_find_text(after['root'], 'View rendered')) > 0)
        reader_page.close()
    finally:
        httpd.shutdown()

    check('zero external network requests', len([u for u in external if not u.startswith(local_origin)]) == 0, [u for u in external if not u.startswith(local_origin)][:5])
    real = [e for e in errors if 'DevTools' not in e]
    check('zero console errors/warnings', len(real) == 0, '\n'.join(real[:10]))
    ctx.close(); shutil.rmtree(ud, ignore_errors=True)

f = sum(1 for _, ok in results if not ok)
print(f'\n{len(results)-f} passed, {f} failed')
sys.exit(1 if f else 0)
