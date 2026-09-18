// Phase 3.1 (android-to-desktop-checklist.md §1/§4): lightweight view-state
// routing. Only 6 fixed destinations exist, so a typed union + reducer is
// used instead of pulling in a router dependency — matches this repo's
// existing pattern of using only the framework surface actually needed.
import { createContext, useContext } from 'react'

export type Route = 'welcome' | 'reader' | 'settings' | 'help' | 'about' | 'privacy'

export type RouteAction = { type: 'NAVIGATE'; to: Route } | { type: 'BACK' }

const SUB_SCREENS: ReadonlySet<Route> = new Set(['settings', 'help', 'about', 'privacy'])

export function createInitialRoute(): Route {
  // checklist §1: Welcome is cold-launch-only. A document opened via
  // CLI args / OS "open with" (Phase 5.1) must construct with 'reader'
  // directly instead of calling this — this default is for a bare cold
  // launch with no document.
  return 'welcome'
}

export function routeReducer(route: Route, action: RouteAction): Route {
  switch (action.type) {
    case 'NAVIGATE':
      return action.to
    case 'BACK':
      // checklist §4: from a sub-screen, Back/Escape returns to reader;
      // from welcome/reader there's nothing to go back to.
      return SUB_SCREENS.has(route) ? 'reader' : route
    default:
      return route
  }
}

export interface RouteContextValue {
  route: Route
  navigate: (to: Route) => void
  back: () => void
}

export const RouteContext = createContext<RouteContextValue>({
  route: 'welcome',
  navigate: () => {},
  back: () => {},
})

export function useRoute(): RouteContextValue {
  return useContext(RouteContext)
}
