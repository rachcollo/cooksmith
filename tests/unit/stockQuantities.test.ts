import { expect, it } from 'vitest'
import { exactStockQuantity } from '../../src/domain/pantry/stockQuantities'
it('uses only exact compatible quantities without losing stored precision', () => {
  expect(exactStockQuantity(0.5, 'kg', 'g')).toBe(500)
  expect(exactStockQuantity(500, 'g', 'kg')).toBe(0.5)
  expect(exactStockQuantity(1, 'l', 'ml')).toBe(1000)
  expect(exactStockQuantity(3, 'items', 'each')).toBe(3)
  expect(exactStockQuantity(1, 'g', 'kg')).toBeNull()
})
it('keeps unknowns, package contents, spoons and unlike dimensions as checks', () => {
  for (const [quantity, from, to] of [
    [null, 'g', 'g'],
    [1, null, 'each'],
    [1, 'cup', 'ml'],
    [1, 'g', 'ml'],
    [1, 'can', 'g'],
    [NaN, 'g', 'g'],
    [-1, 'g', 'g'],
  ] as const)
    expect(exactStockQuantity(quantity, from, to)).toBeNull()
})
