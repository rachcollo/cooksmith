import { expect, it } from 'vitest'
import { allocateHouseholdStock } from '../../src/domain/shopping/stockAllocation'
import type { PeriodShoppingItem } from '../../src/domain/shopping/period'
import type { PantryItem } from '../../src/domain/pantry/types'
const stock = {
  id: 'stock',
  name: 'Rice',
  householdId: 'h',
  quantity: 500,
  unit: 'g',
  available: true,
} as PantryItem
const meals = [
  { id: 'a', mealDate: '2026-10-08', mealType: 'dinner' },
  { id: 'b', mealDate: '2026-10-09', mealType: 'dinner' },
]
const row = {
  id: 'rice',
  name: 'rice',
  householdId: 'h',
  manual: false,
  contributions: [600, 400].map((quantity, index) => ({
    plannedMealId: index ? 'b' : 'a',
    quantity,
    unit: 'g',
    sourceQuantities: [{ name: 'rice', quantity, unit: 'g' }],
  })),
} as PeriodShoppingItem
const amounts = (rows: PeriodShoppingItem[]) => rows[0]!.contributions.map((c) => c.quantity)
it('allocates 500g once against 600g + 400g before projecting periods', () => {
  expect(amounts(allocateHouseholdStock([row], meals, [stock], []))).toEqual([100, 400])
  expect(row.contributions.map((c) => c.quantity)).toEqual([600, 400])
})
it('moves bought coverage to stock at put-away, without counting both', () => {
  const purchase = { name: 'rice', quantity: 500, unit: 'g', putAway: false }
  expect(amounts(allocateHouseholdStock([row], meals, [stock], [purchase]))).toEqual([0, 0])
  expect(
    amounts(
      allocateHouseholdStock(
        [row],
        meals,
        [{ ...stock, quantity: 1000 }],
        [{ ...purchase, putAway: true }],
      ),
    ),
  ).toEqual([0, 0])
})
it('removes completed demand while consumed stock is deducted; Undo restores both', () => {
  expect(
    amounts(
      allocateHouseholdStock(
        [row],
        [{ ...meals[0]!, completed: true }, meals[1]!],
        [{ ...stock, quantity: 400 }],
        [],
      ),
    ),
  ).toEqual([0])
  expect(amounts(allocateHouseholdStock([row], meals, [{ ...stock, quantity: 1000 }], []))).toEqual(
    [0, 0],
  )
})
it('keeps unknown, incompatible, unavailable, ambiguous and explicit overrides unchanged', () => {
  for (const pantry of [
    [{ ...stock, quantity: null }],
    [{ ...stock, unit: 'cup' }],
    [{ ...stock, available: false }],
    [stock, { ...stock, id: 'other' }],
  ])
    expect(amounts(allocateHouseholdStock([row], meals, pantry, []))).toEqual([600, 400])
  expect(
    amounts(allocateHouseholdStock([{ ...row, planOverride: true }], meals, [stock], [])),
  ).toEqual([600, 400])
})

it('does not reserve current stock for an out-of-window historical contribution', () => {
  const historical = {
    ...row,
    contributions: [{ ...row.contributions[0]!, plannedMealId: 'last-week' }, ...row.contributions],
  }
  expect(amounts(allocateHouseholdStock([historical], meals, [stock], []))).toEqual([600, 100, 400])
})
