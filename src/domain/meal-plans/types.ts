export type MealType = 'breakfast' | 'lunch' | 'dinner'
export interface PlannedMeal {
  id: string
  householdId: string
  mealDate: string
  mealType: MealType
  title: string
  notes: string | null
  createdAt: string
  updatedAt: string
}
export interface PlannedMealInput {
  mealDate: string
  mealType: MealType
  title: string
  notes: string | null
}
export const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}
export const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner']
