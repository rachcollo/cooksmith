import type { PantryItem } from '../pantry/types'
import { stockMeasure } from '../pantry/stockQuantities'
import { canonicalIngredientName } from './ingredientIdentity'
import { purchaseDisplayName } from './purchaseIngredients'
import type { PeriodMeal, PeriodShoppingItem } from './period'

export interface BoughtStock {
  name: string
  quantity: number | null
  unit: string | null
  putAway: boolean
}
const identity = (name: string) => canonicalIngredientName(purchaseDisplayName(name))

/** Project source demand without deleting history or allocating one balance twice.
 * This runs before the selected shopping period, so changing ranges cannot reuse stock.
 */
export function allocateHouseholdStock(
  rows: readonly PeriodShoppingItem[],
  meals: readonly (PeriodMeal & { completed?: boolean })[],
  pantry: readonly PantryItem[],
  bought: readonly BoughtStock[],
): PeriodShoppingItem[] {
  const untracked = new Set(
    pantry
      .filter(
        (item) =>
          item.available &&
          (item.quantityUntracked || item.quantity === null || !stockMeasure(item.unit)),
      )
      .map((item) => identity(item.name)),
  )
  const balances = new Map<string, number>()
  const pantryNames = new Map<string, number>()
  for (const item of pantry)
    pantryNames.set(identity(item.name), (pantryNames.get(identity(item.name)) ?? 0) + 1)
  for (const [name, count] of pantryNames) if (count > 1) untracked.add(name)
  function add(name: string, quantity: number | null, unit: string | null) {
    const measure = stockMeasure(unit)
    if (quantity === null || !Number.isFinite(quantity) || quantity < 0 || !measure) return
    const key = `${identity(name)}:${measure.dimension}`
    balances.set(key, (balances.get(key) ?? 0) + quantity * measure.factor)
  }
  for (const item of pantry) {
    // Ambiguous existing aliases need review, never combine them speculatively.
    if (item.available && pantryNames.get(identity(item.name)) === 1)
      add(item.name, item.quantity, item.unit)
  }
  for (const purchase of bought)
    if (!purchase.putAway) add(purchase.name, purchase.quantity, purchase.unit)
  const order = new Map(
    [...meals]
      .sort(
        (a, b) =>
          a.mealDate.localeCompare(b.mealDate) ||
          ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(a.mealType) -
            ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(b.mealType) ||
          a.id.localeCompare(b.id),
      )
      .map((meal, index) => [meal.id, index]),
  )
  const completed = new Set(meals.filter((meal) => meal.completed).map((meal) => meal.id))
  const projected = rows.map((row) => ({
    ...row,
    contributions: row.contributions
      .filter((c) => !completed.has(c.plannedMealId))
      .map((c) => ({ ...c })),
  }))
  const demand = projected
    .flatMap((row) => row.contributions.map((contribution) => ({ row, contribution })))
    .sort(
      (a, b) =>
        (order.get(a.contribution.plannedMealId) ?? Infinity) -
          (order.get(b.contribution.plannedMealId) ?? Infinity) || a.row.id.localeCompare(b.row.id),
    )
  for (const { row, contribution } of demand) {
    // Explicit purchase overrides remain user intent. Unsupported/estimated source
    // measures are checks; a purchasing density estimate is not measured inventory.
    if (
      !order.has(contribution.plannedMealId) ||
      row.manual !== false ||
      row.planOverride ||
      contribution.quantity === null ||
      contribution.sourceQuantities.some(
        (s) =>
          s.approximate ||
          s.conversionId ||
          !stockMeasure(
            s.unit ??
              (s.ingredientStructure?.quantity.state === 'known' &&
              s.ingredientStructure.quantity.unit === null
                ? 'each'
                : null),
          ),
      )
    )
      continue
    const explicitCount =
      contribution.sourceQuantities.length > 0 &&
      contribution.sourceQuantities.every(
        (s) =>
          s.ingredientStructure?.quantity.state === 'known' &&
          s.ingredientStructure.quantity.unit === null,
      )
    const measure = stockMeasure(contribution.unit ?? (explicitCount ? 'each' : null))
    if (!measure) continue
    const key = `${identity(row.name)}:${measure.dimension}`
    const needed = contribution.quantity * measure.factor
    const assigned = Math.min(needed, balances.get(key) ?? 0)
    balances.set(key, (balances.get(key) ?? 0) - assigned)
    contribution.stockCheck = needed > assigned && untracked.has(identity(row.name))
    contribution.quantity = Number(((needed - assigned) / measure.factor).toFixed(6))
  }
  return projected.map((row, index) =>
    row.completed
      ? {
          ...row,
          contributions: rows[index]!.contributions.filter((c) => !completed.has(c.plannedMealId)),
        }
      : row,
  )
}
