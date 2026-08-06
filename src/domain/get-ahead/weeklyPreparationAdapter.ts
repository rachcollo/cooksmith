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

  return plan.tasks.flatMap((task) => {
    const sources = task.subtasks.flatMap((subtask) => subtask.sources)
    const primary = sources[0]
    if (!primary) return []
    const meal = mealById.get(primary.plannedMealId)
    const recipe = recipeById.get(primary.recipeId)
    if (
      !meal ||
      !recipe ||
      sources.some(
        (source) => !mealById.has(source.plannedMealId) || !recipeById.has(source.recipeId),
      )
    )
      return []
    const recipeNames = namesFor(sources, recipeById)

    return [
      {
        id: `weekly:${plan.cacheKey}:${task.id}`,
        ruleVersion: preparationOpportunityRuleVersion,
        type: opportunityType(task.subtasks[0]),
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
          text: task.title,
        },
        ingredient: {
          name: task.canonicalCategory,
          quantity: null,
          unit: null,
          preparation: task.title,
        },
        reason:
          recipeNames.length > 0
            ? `For ${recipeNames.join(' and ')}.`
            : 'For this week’s planned meals.',
        suggestedTitle: task.title,
        estimatedMinutes: task.estimatedMinutes,
        estimatedTimeSavedMinutes: task.estimatedTimeSavedMinutes,
        storageGuidance: task.storageGuidance,
        priority: task.priority,
        taskDetails: task.subtasks.map((subtask) => ({
          id: subtask.id,
          title: subtask.title,
          instruction: subtask.sources.map((source) => source.originalText).join(' '),
          quantity: displayQuantity(subtask),
          recipeNames: namesFor(subtask.sources, recipeById),
          ingredients: uniqueSourceValues(subtask.sources, 'ingredientLines'),
          steps: uniqueSourceValues(subtask.sources, 'instructionSteps'),
          stoppingPoint: firstSourceValue(subtask.sources, 'stoppingPoint'),
          finishingGuidance: firstSourceValue(subtask.sources, 'finishingGuidance'),
        })),
      } satisfies PreparationOpportunity,
    ]
  })
}

function uniqueSourceValues(
  sources: WeeklyPreparationSubtask['sources'],
  key: 'ingredientLines' | 'instructionSteps',
) {
  const values = [...new Set(sources.flatMap((source) => source[key] ?? []))]
  return values.length > 0 ? values : undefined
}

function firstSourceValue(
  sources: WeeklyPreparationSubtask['sources'],
  key: 'stoppingPoint' | 'finishingGuidance',
) {
  return sources.map((source) => source[key]).find((value): value is string => Boolean(value))
}

function opportunityType(
  subtask: WeeklyPreparationSubtask | undefined,
): PreparationOpportunityType {
  return (
    actionTypes[subtask?.canonicalAction?.toLowerCase() ?? ''] ?? 'duplicate-preparation-signal'
  )
}

function displayQuantity(subtask: WeeklyPreparationSubtask) {
  if (subtask.quantity.value === null) return null
  return `${subtask.quantity.value}${subtask.quantity.unit ? ` ${subtask.quantity.unit}` : ''}`
}

function namesFor(sources: WeeklyPreparationSubtask['sources'], recipes: Map<string, Recipe>) {
  return [
    ...new Set(
      sources
        .map((source) => recipes.get(source.recipeId)?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ]
}
