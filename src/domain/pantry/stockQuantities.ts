/** Exact stock arithmetic. Purchase estimates and package guesses must not enter stock. */
export interface StockMeasure {
  dimension: 'mass' | 'volume' | 'count'
  unit: 'g' | 'ml' | 'each'
  factor: number
}
export function stockMeasure(unit: string | null): StockMeasure | null {
  const value = unit?.trim().toLowerCase()
  if (['g', 'gram', 'grams'].includes(value ?? ''))
    return { dimension: 'mass', unit: 'g', factor: 1 }
  if (['kg', 'kilogram', 'kilograms'].includes(value ?? ''))
    return { dimension: 'mass', unit: 'g', factor: 1000 }
  if (['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'].includes(value ?? ''))
    return { dimension: 'volume', unit: 'ml', factor: 1 }
  if (['l', 'litre', 'litres', 'liter', 'liters'].includes(value ?? ''))
    return { dimension: 'volume', unit: 'ml', factor: 1000 }
  if (['each', 'whole', 'count', 'item', 'items'].includes(value ?? ''))
    return { dimension: 'count', unit: 'each', factor: 1 }
  // Missing units are unknown, not automatically "each". A recipe's explicit count
  // can be labelled each by its validated source projection before reaching this boundary.
  return null
}
export function exactStockQuantity(
  quantity: number | null,
  fromUnit: string | null,
  toUnit: string | null,
): number | null {
  const from = stockMeasure(fromUnit),
    to = stockMeasure(toUnit)
  if (
    quantity === null ||
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    !from ||
    !to ||
    from.dimension !== to.dimension
  )
    return null
  const converted = (quantity * from.factor) / to.factor
  // Pantry's persisted precision is two decimals. Refuse lossy rounding of small amounts.
  const rounded = Math.round(converted * 100) / 100
  return Math.abs(converted - rounded) < 1e-9 ? rounded : null
}
