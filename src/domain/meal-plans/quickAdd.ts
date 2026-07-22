import type { PlannedMeal } from './types'
import { addDays } from './week'

export const quickAddSearchWindowDays = 42

export type QuickAddDateResult =
  { kind: 'available'; mealDate: string } | { kind: 'exhausted'; searchedUntil: string }

export function nextEmptyPlanDate(
  today: string,
  plannedMeals: Pick<PlannedMeal, 'mealDate'>[],
  windowDays = quickAddSearchWindowDays,
): QuickAddDateResult {
  const occupiedDates = new Set(plannedMeals.map((meal) => meal.mealDate))
  for (let offset = 0; offset < windowDays; offset += 1) {
    const candidate = addDays(today, offset)
    if (!occupiedDates.has(candidate)) return { kind: 'available', mealDate: candidate }
  }
  return { kind: 'exhausted', searchedUntil: addDays(today, windowDays - 1) }
}
