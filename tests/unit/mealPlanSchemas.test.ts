import { describe, expect, it } from 'vitest'

import {
  plannedMealInputSchema,
  mealTypeSchema,
} from '../../src/domain/meal-plans/validationSchemas'
import {
  currentWeek,
  formatDisplayDate,
  formatWeekRange,
  nextWeek,
  previousWeek,
  startOfWeek,
  weekDays,
} from '../../src/domain/meal-plans/week'

describe('meal plan date helpers', () => {
  it('calculates Monday week starts and seven displayed days', () => {
    expect(startOfWeek('2026-07-17')).toBe('2026-07-13')
    expect(weekDays('2026-07-13')).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
    ])
  })

  it('moves between previous, current and next weeks deterministically', () => {
    expect(previousWeek('2026-07-13')).toBe('2026-07-06')
    expect(nextWeek('2026-07-13')).toBe('2026-07-20')
    expect(currentWeek(new Date(Date.UTC(2026, 6, 17)))).toBe('2026-07-13')
  })

  it('formats dates for Australian readers', () => {
    expect(formatDisplayDate('2026-07-17')).toBe('17 July 2026')
    expect(formatWeekRange('2026-07-13')).toBe('13 July 2026 – 19 July 2026')
  })
})

describe('planned meal validation', () => {
  it('accepts valid meal types and rejects unknown meal types', () => {
    expect(mealTypeSchema.parse('breakfast')).toBe('breakfast')
    expect(() => mealTypeSchema.parse('snack')).toThrow()
  })

  it('trims titles, keeps optional notes and rejects blank titles', () => {
    expect(
      plannedMealInputSchema.parse({
        mealDate: '2026-07-17',
        mealType: 'dinner',
        title: '  Pasta  ',
        notes: '',
      }),
    ).toEqual({ mealDate: '2026-07-17', mealType: 'dinner', title: 'Pasta', notes: null })
    expect(
      plannedMealInputSchema.safeParse({
        mealDate: '2026-07-17',
        mealType: 'lunch',
        title: ' ',
        notes: null,
      }).success,
    ).toBe(false)
  })
})
