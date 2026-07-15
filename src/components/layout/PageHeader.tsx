import { useId, type ReactNode } from 'react'

interface PageHeaderProps {
  actions?: ReactNode
  description: string
  eyebrow?: string
  status?: ReactNode
  title: string
}

export function PageHeader({ actions, description, eyebrow, status, title }: PageHeaderProps) {
  const titleId = useId()

  return (
    <header className="page-header" aria-labelledby={titleId}>
      <div className="page-header-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
        {status ? <div className="page-header-status">{status}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  )
}
