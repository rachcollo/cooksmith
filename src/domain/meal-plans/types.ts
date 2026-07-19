export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type PlannedMealRecipeSource = 'household' | 'imported'
export interface LinkedRecipeSummary {
  id: string
  name: string | null
  archivedAt: string | null
}
export type PlannedMealRecipeState =
  | { kind: 'free-text' }
  | { kind: 'active'; recipe: LinkedRecipeSummary }
  | { kind: 'archived'; recipe: LinkedRecipeSummary }
  | { kind: 'unavailable'; recipeId: string }
export interface PlannedMeal {
  id: string
  householdId: string
  mealDate: string
  mealType: MealType
  title: string
  notes: string | null
  recipeId: string | null
  recipeSource: PlannedMealRecipeSource | null
  linkedRecipe: LinkedRecipeSummary | null
  recipeState: PlannedMealRecipeState
  createdAt: string
  updatedAt: string
}
export interface PlannedMealInput {
  mealDate: string
  mealType: MealType
  title: string
  notes: string | null
  recipeId: string | null
  recipeSource: PlannedMealRecipeSource | null
}
export const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}
export const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner']
