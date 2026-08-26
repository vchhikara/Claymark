import type { ReactElement, ReactNode } from 'react'

export interface TaskListItemProps {
  checked?: boolean
  children: ReactNode
}

export function TaskListItem({ checked, children }: TaskListItemProps): ReactElement {
  return (
    <li className="claymark-li claymark-task-item">
      <input
        type="checkbox"
        className="claymark-task-checkbox"
        checked={checked}
        disabled
        readOnly
        aria-checked={checked ? 'true' : 'false'}
        aria-label={typeof children === 'string' ? children : undefined}
      />
      <span className="claymark-task-label">{children}</span>
    </li>
  )
}
