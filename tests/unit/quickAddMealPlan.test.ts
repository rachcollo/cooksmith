import { describe, expect, it } from 'vitest'

import { nextEmptyPlanDate } from '../../src/domain/meal-plans/quickAdd'

const meal = (mealDate: string) => ({ mealDate })

describe('nextEmptyPlanDate', () => {
  it('selects today when today has no planned meals', () => {
    expect(nextEmptyPlanDate('2026-07-20', [])).toEqual({
      kind: 'available',
      mealDate: '2026-07-20',
    })
  })

  it('skips populated dates regardless of meal type and crosses week boundaries', () => {
    expect(
      nextEmptyPlanDate('2026-07-20', [
        meal('2026-07-20'),
        meal('2026-07-21'),
        meal('2026-07-22'),
        meal('2026-07-23'),
        meal('2026-07-24'),
        meal('2026-07-25'),
        meal('2026-07-26'),
      ]),
    ).toEqual({ kind: 'available', mealDate: '2026-07-27' })
  })

  it('reports the bounded search window when every date is populated', () => {
    expect(nextEmptyPlanDate('2026-12-30', [meal('2026-12-30'), meal('2026-12-31')], 2)).toEqual({
      kind: 'exhausted',
      searchedUntil: '2026-12-31',
    })
  })
})
