import { describe, expect, it } from 'vitest'

import { weeklyPreparationPlanToOpportunities } from '../../src/domain/get-ahead/weeklyPreparationAdapter'
import type { WeeklyPreparationPlan } from '../../src/domain/get-ahead/weeklyPreparationPlan'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import type { Recipe } from '../../src/domain/recipes/types'

const meal = {
  id: 'meal-1',
  householdId: 'household-1',
  mealDate: '2026-07-28',
  mealType: 'dinner',
  recipeId: 'recipe-1',
} as PlannedMeal

const recipe = {
  id: 'recipe-1',
  householdId: 'household-1',
  name: 'Onion pasta',
  updatedAt: '2026-07-28T00:00:00.000Z',
} as Recipe

const plan: WeeklyPreparationPlan = {
  schemaVersion: 'weekly-preparation-plan-v2',
  plannerVersion: 'weekly-preparation-planner-v8',
  householdId: 'household-1',
  planId: '2026-07-28_2026-08-03',
  cacheKey: 'cache-1',
  generation: 'deterministic',
  fallbackReason: null,
  ambiguousCandidateIds: [],
  tasks: [
    {
      id: 'task-1',
      title: 'Dice onion',
      canonicalCategory: 'onion',
      decision: 'combined',
      reasonCode: 'compatible',
      confidence: 'high',
      validation: 'validated',
      subtasks: [
        {
          id: 'subtask-1',
          title: 'Dice onion',
          canonicalAction: 'dice',
          preparationDetail: 'diced',
          quantity: { state: 'known', value: 2, unit: null },
          sources: [
            {
              id: 'candidate-1',
              plannedMealId: meal.id,
              recipeId: recipe.id,
              recipeVersionId: 'version-1',
              sourceIngredientId: 'ingredient-1',
              sourceStepIds: ['step-1'],
              originalText: '1 onion, diced',
            },
          ],
        },
      ],
    },
  ],
}

describe('weekly preparation Get Ahead adapter', () => {
  it('preserves stable cache identity, source attribution and consolidated quantity', () => {
    const opportunities = weeklyPreparationPlanToOpportunities(plan, [meal], [recipe])

    expect(opportunities).toEqual([
      expect.objectContaining({
        id: 'weekly:cache-1:subtask-1',
        type: 'chop',
        plannedMealId: meal.id,
        recipeId: recipe.id,
        reason: 'For Onion pasta.',
        ingredient: expect.objectContaining({ quantity: '2', preparation: 'diced' }),
      }),
    ])
  })

  it('rejects sources that do not belong to the loaded week and recipes', () => {
    expect(weeklyPreparationPlanToOpportunities(plan, [], [recipe])).toEqual([])
  })
})
