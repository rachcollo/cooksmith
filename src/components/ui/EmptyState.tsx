import { useId, type ReactNode } from 'react'

interface EmptyStateProps {
  action?: ReactNode
  message: string
  title: string
}

export function EmptyState({ action, message, title }: EmptyStateProps) {
  const titleId = useId()

  return (
    <section className="state state-card" aria-labelledby={titleId}>
      <p className="eyebrow">NOTHING NEEDED YET</p>
      <h2 id={titleId}>{title}</h2>
      <p>{message}</p>
      {action ? <div className="state-actions">{action}</div> : null}
    </section>
  )
}
