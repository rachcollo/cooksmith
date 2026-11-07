import { exactStockQuantity, stockMeasure } from '../pantry/stockQuantities'
import type { PantryItem, PantryItemCategory, PantryStorageLocation } from '../pantry/types'
import { structureIngredient } from '../recipes/ingredientStructure'
import { canonicalIngredientName } from './ingredientIdentity'
import { purchaseDisplayName } from './purchaseIngredients'

export interface PutAwayNameEvidence {
  name: string
  purchaseName?: string
  originalText?: string
}
export interface PutAwaySource {
  key: string
  token: string
  shoppingItemId: string
  name: string
  hasConsumedStock?: boolean
  pantryItems?: PantryItem[]
  amounts?: { quantity: number | null; unit: string | null }[]
  /** Source evidence may repair a derived label, never the amount actually bought. */
  nameEvidence?: PutAwayNameEvidence[]
  /** Only one untouched measured purchase may recover its own explicit label amount. */
  allowLabelQuantity?: boolean
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
export type PutAwayAttention = 'ingredient' | 'pantry-match' | 'unit-conflict'
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
  attention: PutAwayAttention | null
  matches: PantryItem[]
}

function sourceStructure(source: PutAwaySource) {
  const direct = structureIngredient(source.name)
  const captured = canonicalIngredientName(source.name)
  const evidence = (source.nameEvidence ?? []).filter(
    (item) =>
      item.originalText &&
      [item.purchaseName, item.name].some(
        (name) => name && canonicalIngredientName(name) === captured,
      ),
  )
  const structures = evidence.map((item) => structureIngredient(item.originalText!))
  // Never overwrite a renamed purchase or choose one identity from conflicting source lines.
  return structures.length && new Set(structures.map((item) => item.canonicalName)).size === 1
    ? structures[0]!
    : direct
}

function sourceAmounts(source: PutAwaySource) {
  const amounts = source.amounts ?? [{ quantity: null, unit: null }]
  if (
    !source.key.startsWith('p:') ||
    !source.allowLabelQuantity ||
    source.hasConsumedStock ||
    amounts.length !== 1 ||
    amounts[0]!.quantity !== null
  )
    return amounts
  const structure = structureIngredient(source.name)
  const quantity = structure.quantity
  // This is the captured purchase label, not recipe demand or an inferred pack size.
  if (
    quantity.state !== 'known' ||
    quantity.value === null ||
    !stockMeasure(quantity.unit) ||
    structure.unresolved.some(
      (reason) => reason !== 'note_body' && reason !== 'purchased_form_or_preparation',
    )
  )
    return amounts
  const known = { quantity: quantity.value, unit: quantity.unit }
  return /\b(extra|to taste|as needed|as required)\b/iu.test(structure.purpose ?? '')
    ? [known, { quantity: null, unit: null }]
    : [known]
}

function pantryItems(row: PutAwayReview) {
  return [
    ...new Map(
      row.sources.flatMap((source) => source.pantryItems ?? []).map((item) => [item.id, item]),
    ).values(),
  ]
}

function quantityConflict(row: PutAwayReview, target?: PantryItem) {
  if (row.quantity === null) return false
  if (row.quantity > 99999 || exactStockQuantity(row.quantity, row.unit, row.unit) === null)
    return true
  return Boolean(
    target &&
    target.quantity !== null &&
    exactStockQuantity(row.quantity, row.unit, target.unit) === null,
  )
}

export function selectPutAwayPantry(row: PutAwayReview, target: PantryItem): PutAwayReview {
  const attention = quantityConflict(row, target) ? 'unit-conflict' : null
  return {
    ...row,
    pantryName: target.name,
    pantryUpdatedAt: target.updatedAt,
    ambiguous: false,
    matches: [target],
    attention,
    included: !attention,
    quantityUntracked:
      row.quantityUntracked || target.quantity === null || Boolean(target.quantityUntracked),
  }
}

/** A deliberate correction is authoritative; it still must resolve the destination and units. */
export function correctPutAwayName(row: PutAwayReview, name: string): PutAwayReview {
  const all = pantryItems(row)
  const exact = all.filter((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase())
  const matches = exact.length
    ? exact
    : all.filter(
        (item) =>
          canonicalIngredientName(purchaseDisplayName(item.name)) ===
          canonicalIngredientName(purchaseDisplayName(name)),
      )
  const next: PutAwayReview = {
    ...row,
    name,
    pantryName: null,
    pantryUpdatedAt: null,
    matches,
    ambiguous: matches.length > 1,
    attention: matches.length > 1 ? 'pantry-match' : null,
    included: matches.length < 2,
  }
  if (matches.length === 1) return selectPutAwayPantry(next, matches[0]!)
  if (!next.attention && quantityConflict(next))
    return { ...next, attention: 'unit-conflict', included: false }
  return next
}

export function correctPutAwayAmount(
  row: PutAwayReview,
  quantity: number | null,
  unit: string | null,
): PutAwayReview {
  const next = { ...row, quantity, unit }
  const target = row.matches.find((item) => item.name === row.pantryName)
  const conflict = quantity !== null && (!stockMeasure(unit) || quantityConflict(next, target))
  const attention =
    row.attention === 'ingredient' || row.attention === 'pantry-match'
      ? row.attention
      : conflict
        ? 'unit-conflict'
        : null
  return { ...next, attention, included: !attention }
}

export function groupPutAwaySources(sources: readonly PutAwaySource[]): PutAwayReview[] {
  const groups = new Map<string, PutAwayReview>()
  for (const source of sources) {
    const structure = sourceStructure(source)
    const id = structure.canonicalName
    const group = groups.get(id)
    if (group) group.sources.push(source)
    else
      groups.set(id, {
        id,
        name: id,
        included: true,
        pantryName: null,
        ambiguous: false,
        editing: false,
        quantity: null,
        unit: null,
        pantryUpdatedAt: null,
        quantityUntracked: false,
        sources: [source],
        attention: null,
        matches: [],
      })
  }
  return [...groups.values()].map((row) => {
    const matches = pantryItems(row).filter(
      (item) => canonicalIngredientName(purchaseDisplayName(item.name)) === row.id,
    )
    const amounts = row.sources.flatMap(sourceAmounts)
    const first = amounts.find((amount) => amount.quantity !== null && stockMeasure(amount.unit))
    const measure = stockMeasure(first?.unit ?? null)
    if (measure) {
      const quantities = amounts.map((amount) =>
        exactStockQuantity(amount.quantity, amount.unit, measure.unit),
      )
      const known = quantities.filter((quantity): quantity is number => quantity !== null)
      row.quantity = known.length
        ? known.reduce((sum, quantity) => sum + Math.round(quantity * 100), 0) / 100
        : null
      row.unit = known.length ? measure.unit : null
      row.quantityUntracked = quantities.some((quantity) => quantity === null)
    }
    row.matches = matches
    const unclearName =
      row.sources.some((source) =>
        sourceStructure(source).unresolved.some((reason) =>
          ['alternative_product', 'product_name', 'package_quantity'].includes(reason),
        ),
      ) ||
      (!matches.length && /\d/u.test(row.name))
    if (matches.length === 1) row = selectPutAwayPantry(row, matches[0]!)
    else if (quantityConflict(row)) {
      row.attention = 'unit-conflict'
      row.included = false
    }
    if (unclearName || matches.length > 1) {
      row.attention = unclearName ? 'ingredient' : 'pantry-match'
      row.ambiguous = true
      row.included = false
    }
    return row
  })
}

/** Multiple optional corrections can resolve to the same target. Submit one stock delta. */
export function combinePutAwayChoices(choices: readonly PutAwayChoice[]): PutAwayChoice[] {
  const combined = new Map<string, PutAwayChoice>()
  for (const choice of choices) {
    const key = choice.name.trim().toLowerCase()
    const previous = combined.get(key)
    if (!previous) {
      combined.set(key, { ...choice, sources: [...choice.sources] })
      continue
    }
    if (previous.pantryUpdatedAt !== choice.pantryUpdatedAt)
      throw new PutAwayReviewError('Pantry changed. Close and reopen to check the latest stock.')
    const previousAmount = previous.quantity ?? null
    const nextAmount = choice.quantity ?? null
    previous.quantityUntracked = Boolean(
      previous.quantityUntracked ||
      choice.quantityUntracked ||
      previousAmount === null ||
      nextAmount === null,
    )
    if (previousAmount === null && nextAmount !== null) {
      previous.quantity = nextAmount
      previous.unit = choice.unit
    } else if (previousAmount !== null && nextAmount !== null) {
      const converted = exactStockQuantity(nextAmount, choice.unit ?? null, previous.unit ?? null)
      if (converted === null)
        throw new PutAwayReviewError(
          'Two entries for the same ingredient use different measures. Keep their quantity untracked or choose compatible units.',
        )
      previous.quantity = (Math.round(previousAmount * 100) + Math.round(converted * 100)) / 100
      if (previous.quantity > 99999)
        throw new PutAwayReviewError(
          'The combined amount is too large. Keep its quantity untracked or enter a smaller amount.',
        )
    }
    previous.sources.push(...choice.sources)
  }
  return [...combined.values()]
}

/** A definite rejected review, so its inputs may safely be corrected. */
export class PutAwayReviewError extends Error {}
