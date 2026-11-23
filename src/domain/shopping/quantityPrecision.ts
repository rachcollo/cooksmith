import { canonicalIngredientUnit } from './ingredientIdentity'

/** Shopping rows use numeric(10,2); never silently coerce a manual draft. */
export function isStoredShoppingQuantity(quantity: number): boolean {
  const cents = quantity * 100
  if (quantity > 0 && Math.round(cents) === 0) return false
  return (
    Number.isFinite(quantity) &&
    quantity >= 0 &&
    quantity <= 99999999.99 &&
    Math.abs(cents - Math.round(cents)) <= Number.EPSILON * Math.max(1, Math.abs(cents)) * 4
  )
}

export function normaliseShoppingQuantity(quantity: number | null, unit: string | null) {
  if (quantity === null || isStoredShoppingQuantity(quantity)) return { quantity, unit }
  const measure = canonicalIngredientUnit(unit)
  // Only existing exact mass/volume aliases can rescue storage precision.
  if (measure.multiplier === 1000 && ['g', 'ml'].includes(measure.unit ?? '')) {
    const converted = quantity * measure.multiplier
    if (isStoredShoppingQuantity(converted))
      return { quantity: Math.round(converted * 100) / 100, unit: measure.unit }
  }
  return { quantity, unit }
}
