import os
from playwright.sync_api import sync_playwright
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{s}" height="{s}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3906f"/><stop offset="1" stop-color="#c8542d"/></linearGradient></defs>
<rect width="64" height="64" rx="14" fill="url(#g)"/>
<path d="M43.5 23.2 A13.5 13.5 0 1 0 43.5 40.8" fill="none" stroke="#fff" stroke-width="7.5"/></svg>'''
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    for s in (16, 32, 48, 128):
        pg.set_viewport_size({'width': s, 'height': s})
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.format(s=s)}</body></html>')
        pg.screenshot(path=f'public/icons/icon-{s}.png', omit_background=True, clip={'x':0,'y':0,'width':s,'height':s})
    b.close()
print(os.listdir('public/icons'))
