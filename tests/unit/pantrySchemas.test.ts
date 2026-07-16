import { describe, expect, it } from 'vitest'

import { pantryItemInputSchema } from '../../src/domain/pantry/validationSchemas'

describe('pantry item validation', () => {
  it('normalises calm household pantry input', () => {
    expect(
      pantryItemInputSchema.parse({
        name: '  Plain flour ',
        category: 'baking',
        quantity: '1.5',
        unit: ' kg ',
        available: true,
      }),
    ).toEqual({
      name: 'Plain flour',
      category: 'baking',
      quantity: 1.5,
      unit: 'kg',
      available: true,
    })
  })

  it('accepts unset quantity and unit', () => {
    expect(
      pantryItemInputSchema.parse({
        name: 'Tea bags',
        category: 'tea_coffee_and_drinks',
        quantity: '',
        unit: '',
        available: true,
      }),
    ).toEqual({
      name: 'Tea bags',
      category: 'tea_coffee_and_drinks',
      quantity: null,
      unit: null,
      available: true,
    })
  })

  it('rejects invalid quantities and empty names', () => {
    expect(
      pantryItemInputSchema.safeParse({
        name: '',
        category: 'other',
        quantity: -1,
        unit: 'item',
        available: true,
      }).success,
    ).toBe(false)
  })
})
