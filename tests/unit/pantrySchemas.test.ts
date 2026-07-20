import { describe, expect, it } from 'vitest'

import { pantryItemInputSchema } from '../../src/domain/pantry/validationSchemas'

describe('household staple validation', () => {
  it('normalises calm household staple input with a storage location', () => {
    expect(
      pantryItemInputSchema.parse({
        name: '  Milk ',
        category: 'tea_coffee_and_drinks',
        categorySource: 'automatic',
        storageLocation: 'fridge',
        storageLocationSource: 'automatic',
        classificationVersion: 1,
        quantity: '1.5',
        unit: ' L ',
        available: true,
      }),
    ).toEqual({
      name: 'Milk',
      category: 'tea_coffee_and_drinks',
      categorySource: 'automatic',
      storageLocation: 'fridge',
      storageLocationSource: 'automatic',
      classificationVersion: 1,
      quantity: 1.5,
      unit: 'L',
      available: true,
    })
  })

  it('accepts unset quantity and unit', () => {
    expect(
      pantryItemInputSchema.parse({
        name: 'Frozen peas',
        category: 'other',
        categorySource: 'explicit',
        storageLocation: 'freezer',
        storageLocationSource: 'explicit',
        classificationVersion: null,
        quantity: '',
        unit: '',
        available: true,
      }),
    ).toEqual({
      name: 'Frozen peas',
      category: 'other',
      categorySource: 'explicit',
      storageLocation: 'freezer',
      storageLocationSource: 'explicit',
      classificationVersion: null,
      quantity: null,
      unit: null,
      available: true,
    })
  })

  it('rejects invalid locations, quantities and empty names', () => {
    expect(
      pantryItemInputSchema.safeParse({
        name: '',
        category: 'other',
        categorySource: 'automatic',
        storageLocation: 'garage',
        storageLocationSource: 'automatic',
        classificationVersion: 0,
        quantity: -1,
        unit: 'item',
        available: true,
      }).success,
    ).toBe(false)
  })
})
