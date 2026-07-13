import { Button } from './Button'

interface ErrorStateProps {
  actionLabel?: string
  eyebrow?: string
  href?: string
  message: string
  onAction?: () => void
  reference?: string
  title: string
}

export function ErrorState({
  actionLabel,
  eyebrow = 'SOMETHING WENT WRONG',
  href,
  message,
  onAction,
  reference,
  title,
}: ErrorStateProps) {
  return (
    <section className="state error-state" aria-labelledby="error-state-title" role="alert">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="error-state-title">{title}</h1>
      <p>{message}</p>
      {reference ? <small>Reference: {reference}</small> : null}
      {actionLabel && href ? (
        <a className="button button-primary" href={href}>
          {actionLabel}
        </a>
      ) : actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </section>
  )
}
