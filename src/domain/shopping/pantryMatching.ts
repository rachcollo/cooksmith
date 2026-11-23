import type { PantryItem } from '../pantry/types'
import { canonicalIngredientName } from './ingredientIdentity'

export const pantryMatchVersion = 3 as const

export type PantryMatch =
  | {
      state: 'match'
      pantryItemId: string
      pantryItemNames: string[]
      version: typeof pantryMatchVersion
    }
  | { state: 'ambiguous'; pantryItemNames: string[]; version: typeof pantryMatchVersion }
  | { state: 'no-match'; version: typeof pantryMatchVersion }

function candidateNames(items: readonly PantryItem[]): string[] {
  return [...new Set(items.map((item) => item.name.trim()))].sort((a, b) =>
    a.localeCompare(b, 'en-AU'),
  )
}

export function pantryMatchHint(match: PantryMatch | undefined): string | undefined {
  if (!match || match.state === 'no-match') return undefined
  return `Check Pantry: ${match.pantryItemNames.join(', ')}. Check the form and amount before buying.`
}

export function normalisePantryMatchName(value: string): string {
  return canonicalIngredientName(value)
}

export function matchShoppingItemToPantry(
  shoppingName: string,
  pantryItems: readonly PantryItem[],
): PantryMatch {
  const shoppingTokens = normalisePantryMatchName(shoppingName).split(' ').filter(Boolean)
  const exact = pantryItems.filter(
    (item) => item.available && normalisePantryMatchName(item.name) === shoppingTokens.join(' '),
  )

  if (exact.length === 1) {
    return {
      state: 'match',
      pantryItemId: exact[0]!.id,
      pantryItemNames: [exact[0]!.name.trim()],
      version: pantryMatchVersion,
    }
  }
  if (exact.length > 1)
    return {
      state: 'ambiguous',
      pantryItemNames: candidateNames(exact),
      version: pantryMatchVersion,
    }

  const related = pantryItems.filter((item) => {
    if (!item.available) return false
    const pantryTokens = normalisePantryMatchName(item.name).split(' ').filter(Boolean)
    return (
      pantryTokens.length > 0 &&
      shoppingTokens.length > 0 &&
      (pantryTokens.every((token) => shoppingTokens.includes(token)) ||
        shoppingTokens.every((token) => pantryTokens.includes(token)))
    )
  })

  return related.length
    ? { state: 'ambiguous', pantryItemNames: candidateNames(related), version: pantryMatchVersion }
    : { state: 'no-match', version: pantryMatchVersion }
}

export function buildPantryMatchIndex(
  shoppingItems: readonly { id: string; name: string; householdId?: string }[],
  pantryItems: readonly PantryItem[],
): ReadonlyMap<string, PantryMatch> {
  return new Map(
    shoppingItems.map((item) => [
      item.id,
      matchShoppingItemToPantry(
        item.name,
        pantryItems.filter(
          (pantry) => !item.householdId || pantry.householdId === item.householdId,
        ),
      ),
    ]),
  )
}
