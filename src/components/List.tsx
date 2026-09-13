import type { ReactElement, ReactNode } from 'react'

// DEF-001 (knip dead-export audit): the exported `List`/`ListProps` pair that
// used to live here duplicated `map.tsx`'s own `ListAdapter` (same
// `claymark-list`/`claymark-ol`/`claymark-ul` markup) and was never actually
// used by DEFAULT_COMPONENTS or anything else — `ul`/`ol` render through
// `ListAdapter` directly. Removed rather than kept as dead, divergence-prone
// duplicate logic.

export interface ListItemProps {
  children: ReactNode
}

export function ListItem({ children }: ListItemProps): ReactElement {
  return <li className="claymark-li">{children}</li>
}
