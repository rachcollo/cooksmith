import type {
  MealStockLine,
  MealStockReview,
  PendingStock,
} from '../../domain/meal-plans/completion'
import type { PlannedMeal, PlannedMealInput } from '../../domain/meal-plans/types'
export interface PlannedMealRepository {
  undoReview?(householdId: string, mealId: string, revision: number): Promise<MealStockReview>
  pendingStock?(householdId: string): Promise<PendingStock[]>
  freezerStock?(
    householdId: string,
    freezerId: string,
  ): Promise<{ id: string; name: string; revision: number }>
  complete?(
    householdId: string,
    operationId: string,
    meal: PlannedMeal,
    action: 'done' | 'undo',
    lines: MealStockLine[],
  ): Promise<void>
  listWeek(householdId: string, weekStart: string, weekEnd: string): Promise<PlannedMeal[]>
  create(householdId: string, input: PlannedMealInput): Promise<PlannedMeal>
  update(mealId: string, input: PlannedMealInput): Promise<PlannedMeal>
  remove(mealId: string): Promise<void>
}
