import type { LinkedRecipeSummary, PlannedMeal, PlannedMealRecipeState } from './types'

export function snapshotTitleForRecipe(recipe: LinkedRecipeSummary): string {
  return recipe.name?.trim() || 'Recipe'
}

export function recipeStateForLink(
  recipeId: string | null,
  linkedRecipe: LinkedRecipeSummary | null,
): PlannedMealRecipeState {
  if (!recipeId) return { kind: 'free-text' }
  if (!linkedRecipe) return { kind: 'unavailable', recipeId }
  if (linkedRecipe.archivedAt) return { kind: 'archived', recipe: linkedRecipe }
  return { kind: 'active', recipe: linkedRecipe }
}

export function displayTitleForPlannedMeal(meal: PlannedMeal): string {
  if (meal.recipeState.kind === 'active' || meal.recipeState.kind === 'archived') {
    return meal.recipeState.recipe.name || meal.title
  }
  return meal.title
}

export function unlinkPlannedMeal(meal: PlannedMeal) {
  return {
    mealDate: meal.mealDate,
    mealType: meal.mealType,
    title: meal.title,
    notes: meal.notes,
    recipeId: null,
    recipeSource: null,
  }
}
