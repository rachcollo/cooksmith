import { classifyPantryItem } from './classification'
import type { PantryItem, PantryItemInput } from './types'
import { matchShoppingItemToPantry, normalisePantryMatchName } from '../shopping/pantryMatching'

export type PantryReconciliationSource = 'shopping-put-away' | 'meal-cooked'

export type PantryReconciliationProposal =
  | {
      kind: 'increment'
      source: PantryReconciliationSource
      sourceId: string
      sourceText: string
      pantryItemId: string
      pantryItemName: string
      quantity: number | null
      unit: string | null
      idempotencyKey: string
    }
  | {
      kind: 'create'
      source: PantryReconciliationSource
      sourceId: string
      sourceText: string
      input: PantryItemInput
      idempotencyKey: string
    }
  | {
      kind: 'skip'
      source: PantryReconciliationSource
      sourceId: string
      sourceText: string
      reason: 'ambiguous-match' | 'free-text' | 'incompatible-quantity' | 'already-reviewed'
      idempotencyKey: string
    }

export interface ReconciliationLineSource {
  id: string
  name: string
  quantity: number | string | null
  unit: string | null
}

export function reconciliationKey(source: PantryReconciliationSource, sourceId: string): string {
  return `${source}:${sourceId}`
}

export function quantitiesAreCompatible(
  proposalUnit: string | null,
  pantryUnit: string | null,
): boolean {
  const normalisedProposalUnit = proposalUnit?.trim().toLocaleLowerCase('en-AU') || null
  const normalisedPantryUnit = pantryUnit?.trim().toLocaleLowerCase('en-AU') || null
  if (!normalisedProposalUnit || !normalisedPantryUnit)
    return normalisedProposalUnit === normalisedPantryUnit
  return normalisedProposalUnit === normalisedPantryUnit
}

export function numericQuantity(value: number | string | null): number | null {
  if (value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function buildPutAwayProposal(
  item: ReconciliationLineSource,
  pantryItems: readonly PantryItem[],
  reviewedKeys: ReadonlySet<string> = new Set(),
): PantryReconciliationProposal {
  const key = reconciliationKey('shopping-put-away', item.id)
  if (reviewedKeys.has(key)) {
    return {
      kind: 'skip',
      source: 'shopping-put-away',
      sourceId: item.id,
      sourceText: item.name,
      reason: 'already-reviewed',
      idempotencyKey: key,
    }
  }
  const match = matchShoppingItemToPantry(item.name, pantryItems)
  if (match.state === 'ambiguous') {
    return {
      kind: 'skip',
      source: 'shopping-put-away',
      sourceId: item.id,
      sourceText: item.name,
      reason: 'ambiguous-match',
      idempotencyKey: key,
    }
  }
  const quantity = numericQuantity(item.quantity)
  const unit = item.unit?.trim() || null
  if (match.state === 'match') {
    const pantryItem = pantryItems.find((candidate) => candidate.id === match.pantryItemId)
    if (!pantryItem || !quantitiesAreCompatible(unit, pantryItem.unit)) {
      return {
        kind: 'skip',
        source: 'shopping-put-away',
        sourceId: item.id,
        sourceText: item.name,
        reason: 'incompatible-quantity',
        idempotencyKey: key,
      }
    }
    return {
      kind: 'increment',
      source: 'shopping-put-away',
      sourceId: item.id,
      sourceText: item.name,
      pantryItemId: pantryItem.id,
      pantryItemName: pantryItem.name,
      quantity,
      unit,
      idempotencyKey: key,
    }
  }
  const classification = classifyPantryItem(item.name)
  return {
    kind: 'create',
    source: 'shopping-put-away',
    sourceId: item.id,
    sourceText: item.name,
    input: {
      name: item.name.trim(),
      category: classification.category,
      categorySource: 'automatic',
      storageLocation: classification.storageLocation,
      storageLocationSource: 'automatic',
      classificationVersion: classification.version,
      quantity,
      unit,
      available: true,
    },
    idempotencyKey: key,
  }
}

export function buildCookedMealProposals(
  mealId: string,
  freeText: boolean,
  ingredients: readonly ReconciliationLineSource[],
  pantryItems: readonly PantryItem[],
  reviewedKeys: ReadonlySet<string> = new Set(),
): PantryReconciliationProposal[] {
  if (freeText) {
    return [
      {
        kind: 'skip',
        source: 'meal-cooked',
        sourceId: mealId,
        sourceText: 'Free-text meal',
        reason: 'free-text',
        idempotencyKey: reconciliationKey('meal-cooked', mealId),
      },
    ]
  }
  return ingredients.map((ingredient) => {
    const key = reconciliationKey('meal-cooked', `${mealId}:${ingredient.id}`)
    if (reviewedKeys.has(key))
      return {
        kind: 'skip',
        source: 'meal-cooked',
        sourceId: ingredient.id,
        sourceText: ingredient.name,
        reason: 'already-reviewed',
        idempotencyKey: key,
      }
    const match = matchShoppingItemToPantry(ingredient.name, pantryItems)
    if (match.state !== 'match')
      return {
        kind: 'skip',
        source: 'meal-cooked',
        sourceId: ingredient.id,
        sourceText: ingredient.name,
        reason: 'ambiguous-match',
        idempotencyKey: key,
      }
    const pantryItem = pantryItems.find((item) => item.id === match.pantryItemId)
    const unit = ingredient.unit?.trim() || null
    if (!pantryItem || !quantitiesAreCompatible(unit, pantryItem.unit))
      return {
        kind: 'skip',
        source: 'meal-cooked',
        sourceId: ingredient.id,
        sourceText: ingredient.name,
        reason: 'incompatible-quantity',
        idempotencyKey: key,
      }
    return {
      kind: 'increment',
      source: 'meal-cooked',
      sourceId: ingredient.id,
      sourceText: ingredient.name,
      pantryItemId: pantryItem.id,
      pantryItemName: pantryItem.name,
      quantity: -(numericQuantity(ingredient.quantity) ?? 0),
      unit,
      idempotencyKey: key,
    }
  })
}

export function applyQuantityDelta(item: PantryItem, delta: number | null): PantryItemInput {
  const nextQuantity = delta === null ? item.quantity : Math.max(0, (item.quantity ?? 0) + delta)
  return {
    name: item.name,
    category: item.category,
    categorySource: item.categorySource,
    storageLocation: item.storageLocation,
    storageLocationSource: item.storageLocationSource,
    classificationVersion: item.classificationVersion,
    quantity: nextQuantity,
    unit: item.unit,
    available:
      nextQuantity === null
        ? item.available
        : nextQuantity === 0
          ? false
          : item.available || nextQuantity > 0,
  }
}

export function hasSamePantryName(name: string, items: readonly PantryItem[]): boolean {
  const normalised = normalisePantryMatchName(name)
  return items.some((item) => normalisePantryMatchName(item.name) === normalised)
}
