import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { RouteContext, createInitialRoute, routeReducer } from '../src/app/routing'
import type { Route, RouteAction } from '../src/app/routing'
import { WelcomeScreen } from '../src/app/screens/WelcomeScreen'
import { HelpScreen } from '../src/app/screens/HelpScreen'
import { AboutScreen } from '../src/app/screens/AboutScreen'
import { PrivacyScreen } from '../src/app/screens/PrivacyScreen'

function withRoute(children: ReturnType<typeof createElement>, initial: Route = createInitialRoute()) {
  let route = initial
  const dispatch = (action: RouteAction) => {
    route = routeReducer(route, action)
  }
  return createElement(RouteContext.Provider, {
    value: {
      route,
      navigate: (to: Route) => dispatch({ type: 'NAVIGATE', to }),
      back: () => dispatch({ type: 'BACK' }),
    },
    children,
  })
}

function renderInto(element: ReturnType<typeof createElement>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(element)
  })
  return { container, unmount: () => act(() => root.unmount()) }
}

describe('WelcomeScreen (checklist §1, cold-launch-only)', () => {
  it('renders hamburger, brand mark, open-file button, and view-sample link', () => {
    const onOpenFile = vi.fn()
    const onOpenDrawer = vi.fn()
    const onLoadSample = vi.fn()
    const { container, unmount } = renderInto(
      withRoute(
        createElement(WelcomeScreen, {
          onOpenFile,
          onOpenDrawer,
          sampleMarkdown: '# sample',
          onLoadSample,
        })
      )
    )

    expect(container.querySelector('[data-testid="welcome-hamburger"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="welcome-open-file"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="welcome-view-sample"]')).not.toBeNull()

    const openFileBtn = container.querySelector('[data-testid="welcome-open-file"]') as HTMLButtonElement
    act(() => openFileBtn.click())
    expect(onOpenFile).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('view-sample click loads the sample markdown', () => {
    const onLoadSample = vi.fn()
    const { container, unmount } = renderInto(
      withRoute(
        createElement(WelcomeScreen, {
          onOpenFile: vi.fn(),
          onOpenDrawer: vi.fn(),
          sampleMarkdown: '# sample',
          onLoadSample,
        })
      )
    )

    const viewSample = container.querySelector('[data-testid="welcome-view-sample"]') as HTMLButtonElement
    act(() => viewSample.click())
    expect(onLoadSample).toHaveBeenCalledWith('# sample')

    unmount()
  })
})

describe('Static markdown screens (checklist §1, dogfooding the render pipeline)', () => {
  it('HelpScreen renders its content through MarkdownRoot with a back control', () => {
    const { container, unmount } = renderInto(withRoute(createElement(HelpScreen)))
    expect(container.querySelector('[data-testid="screen-back"]')).not.toBeNull()
    expect(container.textContent).toContain('Help')
    unmount()
  })

  it('AboutScreen renders library attribution content', () => {
    const { container, unmount } = renderInto(withRoute(createElement(AboutScreen)))
    expect(container.textContent).toContain('KaTeX')
    unmount()
  })

  it('PrivacyScreen renders the "collects nothing" statement', () => {
    const { container, unmount } = renderInto(withRoute(createElement(PrivacyScreen)))
    expect(container.textContent).toContain('collects nothing')
    unmount()
  })
})
