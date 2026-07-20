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

function rankRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes]
    .filter((recipe) => !recipe.archivedAt)
    .sort((left, right) => {
      if (left.favourite !== right.favourite) return left.favourite ? -1 : 1
      const nameOrder = left.name.localeCompare(right.name, 'en-AU', { sensitivity: 'base' })
      return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id)
    })
}

export function proposeWeekMeals({
  meals,
  recipes,
  replace,
  weekStart,
}: {
  meals: PlannedMeal[]
  recipes: Recipe[]
  replace: boolean
  weekStart: string
}): WeekPlanProposal {
  const days = weekDays(weekStart)
  const dinners = meals.filter((meal) => meal.mealType === 'dinner' && days.includes(meal.mealDate))
  const occupiedDates = new Set(dinners.map((meal) => meal.mealDate))
  const targets = replace ? days : days.filter((day) => !occupiedDates.has(day))
  const existingRecipeIds = new Set(
    replace ? [] : dinners.map((meal) => meal.recipeId).filter((id): id is string => Boolean(id)),
  )
  const candidates = rankRecipes(recipes).filter((recipe) => !existingRecipeIds.has(recipe.id))
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
