import { parseIngredientQuantity } from '../../domain/shopping/ingredientIdentity'

export interface NumericFieldConstraints {
  required?: boolean
  min?: number
  max?: number
  integer?: boolean
}

export type NumericFieldValue =
  | { raw: string; value: number | null; valid: true; error: undefined }
  | { raw: string; value: null; valid: false; error: string }

/** Also use at submit boundaries; never persist an invalid or stale parsed value. */
export function parseNumericFieldValue(
  raw: string,
  { required = false, min, max, integer = false }: NumericFieldConstraints = {},
): NumericFieldValue {
  const invalid = (error: string): NumericFieldValue => ({ raw, value: null, valid: false, error })
  const text = raw.trim().replace(',', '.')
  if (!text) {
    return required
      ? invalid('Enter an amount.')
      : { raw, value: null, valid: true, error: undefined }
  }
  // Reject JS-only syntax (hexadecimal, exponents, Infinity) and incomplete edits.
  const decimal = /^(?:\d+(?:\.\d+)?|\.\d+)$/u
  const fraction = /^(?:(?:\d+)\s+)?\d+\/\d+$/u
  const glyph = /^(?:\d+\s*)?[¼½¾⅓⅔⅛⅜⅝⅞]$/u
  if (!decimal.test(text) && !fraction.test(text) && !glyph.test(text)) {
    return invalid('Enter a number or fraction, such as 1.5 or 1/2.')
  }
  const value = parseIngredientQuantity(text)
  if (value === null) return invalid('Enter a valid amount.')
  if (integer && !Number.isInteger(value)) return invalid('Enter a whole number.')
  if (min !== undefined && value < min) return invalid(`Enter an amount of at least ${min}.`)
  if (max !== undefined && value > max) return invalid(`Enter an amount no greater than ${max}.`)
  return { raw, value, valid: true, error: undefined }
}
