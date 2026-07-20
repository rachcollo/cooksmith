import { describe, expect, it } from 'vitest'

import type { PantryItem } from '../../src/domain/pantry/types'
import {
  buildPantryMatchIndex,
  matchShoppingItemToPantry,
  normalisePantryMatchName,
  pantryMatchVersion,
} from '../../src/domain/shopping/pantryMatching'

const householdId = '20000000-0000-4000-8000-000000000001'

function pantryItem(name: string, overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: `pantry-${name}`,
    householdId,
    name,
    category: 'other',
    categorySource: 'explicit',
    storageLocation: 'pantry',
    storageLocationSource: 'explicit',
    classificationVersion: null,
    quantity: null,
    unit: null,
    available: true,
    isDefault: false,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('pantry-aware shopping matching', () => {
  it('normalises case, Unicode, whitespace and punctuation deterministically', () => {
    expect(normalisePantryMatchName('  MILK—full cream  ')).toBe('milk full cream')
    expect(pantryMatchVersion).toBe(1)
  })

  it.each([
    ['Milk', 'milk', 'match'],
    ['Rice', 'rice vinegar', 'ambiguous'],
    ['Coconut milk', 'coconut cream', 'no-match'],
    ['Diced tomatoes', 'tomatoes', 'ambiguous'],
    ['Chicken stock', 'chicken stock cubes', 'ambiguous'],
    ['Plain flour', 'self-raising flour', 'no-match'],
    ['Extra virgin olive oil', 'olive oil', 'ambiguous'],
    ['Garlic cloves', 'garlic', 'ambiguous'],
  ])('%s compared with %s is %s', (shopping, pantry, state) => {
    expect(matchShoppingItemToPantry(shopping, [pantryItem(pantry)]).state).toBe(state)
  })

  it('does not match unavailable pantry items or duplicate candidates', () => {
    expect(
      matchShoppingItemToPantry('Milk', [pantryItem('Milk', { available: false })]).state,
    ).toBe('no-match')
    expect(matchShoppingItemToPantry('Milk', [pantryItem('Milk'), pantryItem('milk')]).state).toBe(
      'ambiguous',
    )
  })

  it('builds a stable set-based index independent of pantry input order', () => {
    const shopping = [
      { id: 'milk', name: 'Milk' },
      { id: 'rice', name: 'Rice' },
    ]
    const pantry = [pantryItem('Milk'), pantryItem('Rice vinegar')]
    expect([...buildPantryMatchIndex(shopping, pantry)]).toEqual([
      ['milk', { state: 'match', pantryItemId: 'pantry-Milk', version: 1 }],
      ['rice', { state: 'ambiguous', version: 1 }],
    ])
    expect([...buildPantryMatchIndex(shopping, pantry.reverse())]).toEqual([
      ['milk', { state: 'match', pantryItemId: 'pantry-Milk', version: 1 }],
      ['rice', { state: 'ambiguous', version: 1 }],
    ])
  })
})
