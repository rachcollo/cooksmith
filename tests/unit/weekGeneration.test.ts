import { describe, expect, it } from 'vitest'

import {
  proposeWeekMeals,
  randomReplacementRecipe,
  recipeSourceForPlan,
} from '../../src/domain/meal-plans/weekGeneration'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import { addDays } from '../../src/domain/meal-plans/week'
import type { Recipe } from '../../src/domain/recipes/types'

const weekStart = '2026-07-20'

function recipe(id: string, name: string, favourite = false): Recipe {
  return {
    id,
    householdId: 'household-1',
    name,
    ingredients: null,
    description: null,
    sourceNote: null,
    sourceUrl: null,
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    imageUrl: null,
    notes: null,
    category: null,
    tags: [],
    favourite,
    ingredientRows: [],
    steps: [],
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

function meal(mealDate: string, recipeId: string | null = null): PlannedMeal {
  return {
    id: `meal-${mealDate}`,
    householdId: 'household-1',
    mealDate,
    mealType: 'dinner',
    title: 'Existing dinner',
    notes: null,
    recipeId,
    recipeSource: recipeId ? 'household' : null,
    linkedRecipe: null,
    recipeState: recipeId ? { kind: 'unavailable', recipeId } : { kind: 'free-text' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('week meal generation', () => {
  it('preserves occupied days and avoids proposing an already-planned recipe automatically', () => {
    const existing = meal(addDays(weekStart, 1), 'recipe-existing')
    const result = proposeWeekMeals({
      weekStart,
      meals: [existing],
      recipes: [
        recipe('recipe-b', 'Bowl'),
        recipe('recipe-a', 'Apple bake', true),
        recipe('recipe-existing', 'Existing'),
      ],
      replace: false,
      random: () => 0.999,
    })

    expect(result.preservedMeals).toEqual([existing])
    expect(result.proposals.map((proposal) => [proposal.mealDate, proposal.recipe.id])).toEqual([
      [weekStart, 'recipe-b'],
      [addDays(weekStart, 2), 'recipe-a'],
    ])
    expect(result.unfilledDates).toHaveLength(4)
  })

  it('changes the generated order when the random source changes', () => {
    const recipes = [
      recipe('recipe-a', 'Apple bake'),
      recipe('recipe-b', 'Bowl'),
      recipe('recipe-c', 'Curry'),
    ]
    const first = proposeWeekMeals({
      weekStart,
      meals: [],
      recipes,
      replace: false,
      random: () => 0,
    })
    const second = proposeWeekMeals({
      weekStart,
      meals: [],
      recipes,
      replace: false,
      random: () => 0.999,
    })

    expect(first.proposals.map((proposal) => proposal.recipe.id)).not.toEqual(
      second.proposals.map((proposal) => proposal.recipe.id),
    )
  })

  it('randomly replaces only the requested recipe', () => {
    const recipes = [recipe('recipe-a', 'Apple bake'), recipe('recipe-b', 'Bowl')]
    expect(randomReplacementRecipe(recipes, 'recipe-a', () => 0)?.id).toBe('recipe-b')
    expect(randomReplacementRecipe([recipes[0]!], 'recipe-a', () => 0)).toBeNull()
  })

  it('targets all seven days only after replacement is confirmed', () => {
    const result = proposeWeekMeals({
      weekStart,
      meals: [meal(weekStart)],
      recipes: [recipe('recipe-a', 'Apple bake')],
      replace: true,
    })

    expect(result.preservedMeals).toEqual([])
    expect(result.replacedMeals).toEqual([meal(weekStart)])
    expect(result.proposals[0]?.mealDate).toBe(weekStart)
    expect(result.unfilledDates).toEqual([
      addDays(weekStart, 1),
      addDays(weekStart, 2),
      addDays(weekStart, 3),
      addDays(weekStart, 4),
      addDays(weekStart, 5),
      addDays(weekStart, 6),
    ])
  })

  it('uses imported links only for public and private recipe-bank items', () => {
    expect(recipeSourceForPlan(recipe('household', 'Household'))).toBe('household')
    expect(recipeSourceForPlan({ ...recipe('public', 'Public'), scope: 'public' })).toBe('imported')
    expect(recipeSourceForPlan({ ...recipe('private', 'Private'), scope: 'private' })).toBe(
      'imported',
    )
  })
})
