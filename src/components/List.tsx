import type { ReactElement, ReactNode } from 'react'

export interface ListProps {
  ordered?: boolean
  start?: number
  children: ReactNode
}

export function List({ ordered, start, children }: ListProps): ReactElement {
  if (ordered) {
    return (
      <ol className="claymark-list claymark-ol" start={start}>
        {children}
      </ol>
    )
  }
  return <ul className="claymark-list claymark-ul">{children}</ul>
}

export interface ListItemProps {
  children: ReactNode
}

export function ListItem({ children }: ListItemProps): ReactElement {
  return <li className="claymark-li">{children}</li>
}
