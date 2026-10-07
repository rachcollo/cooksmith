import type { PantryItem } from '../pantry/types'
import { exactStockQuantity } from '../pantry/stockQuantities'
import type { Recipe } from '../recipes/types'
import { purchaseDisplayName, purchaseIngredientsFor } from '../shopping/purchaseIngredients'
import { canonicalIngredientName } from '../shopping/ingredientIdentity'
export type MealStockLine =
  | { kind: 'recipe'; recipeId: string; updatedAt: string }
  | {
      kind: 'pantry'
      pantryItemId: string
      name: string
      unit: string
      updatedAt: string
      amount: number
    }
  | {
      kind: 'purchase'
      purchaseId: string
      purchaseIndex: number
      revision: number
      name: string
      unit: string
      amount: number
    }
  | {
      kind: 'freezer'
      freezerId: string
      revision: number
      name: string
      unit: 'portion'
      amount: number
    }
  | { kind: 'untracked'; name: string }
export interface PendingStock {
  id: string
  name: string
  revision: number
  amounts: { quantity: number | null; unit: string | null }[]
}
export interface MealStockReview {
  lines: MealStockLine[]
  changed: boolean
}
const identity = (name: string) => canonicalIngredientName(purchaseDisplayName(name))
export function mealStockProposal(
  recipe: Recipe | null,
  pantry: readonly PantryItem[],
  purchases: readonly PendingStock[] = [],
) {
  const lines = new Map<string, MealStockLine>()
  const checks = new Set<string>()
  if (!recipe) return { lines: [], checks: [] }
  for (const ingredient of purchaseIngredientsFor(recipe)) {
    const name = identity(ingredient.name)
    const quantity = ingredient.structure?.quantity
    if (quantity?.state !== 'known' || quantity.value === null) {
      checks.add(ingredient.name)
      continue
    }
    let remaining = quantity.value
    const unit = quantity.unit ?? 'each'
    const matches = pantry.filter((item) => identity(item.name) === name)
    const item = matches.length === 1 ? matches[0] : undefined
    if (item?.available && item.quantity !== null && item.unit) {
      const needed = exactStockQuantity(remaining, unit, item.unit)
      const prior = lines.get('s:' + item.id)
      const available = item.quantity - (prior && 'amount' in prior ? prior.amount : 0)
      if (needed !== null && available > 0) {
        const amount = Math.min(needed, available)
        const used = exactStockQuantity(amount, item.unit, unit)
        if (used !== null) {
          lines.set('s:' + item.id, {
            kind: 'pantry',
            pantryItemId: item.id,
            name: item.name,
            unit: item.unit,
            updatedAt: item.updatedAt,
            amount: amount + (prior && 'amount' in prior ? prior.amount : 0),
          })
          remaining = Math.max(0, Number((remaining - used).toFixed(6)))
        }
      }
    }
    for (const purchase of purchases.filter((p) => identity(p.name) === name)) {
      for (const [index, measure] of purchase.amounts.entries()) {
        if (remaining <= 0 || measure.quantity === null || !measure.unit) continue
        const key = `p:${purchase.id}:${index}`
        const prior = lines.get(key)
        const available = measure.quantity - (prior && 'amount' in prior ? prior.amount : 0)
        const needed = exactStockQuantity(remaining, unit, measure.unit)
        if (needed === null || available <= 0) continue
        const amount = Math.min(needed, available)
        const used = exactStockQuantity(amount, measure.unit, unit)
        if (used === null) continue
        lines.set(key, {
          kind: 'purchase',
          purchaseId: purchase.id,
          purchaseIndex: index,
          revision: purchase.revision,
          name: purchase.name,
          unit: measure.unit,
          amount: amount + (prior && 'amount' in prior ? prior.amount : 0),
        })
        remaining = Math.max(0, Number((remaining - used).toFixed(6)))
      }
    }
    if (remaining > 0) checks.add(ingredient.name)
  }
  return {
    lines: [
      ...lines.values(),
      ...[...checks].map((name) => ({ kind: 'untracked' as const, name })),
    ],
    checks: [...checks],
  }
}
