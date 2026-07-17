import type { PlannedMeal, PlannedMealInput } from '../../domain/meal-plans/types'
export interface PlannedMealRepository {
  listWeek(householdId: string, weekStart: string, weekEnd: string): Promise<PlannedMeal[]>
  create(householdId: string, input: PlannedMealInput): Promise<PlannedMeal>
  update(mealId: string, input: PlannedMealInput): Promise<PlannedMeal>
  remove(mealId: string): Promise<void>
}
