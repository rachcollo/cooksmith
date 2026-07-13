import type { ReactNode } from 'react'

interface EmptyStateProps {
  action?: ReactNode
  message: string
  title: string
}

export function EmptyState({ action, message, title }: EmptyStateProps) {
  return (
    <section className="state" aria-labelledby="empty-state-title">
      <p className="eyebrow">NOTHING NEEDED YET</p>
      <h2 id="empty-state-title">{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  )
}
