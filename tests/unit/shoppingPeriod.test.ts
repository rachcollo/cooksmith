import { describe, expect, it } from 'vitest'
import {
  chooseShoppingPeriod,
  defaultShoppingPeriod,
  resolveShoppingPeriod,
  selectedPeriodMeals,
  shoppingPeriodView,
  validShoppingPeriod,
  type PeriodShoppingItem,
} from '../../src/domain/shopping/period'
const today = new Date(2026, 9, 5, 12)
const week = defaultShoppingPeriod(today)
const meals = [0, 2, 3, 5, 6].map((day, i) => ({
  id: `meal-${i}`,
  mealDate: `2026-10-${String(5 + day).padStart(2, '0')}`,
  mealType: 'dinner',
}))
const row: PeriodShoppingItem = {
  id: 'carrots',
  householdId: 'h',
  name: 'carrots',
  quantity: 5,
  unit: null,
  category: 'produce',
  completed: true,
  manual: false,
  position: 0,
  updatedAt: '2026-10-05',
  contributions: meals.map((m) => ({
    plannedMealId: m.id,
    quantity: 1,
    unit: null,
    sourceQuantities: [{ name: 'carrots', quantity: 1, unit: null, sourceIngredientId: m.id }],
  })),
}
describe('shopping period', () => {
  it('defaults to the Monday-based calendar week and includes boundary dates', () => {
    expect(week).toEqual({
      kind: 'week',
      weekStart: '2026-10-05',
      from: '2026-10-05',
      to: '2026-10-11',
    })
    expect(selectedPeriodMeals(week, meals)).toHaveLength(5)
  })
  it('selects planned meals rather than the next three calendar days', () => {
    expect(
      selectedPeriodMeals(chooseShoppingPeriod('next3', today), meals).map((m) => m.id),
    ).toEqual(['meal-0', 'meal-1', 'meal-2'])
    expect(selectedPeriodMeals(chooseShoppingPeriod('next5', today), meals)).toHaveLength(5)
  })
  it('anchors next-meal choices to their saved local date and orders same-day slots', () => {
    const choice = chooseShoppingPeriod('next3', new Date(2026, 9, 7, 23))
    expect(choice.from).toBe('2026-10-07')
    expect(
      selectedPeriodMeals(choice, [
        ...meals,
        { id: 'breakfast', mealDate: '2026-10-07', mealType: 'breakfast' },
      ]).map((m) => m.id),
    ).toEqual(['breakfast', 'meal-1', 'meal-2'])
  })
  it('falls back with an explanation for stale or invalid periods', () => {
    expect(resolveShoppingPeriod({ ...week, weekStart: '2026-09-28' }, today)).toMatchObject({
      period: week,
      notice: expect.any(String),
    })
    expect(
      resolveShoppingPeriod({ ...week, from: '2026-10-11', to: '2026-10-05' }, today).period,
    ).toEqual(week)
    expect(validShoppingPeriod({ ...week, from: '2026-02-30' })).toBe(false)
  })
  it('keeps local calendar boundaries over the Melbourne daylight saving weekend', () => {
    expect(defaultShoppingPeriod(new Date(2026, 9, 4, 23)).to).toBe('2026-10-04')
    expect(defaultShoppingPeriod(new Date(2026, 9, 5, 0)).from).toBe('2026-10-05')
  })
  it('filters quantities and provenance reversibly without mutating bought state', () => {
    const original = structuredClone(row)
    const view = shoppingPeriodView(
      [row],
      { ...week, kind: 'custom', from: '2026-10-07', to: '2026-10-08' },
      meals,
      today,
    )
    expect(view.items[0]).toMatchObject({ quantity: 2, completed: true })
    expect(view.items[0]?.sourceQuantities?.map((s) => s.sourceIngredientId)).toEqual([
      'meal-1',
      'meal-2',
    ])
    expect(shoppingPeriodView([row], week, meals, today).items[0]?.quantity).toBe(5)
    expect(row).toEqual(original)
  })
  it('retains manual/staple items once even for an empty range and restores adjusted purchases', () => {
    const manual = { ...row, id: 'staple', manual: true, contributions: [] }
    const adjusted = { ...row, id: 'adjusted', manual: true, planOverride: true, quantity: 8 }
    expect(
      shoppingPeriodView(
        [manual, adjusted],
        { ...week, kind: 'custom', from: '2026-10-06', to: '2026-10-06' },
        meals,
        today,
      ).items.map((i) => i.id),
    ).toEqual(['staple'])
    expect(
      shoppingPeriodView([manual, adjusted], week, meals, today).items.find(
        (i) => i.id === 'adjusted',
      )?.quantity,
    ).toBe(8)
  })
  it('explains empty plans and leaves unknown quantities unknown', () => {
    expect(shoppingPeriodView([], week, [], today).description).toContain('add meals in Plan')
    const unknown = { ...row, contributions: [{ ...row.contributions[0]!, quantity: null }] }
    expect(shoppingPeriodView([unknown], week, meals, today).items[0]?.quantity).toBeNull()
  })
})
