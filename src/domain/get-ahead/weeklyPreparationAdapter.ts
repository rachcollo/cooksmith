import type { PlannedMeal } from '../meal-plans/types'
import type { Recipe } from '../recipes/types'
import {
  preparationOpportunityRuleVersion,
  type PreparationOpportunity,
  type PreparationOpportunityType,
} from './preparationOpportunities'
import type { WeeklyPreparationPlan, WeeklyPreparationSubtask } from './weeklyPreparationPlan'

const actionTypes: Record<string, PreparationOpportunityType> = {
  chop: 'chop',
  chopped: 'chop',
  dice: 'chop',
  diced: 'chop',
  grate: 'chop',
  grated: 'chop',
  marinate: 'marinate',
  sauce: 'sauce',
  cook: 'cook-component',
}

export function weeklyPreparationPlanToOpportunities(
  plan: WeeklyPreparationPlan,
  meals: PlannedMeal[],
  recipes: Recipe[],
): PreparationOpportunity[] {
  const mealById = new Map(meals.map((meal) => [meal.id, meal]))
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]))

  return plan.tasks.flatMap((task) =>
    task.subtasks.flatMap((subtask) => {
      const primary = subtask.sources[0]
      if (!primary) return []
      const meal = mealById.get(primary.plannedMealId)
      const recipe = recipeById.get(primary.recipeId)
      if (!meal || !recipe) return []

      return [
        {
          id: `weekly:${plan.cacheKey}:${subtask.id}`,
          ruleVersion: preparationOpportunityRuleVersion,
          type: opportunityType(subtask),
          householdId: plan.householdId,
          plannedMealId: meal.id,
          mealDate: meal.mealDate,
          mealType: meal.mealType,
          recipeId: recipe.id,
          recipeName: recipe.name,
          recipeUpdatedAt: recipe.updatedAt,
          source: {
            kind: 'ingredient',
            ingredientId: primary.sourceIngredientId,
            position: 0,
            text: primary.originalText,
          },
          ingredient: {
            name: task.canonicalCategory,
            quantity: displayQuantity(subtask),
            unit: subtask.quantity.unit,
            preparation: subtask.preparationDetail,
          },
          reason: sourceSummary(subtask, recipeById),
          suggestedTitle: task.title,
          estimatedMinutes: task.estimatedMinutes,
          estimatedTimeSavedMinutes: task.estimatedTimeSavedMinutes,
          storageGuidance: task.storageGuidance,
          priority: task.priority,
        } satisfies PreparationOpportunity,
      ]
    }),
  )
}

function opportunityType(subtask: WeeklyPreparationSubtask): PreparationOpportunityType {
  return actionTypes[subtask.canonicalAction?.toLowerCase() ?? ''] ?? 'duplicate-preparation-signal'
}

function displayQuantity(subtask: WeeklyPreparationSubtask) {
  return subtask.quantity.value === null ? null : String(subtask.quantity.value)
}

function sourceSummary(subtask: WeeklyPreparationSubtask, recipes: Map<string, Recipe>) {
  const names = [
    ...new Set(
      subtask.sources
        .map((source) => recipes.get(source.recipeId)?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ]
  return names.length > 0 ? `For ${names.join(' and ')}.` : 'For this week’s planned meals.'
}
