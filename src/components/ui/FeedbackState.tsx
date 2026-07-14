import { useId, type ReactNode } from 'react'

type FeedbackTone = 'success' | 'error' | 'info'

interface FeedbackStateProps {
  action?: ReactNode
  message: string
  title: string
  tone?: FeedbackTone
}

export function FeedbackState({ action, message, title, tone = 'info' }: FeedbackStateProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`feedback feedback-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <div>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
      </div>
      {action}
    </section>
  )
}
