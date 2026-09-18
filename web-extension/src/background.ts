/// <reference types="chrome" />
/* MV3 service worker: opens/focuses the app tab, context-menu hand-off. */
const APP = chrome.runtime.getURL('app.html')

async function openApp(query = ''): Promise<void> {
  const tabs = await chrome.tabs.query({ url: APP + '*' })
  const tab = tabs[0]
  if (tab?.id !== undefined) {
    await chrome.tabs.update(tab.id, { active: true })
    if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true })
    if (query) chrome.tabs.sendMessage(tab.id, { type: 'claymark:selection' }).catch(() => {})
    return
  }
  await chrome.tabs.create({ url: APP + query })
}

// The toolbar icon now opens `default_popup` (manifest.json) directly, so
// `action.onClicked` never fires — the full-tab surface is reached instead
// via the "Open in tab" button inside the popup, the context-menu action
// below, or the `open-full-tab` command (Alt+Shift+M by default).
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'open-full-tab') void openApp()
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'claymark-open-selection', title: 'Open selection in Claymark', contexts: ['selection'] })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'claymark-open-selection') return
  let text = info.selectionText ?? ''
  // selectionText collapses newlines; read the real selection when we can (activeTab grant).
  if (tab?.id !== undefined) {
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: info.frameId !== undefined ? [info.frameId] : undefined },
        func: () => String(getSelection() ?? ''),
      })
      if (typeof r?.result === 'string' && r.result.trim()) text = r.result
    } catch {
      /* restricted page (chrome://, web store) — fall back to selectionText */
    }
  }
  await chrome.storage.session.set({ 'claymark:selection': { text, title: tab?.title ?? '' } })
  await openApp('?selection=1')
})
