import { describe, expect, it } from 'vitest'

import { pantryItemInputSchema } from '../../src/domain/pantry/validationSchemas'

describe('household staple validation', () => {
  it('normalises calm household staple input with a storage location', () => {
    expect(
      pantryItemInputSchema.parse({
        name: '  Milk ',
        category: 'tea_coffee_and_drinks',
        storageLocation: 'fridge',
        quantity: '1.5',
        unit: ' L ',
        available: true,
      }),
    ).toEqual({
      name: 'Milk',
      category: 'tea_coffee_and_drinks',
      storageLocation: 'fridge',
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
        storageLocation: 'freezer',
        quantity: '',
        unit: '',
        available: true,
      }),
    ).toEqual({
      name: 'Frozen peas',
      category: 'other',
      storageLocation: 'freezer',
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
        storageLocation: 'garage',
        quantity: -1,
        unit: 'item',
        available: true,
      }).success,
    ).toBe(false)
  })
})
