import { useId, type SelectHTMLAttributes } from 'react'

import { FormError, FormHint, FormLabel } from './FormField'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  hint?: string
  label: string
}

export function SelectField({ children, error, hint, id, label, ...props }: SelectFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className="field">
      <FormLabel htmlFor={inputId}>{label}</FormLabel>
      <select
        aria-describedby={error || hint ? messageId : undefined}
        aria-invalid={Boolean(error)}
        id={inputId}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <FormError id={messageId}>{error}</FormError>
      ) : hint ? (
        <FormHint id={messageId}>{hint}</FormHint>
      ) : null}
    </div>
  )
}
