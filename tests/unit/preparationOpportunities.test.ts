import { describe, expect, it } from 'vitest'

import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import type { Recipe } from '../../src/domain/recipes/types'
import { analysePreparationOpportunities } from '../../src/domain/get-ahead/preparationOpportunities'

const baseMeal: PlannedMeal = {
  id: 'meal-1',
  householdId: 'household-1',
  mealDate: '2026-07-27',
  mealType: 'dinner',
  title: 'Chicken bowls',
  notes: null,
  recipeId: 'recipe-1',
  recipeSource: 'household',
  linkedRecipe: { id: 'recipe-1', name: 'Chicken bowls', archivedAt: null },
  recipeState: {
    kind: 'active',
    recipe: { id: 'recipe-1', name: 'Chicken bowls', archivedAt: null },
  },
  createdAt: '2026-07-24T00:00:00Z',
  updatedAt: '2026-07-24T00:00:00Z',
}

const baseRecipe: Recipe = {
  id: 'recipe-1',
  householdId: 'household-1',
  scope: 'household',
  name: 'Chicken bowls',
  ingredients: null,
  description: null,
  sourceNote: null,
  sourceUrl: null,
  authorName: null,
  publisherName: null,
  servings: 4,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  imageUrl: null,
  notes: null,
  category: null,
  tags: [],
  favourite: false,
  ingredientRows: [
    {
      id: 'ingredient-1',
      name: 'carrot',
      quantity: '2',
      unit: null,
      preparation: 'diced',
      originalLineText: '2 carrots, diced',
      parserVersion: 'test',
      derivationStatus: 'structured',
      position: 1,
    },
    {
      id: 'ingredient-2',
      name: 'celery',
      quantity: '2',
      unit: 'sticks',
      preparation: 'diced',
      originalLineText: '2 celery sticks, diced',
      parserVersion: 'test',
      derivationStatus: 'structured',
      position: 2,
    },
  ],
  steps: [
    {
      id: 'step-1',
      instruction: 'Marinate the chicken in the yoghurt mixture for 30 minutes.',
      originalLineText: 'Marinate the chicken in the yoghurt mixture for 30 minutes.',
      parserVersion: 'test',
      derivationStatus: 'structured',
      position: 1,
    },
    {
      id: 'step-2',
      instruction: 'Whisk the tahini sauce until smooth.',
      originalLineText: 'Whisk the tahini sauce until smooth.',
      parserVersion: 'test',
      derivationStatus: 'structured',
      position: 2,
    },
    {
      id: 'step-3',
      instruction: 'Reserve leftovers for lunch tomorrow.',
      originalLineText: 'Reserve leftovers for lunch tomorrow.',
      parserVersion: 'test',
      derivationStatus: 'structured',
      position: 3,
    },
  ],
  archivedAt: null,
  createdAt: '2026-07-24T00:00:00Z',
  updatedAt: '2026-07-24T00:00:00Z',
}

describe('analysePreparationOpportunities', () => {
  it('returns deterministic source-linked opportunities for explicit recipe data', () => {
    const first = analysePreparationOpportunities([{ plannedMeal: baseMeal, recipe: baseRecipe }])
    const second = analysePreparationOpportunities([{ plannedMeal: baseMeal, recipe: baseRecipe }])

    expect(second).toEqual(first)
    expect(first.map((opportunity) => opportunity.type)).toEqual([
      'chop',
      'duplicate-preparation-signal',
      'marinate',
      'chop',
      'duplicate-preparation-signal',
      'sauce',
      'leftover-signal',
    ])
    expect(first).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^prep_/),
          ruleVersion: 'prep-opportunity-v1',
          householdId: 'household-1',
          plannedMealId: 'meal-1',
          recipeId: 'recipe-1',
          recipeUpdatedAt: baseRecipe.updatedAt,
          source: expect.objectContaining({ kind: 'step', stepId: 'step-1', position: 1 }),
          reason: expect.stringContaining('marinating'),
        }),
      ]),
    )
  })

  it('ignores unlinked meals and missing recipe sources', () => {
    expect(
      analysePreparationOpportunities([
        { plannedMeal: { ...baseMeal, recipeId: null }, recipe: baseRecipe },
      ]),
    ).toEqual([])
    expect(analysePreparationOpportunities([{ plannedMeal: baseMeal, recipe: null }])).toEqual([])
    expect(
      analysePreparationOpportunities([
        { plannedMeal: baseMeal, recipe: { ...baseRecipe, id: 'other-recipe' } },
      ]),
    ).toEqual([])
  })

  it('does not infer preparation from ingredient names alone', () => {
    const recipe: Recipe = {
      ...baseRecipe,
      ingredientRows: [
        {
          ...baseRecipe.ingredientRows[0],
          id: 'ingredient-sauce',
          name: 'tomato sauce',
          preparation: null,
          originalLineText: 'tomato sauce',
        },
      ],
      steps: [],
    }

    expect(analysePreparationOpportunities([{ plannedMeal: baseMeal, recipe }])).toEqual([])
  })

  it('returns an empty result for empty plans and recipes without qualifying data', () => {
    const recipe: Recipe = {
      ...baseRecipe,
      ingredientRows: [{ ...baseRecipe.ingredientRows[0], preparation: 'washed' }],
      steps: [{ ...baseRecipe.steps[0], instruction: 'Serve warm.' }],
    }

    expect(analysePreparationOpportunities([])).toEqual([])
    expect(analysePreparationOpportunities([{ plannedMeal: baseMeal, recipe }])).toEqual([])
  })

  it('does not treat reserving cooking liquid as a leftover opportunity', () => {
    const recipe: Recipe = {
      ...baseRecipe,
      ingredientRows: [],
      steps: [
        {
          ...baseRecipe.steps[0],
          instruction: 'Reserve one cup of the simmering water.',
          originalLineText: 'Reserve one cup of the simmering water.',
        },
      ],
    }

    expect(analysePreparationOpportunities([{ plannedMeal: baseMeal, recipe }])).toEqual([])
  })
})
