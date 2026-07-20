import type { PantryItem } from '../pantry/types'

export const pantryMatchVersion = 1 as const

export type PantryMatch =
  | { state: 'match'; pantryItemId: string; version: typeof pantryMatchVersion }
  | { state: 'ambiguous'; version: typeof pantryMatchVersion }
  | { state: 'no-match'; version: typeof pantryMatchVersion }

export function normalisePantryMatchName(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-AU')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
    return { state: 'match', pantryItemId: exact[0]!.id, version: pantryMatchVersion }
  }
  if (exact.length > 1) return { state: 'ambiguous', version: pantryMatchVersion }

  const related = pantryItems.some((item) => {
    if (!item.available) return false
    const pantryTokens = normalisePantryMatchName(item.name).split(' ').filter(Boolean)
    return (
      pantryTokens.length > 0 &&
      shoppingTokens.length > 0 &&
      (pantryTokens.every((token) => shoppingTokens.includes(token)) ||
        shoppingTokens.every((token) => pantryTokens.includes(token)))
    )
  })

  return related
    ? { state: 'ambiguous', version: pantryMatchVersion }
    : { state: 'no-match', version: pantryMatchVersion }
}

export function buildPantryMatchIndex(
  shoppingItems: readonly { id: string; name: string }[],
  pantryItems: readonly PantryItem[],
): ReadonlyMap<string, PantryMatch> {
  return new Map(
    shoppingItems.map((item) => [item.id, matchShoppingItemToPantry(item.name, pantryItems)]),
  )
}
