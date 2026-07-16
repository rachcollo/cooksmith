import { describe, expect, it } from 'vitest'

import { pantryItemInputSchema } from '../../src/domain/pantry/validationSchemas'

describe('pantry item validation', () => {
  it('normalises calm household pantry input', () => {
    expect(
      pantryItemInputSchema.parse({
        name: '  Plain flour ',
        category: 'baking',
        storageLocation: 'pantry',
        quantity: '1.5',
        unit: ' kg ',
        available: true,
      }),
    ).toEqual({
      name: 'Plain flour',
      category: 'baking',
      storageLocation: 'pantry',
      quantity: 1.5,
      unit: 'kg',
      available: true,
    })
  })

  it('rejects invalid quantities and empty names', () => {
    expect(
      pantryItemInputSchema.safeParse({
        name: '',
        category: 'staples',
        storageLocation: 'pantry',
        quantity: -1,
        unit: 'item',
        available: true,
      }).success,
    ).toBe(false)
  })
})
