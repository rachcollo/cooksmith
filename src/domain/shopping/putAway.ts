import type { PantryItemCategory, PantryStorageLocation } from '../pantry/types'
import { canonicalIngredientName } from './ingredientIdentity'
export interface PutAwaySource {
  key: string
  token: string
  shoppingItemId: string
  name: string
}
export interface PutAwayChoice {
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
  sources: PutAwaySource[]
}
export function groupPutAwaySources(sources: readonly PutAwaySource[]): PutAwayReview[] {
  const groups = new Map<string, PutAwayReview>()
  for (const source of sources) {
    const id = canonicalIngredientName(source.name)
    const group = groups.get(id)
    if (group) group.sources.push(source)
    else groups.set(id, { id, name: id, included: true, sources: [source] })
  }
  return [...groups.values()]
}
