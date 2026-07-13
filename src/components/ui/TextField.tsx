import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  hint?: string
  label: string
}

export function TextField({ error, hint, id, label, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        aria-describedby={error || hint ? messageId : undefined}
        aria-invalid={Boolean(error)}
        id={inputId}
        {...props}
      />
      {error ? (
        <p className="field-error" id={messageId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={messageId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
