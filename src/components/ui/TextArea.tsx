import { useId, type TextareaHTMLAttributes } from 'react'

import { FormError, FormHint, FormLabel } from './FormField'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  hint?: string
  label: string
  optional?: boolean
}

export function TextArea({ error, hint, id, label, optional = false, ...props }: TextAreaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className="field">
      <FormLabel htmlFor={inputId}>
        {label}
        {optional ? <span className="form-optional">Optional</span> : null}
      </FormLabel>
      <textarea
        aria-describedby={error || hint ? messageId : undefined}
        aria-invalid={Boolean(error)}
        id={inputId}
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
