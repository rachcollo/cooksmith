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
  plannerVersion: 'weekly-preparation-planner-v13',
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
              ingredientLines: ['2 onions'],
              instructionSteps: ['Peel and dice the onions.'],
              stoppingPoint: 'The onions are diced.',
              finishingGuidance: 'Add to the sauce on the night.',
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
        id: 'weekly:cache-1:task-1',
        type: 'chop',
        plannedMealId: meal.id,
        recipeId: recipe.id,
        reason: 'For Onion pasta.',
        ingredient: expect.objectContaining({ quantity: null, preparation: 'Dice onion' }),
        taskDetails: [
          expect.objectContaining({
            title: 'Dice onion',
            quantity: '2',
            instruction: '1 onion, diced',
            recipeNames: ['Onion pasta'],
            ingredients: ['2 onions'],
            steps: ['Peel and dice the onions.'],
            stoppingPoint: 'The onions are diced.',
            finishingGuidance: 'Add to the sauce on the night.',
          }),
        ],
      }),
    ])
  })

  it('keeps a grouped AI task as one checklist item with all actionable subtasks', () => {
    const grouped = {
      ...plan,
      tasks: [
        {
          ...plan.tasks[0]!,
          title: 'Make sauce, breadcrumb mix and egg wash',
          subtasks: [
            plan.tasks[0]!.subtasks[0]!,
            {
              ...plan.tasks[0]!.subtasks[0]!,
              id: 'subtask-2',
              title: 'Mix breadcrumbs and parmesan',
              quantity: { state: 'known' as const, value: 120, unit: 'g' },
              sources: [
                {
                  ...plan.tasks[0]!.subtasks[0]!.sources[0]!,
                  id: 'candidate-2',
                  originalText: 'Combine breadcrumbs and parmesan in a shallow bowl.',
                },
              ],
            },
          ],
        },
      ],
    }

    const opportunities = weeklyPreparationPlanToOpportunities(grouped, [meal], [recipe])

    expect(opportunities).toHaveLength(1)
    expect(opportunities[0]?.taskDetails).toHaveLength(2)
  })

  it('rejects sources that do not belong to the loaded week and recipes', () => {
    expect(weeklyPreparationPlanToOpportunities(plan, [], [recipe])).toEqual([])
  })
})
