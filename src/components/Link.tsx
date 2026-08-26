import type { ReactElement, ReactNode } from 'react'

export interface LinkProps {
  href?: string | undefined
  title?: string | undefined
  target?: string | undefined
  rel?: string | string[] | undefined
  children: ReactNode
}

export function Link({ href, title, target, rel, children }: LinkProps): ReactElement {
  const external = target === '_blank'
  const relValue = Array.isArray(rel) ? rel.join(' ') : rel
  return (
    <a
      className={`claymark-link${external ? ' claymark-link--external' : ''}`}
      href={href}
      title={title}
      target={target}
      rel={relValue}
    >
      {children}
    </a>
  )
}
