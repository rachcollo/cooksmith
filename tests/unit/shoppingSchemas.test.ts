import { describe, expect, it } from 'vitest'

import { shoppingItemInputSchema } from '../../src/domain/shopping/validationSchemas'

describe('shopping item input', () => {
  it('trims useful text and keeps optional amount fields nullable', () => {
    expect(
      shoppingItemInputSchema.parse({
        name: '  Milk  ',
        quantity: null,
        unit: '  ',
        category: 'dairy_and_eggs',
      }),
    ).toEqual({ name: 'Milk', quantity: null, unit: null, category: 'dairy_and_eggs' })
  })

  it('rejects empty names and negative quantities', () => {
    expect(
      shoppingItemInputSchema.safeParse({
        name: ' ',
        quantity: -1,
        unit: null,
        category: 'other',
      }).success,
    ).toBe(false)
  })
})
