import type { Recipe } from '../recipes/types'
import type { PlannedMeal } from './types'
import { weekDays } from './week'

export interface WeekMealProposal {
  mealDate: string
  recipe: Recipe
}

export interface WeekPlanProposal {
  proposals: WeekMealProposal[]
  preservedMeals: PlannedMeal[]
  replacedMeals: PlannedMeal[]
  unfilledDates: string[]
}

function shuffledRecipes(recipes: Recipe[], random: () => number): Recipe[] {
  const shuffled = recipes.filter((recipe) => !recipe.archivedAt)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!]
  }
  return shuffled
}

export function randomReplacementRecipe(
  recipes: Recipe[],
  currentRecipeId: string | null,
  random: () => number = Math.random,
): Recipe | null {
  const candidates = recipes.filter((recipe) => !recipe.archivedAt && recipe.id !== currentRecipeId)
  if (candidates.length === 0) return null
  return candidates[Math.floor(random() * candidates.length)] ?? null
}

export function proposeWeekMeals({
  meals,
  recipes,
  replace,
  weekStart,
  random = Math.random,
}: {
  meals: PlannedMeal[]
  recipes: Recipe[]
  replace: boolean
  weekStart: string
  random?: () => number
}): WeekPlanProposal {
  const days = weekDays(weekStart)
  const dinners = meals.filter((meal) => meal.mealType === 'dinner' && days.includes(meal.mealDate))
  const occupiedDates = new Set(dinners.map((meal) => meal.mealDate))
  const targets = replace ? days : days.filter((day) => !occupiedDates.has(day))
  const existingRecipeIds = new Set(
    replace ? [] : dinners.map((meal) => meal.recipeId).filter((id): id is string => Boolean(id)),
  )
  const candidates = shuffledRecipes(recipes, random).filter(
    (recipe) => !existingRecipeIds.has(recipe.id),
  )
  const proposals = targets.flatMap((mealDate, index) => {
    const recipe = candidates[index]
    return recipe ? [{ mealDate, recipe }] : []
  })

  return {
    proposals,
    preservedMeals: replace ? [] : dinners,
    replacedMeals: replace ? dinners : [],
    unfilledDates: targets.slice(proposals.length),
  }
}

export function recipeSourceForPlan(recipe: Recipe): 'household' | 'imported' {
  return recipe.scope === 'public' || recipe.scope === 'private' ? 'imported' : 'household'
}
