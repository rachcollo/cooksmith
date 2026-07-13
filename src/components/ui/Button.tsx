import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button className={`button button-${variant} ${className}`.trim()} type={type} {...props} />
  )
}
