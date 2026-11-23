import { useEffect, useRef, useState, type ComponentProps } from 'react'

import { TextField } from './TextField'
import {
  parseNumericFieldValue,
  type NumericFieldConstraints,
  type NumericFieldValue,
} from './numericFieldValue'

interface NumericFieldProps
  extends
    Omit<
      ComponentProps<typeof TextField>,
      'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'step' | 'ref'
    >,
    NumericFieldConstraints {
  defaultValue?: string
  onValueChange: (result: NumericFieldValue) => void
}

/** Owns the draft string. Change its React key to initialise a different draft. */
export function NumericField({
  defaultValue = '',
  onValueChange,
  min,
  max,
  integer,
  required,
  error,
  ...props
}: NumericFieldProps) {
  const [raw, setRaw] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)
  const result = parseNumericFieldValue(raw, { min, max, integer, required })
  const message = error || result.error

  useEffect(() => {
    inputRef.current?.setCustomValidity(message ?? '')
  }, [message])

  return (
    <TextField
      {...props}
      ref={inputRef}
      type="text"
      inputMode={props.inputMode ?? 'decimal'}
      required={required}
      value={raw}
      error={message}
      onChange={(event) => {
        const nextRaw = event.currentTarget.value
        const next = parseNumericFieldValue(nextRaw, { min, max, integer, required })
        event.currentTarget.setCustomValidity(error || next.error || '')
        setRaw(nextRaw)
        onValueChange(next)
      }}
    />
  )
}
