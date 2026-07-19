import { describe, expect, it } from 'vitest'

import {
  PANTRY_CLASSIFICATION_VERSION,
  classifyPantryItem,
} from '../../src/domain/pantry/classification'

describe('automatic Pantry categorisation', () => {
  it.each([
    ['milk', 'fridge', 'dairy'],
    ['Chicken breast', 'fridge', 'meat_and_seafood'],
    ['frozen peas', 'freezer', 'frozen'],
    ['white rice', 'pantry', 'grains_rice_and_pasta'],
    ['apples', 'produce_storage', 'produce'],
    ['dishwashing tablets', 'household_supplies', 'household'],
  ] as const)('classifies %s as %s / %s', (name, storageLocation, category) => {
    expect(classifyPantryItem(name)).toEqual({
      category,
      storageLocation,
      version: PANTRY_CLASSIFICATION_VERSION,
    })
  })

  it('returns the neutral fallback for unknown and conflicting names', () => {
    const fallback = {
      category: 'uncategorised',
      storageLocation: 'other',
      version: PANTRY_CLASSIFICATION_VERSION,
    }
    expect(classifyPantryItem('mystery item')).toEqual(fallback)
    expect(classifyPantryItem('milk rice')).toEqual(fallback)
  })

  it('is deterministic across case and punctuation', () => {
    expect(classifyPantryItem('  GREEK-YOGHURT! ')).toEqual(classifyPantryItem('greek yoghurt'))
  })
})
