import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'

export function FormLabel({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`form-label ${className}`.trim()} {...props} />
}

export function FormHint({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`form-hint ${className}`.trim()} {...props} />
}

export function FormError({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`form-error ${className}`.trim()} role="alert" {...props} />
}

interface FieldGroupProps {
  children: ReactNode
  className?: string
}

export function FieldGroup({ children, className = '' }: FieldGroupProps) {
  return <div className={`field-group ${className}`.trim()}>{children}</div>
}
