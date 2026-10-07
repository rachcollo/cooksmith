import { exactStockQuantity, stockMeasure } from '../pantry/stockQuantities'
import type { PantryItemCategory, PantryStorageLocation } from '../pantry/types'
import { canonicalIngredientName } from './ingredientIdentity'
import { purchaseDisplayName } from './purchaseIngredients'
import type { PantryItem } from '../pantry/types'
export interface PutAwaySource {
  key: string
  token: string
  shoppingItemId: string
  name: string
  pantryItems?: PantryItem[]
  amounts?: { quantity: number | null; unit: string | null }[]
}
export interface PutAwayChoice {
  quantityUntracked?: boolean
  quantity?: number | null
  unit?: string | null
  pantryUpdatedAt?: string | null
  name: string
  sources: { key: string; token: string }[]
  category: PantryItemCategory
  storageLocation: PantryStorageLocation
}
export interface PutAwayResult {
  appliedSources: number
  alreadyAppliedSources: number
  pantryItems: number
}
export interface PutAwayReview {
  id: string
  name: string
  included: boolean
  pantryName: string | null
  ambiguous: boolean
  editing: boolean
  quantity: number | null
  unit: string | null
  pantryUpdatedAt: string | null
  quantityUntracked: boolean
  sources: PutAwaySource[]
}
export function groupPutAwaySources(sources: readonly PutAwaySource[]): PutAwayReview[] {
  const groups = new Map<string, PutAwayReview>()
  for (const source of sources) {
    const id = canonicalIngredientName(purchaseDisplayName(source.name))
    const group = groups.get(id)
    if (group) group.sources.push(source)
    else {
      const matches = (source.pantryItems ?? []).filter(
        (item) => canonicalIngredientName(purchaseDisplayName(item.name)) === id,
      )
      groups.set(id, {
        id,
        name: id,
        included: matches.length < 2,
        pantryName: matches.length === 1 ? matches[0]!.name : null,
        ambiguous: matches.length > 1,
        editing: false,
        quantity: null,
        unit: null,
        pantryUpdatedAt: matches.length === 1 ? matches[0]!.updatedAt : null,
        quantityUntracked:
          matches.length === 1 &&
          (matches[0]!.quantity === null || Boolean(matches[0]!.quantityUntracked)),
        sources: [source],
      })
    }
  }
  return [...groups.values()].map((row) => {
    const amounts = row.sources.flatMap(
      (source) => source.amounts ?? [{ quantity: null, unit: null }],
    )
    const first = amounts.find((amount) => amount.quantity !== null && stockMeasure(amount.unit))
    const measure = stockMeasure(first?.unit ?? null)
    if (!measure) return row
    const quantities = amounts.map((amount) =>
      exactStockQuantity(amount.quantity, amount.unit, measure.unit),
    )
    const known = quantities.filter((quantity): quantity is number => quantity !== null)
    if (!known.length) return row
    return {
      ...row,
      quantity: known.reduce((sum, quantity) => sum + quantity, 0),
      quantityUntracked: row.quantityUntracked || quantities.some((quantity) => quantity === null),
      unit: measure.unit,
    }
  })
}

/** A definite rejected review, so its inputs may safely be corrected. */
export class PutAwayReviewError extends Error {}
