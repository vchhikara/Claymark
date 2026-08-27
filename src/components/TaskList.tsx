import type { ReactElement, ReactNode } from 'react'

export interface TaskListItemProps {
  checked?: boolean
  children: ReactNode
}

// T-P8-01: the checkbox needs an accessible name. Task text is usually
// several inline React elements (emphasis, links, ...), not a plain string,
// so a computed `aria-label` can't reliably capture it — wrapping the
// checkbox and its text in a native <label> gives the input an accessible
// name from its rendered content regardless of that content's shape,
// exactly like a hand-authored `<label><input type=checkbox> text</label>`.
export function TaskListItem({ checked, children }: TaskListItemProps): ReactElement {
  return (
    <li className="claymark-li claymark-task-item">
      <label className="claymark-task-label-wrap">
        <input
          type="checkbox"
          className="claymark-task-checkbox"
          checked={checked}
          disabled
          readOnly
          aria-checked={checked ? 'true' : 'false'}
        />
        <span className="claymark-task-label">{children}</span>
      </label>
    </li>
  )
}
