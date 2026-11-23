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

describe('Shopping precision boundary', () => {
  it.each(['kg', 'kilograms', 'L', 'litres'])(
    'preserves 0.004 %s in exact smaller units',
    (unit) => {
      const result = shoppingItemInputSchema.parse({
        name: 'Synthetic amount',
        quantity: 0.004,
        unit,
        category: 'other',
      })
      expect(result.quantity).toBe(4)
      expect(result.unit).toBe(['kg', 'kilograms'].includes(unit) ? 'g' : 'ml')
    },
  )
  it.each(['g', 'ml', 'clove', 'cup', null])('rejects unsupported precision in %s', (unit) => {
    for (const quantity of [0.000000000000000001, 0.004, 0.005, 0.009, 1.234]) {
      const result = shoppingItemInputSchema.safeParse({
        name: 'Synthetic',
        quantity,
        unit,
        category: 'other',
      })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0]?.path).toEqual(['quantity'])
    }
  })
  it.each([null, 0, 0.01, 0.25, 1.5, 2])(
    'retains ordinary quantity %s and its unit',
    (quantity) => {
      expect(
        shoppingItemInputSchema.parse({
          name: 'Synthetic',
          quantity,
          unit: 'kg',
          category: 'other',
        }),
      ).toMatchObject({ quantity, unit: 'kg' })
    },
  )
})
