import { useId, type InputHTMLAttributes } from 'react'

import { FormError, FormHint, FormLabel } from './FormField'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  hint?: string
  label: string
  optional?: boolean
}

export function TextField({
  error,
  hint,
  id,
  label,
  optional = false,
  required,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className="field">
      <FormLabel htmlFor={inputId}>
        {label}
        {optional ? <span className="form-optional">Optional</span> : null}
      </FormLabel>
      <input
        aria-describedby={error || hint ? messageId : undefined}
        aria-invalid={Boolean(error)}
        id={inputId}
        required={required}
        {...props}
      />
      {error ? (
        <FormError id={messageId}>{error}</FormError>
      ) : hint ? (
        <FormHint id={messageId}>{hint}</FormHint>
      ) : null}
    </div>
  )
}
