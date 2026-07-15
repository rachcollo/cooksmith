import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean
  busyLabel?: string
  children: ReactNode
  variant?: ButtonVariant
}

export function Button({
  busy = false,
  busyLabel = 'Working',
  children,
  className = '',
  disabled,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={busy || undefined}
      className={`button button-${variant} ${className}`.trim()}
      disabled={disabled || busy}
      type={type}
      {...props}
    >
      {busy ? <span className="button-spinner" aria-hidden="true" /> : null}
      <span>{busy ? busyLabel : children}</span>
    </button>
  )
}
