import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  'aria-label': string
  children: ReactNode
}

export function IconButton({
  children,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button className={`icon-button ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  )
}
