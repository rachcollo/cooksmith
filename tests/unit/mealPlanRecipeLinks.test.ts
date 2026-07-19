import { describe, expect, it } from 'vitest'

import {
  displayTitleForPlannedMeal,
  recipeStateForLink,
  snapshotTitleForRecipe,
  unlinkPlannedMeal,
} from '../../src/domain/meal-plans/recipeLinks'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'

const recipe = { id: 'recipe-1', name: 'Lentil soup', archivedAt: null }
const meal: PlannedMeal = {
  id: 'meal-1',
  householdId: 'household-1',
  mealDate: '2026-07-17',
  mealType: 'dinner',
  title: 'Soup night',
  notes: 'Use the big pot',
  recipeId: recipe.id,
  recipeSource: 'household',
  linkedRecipe: recipe,
  recipeState: { kind: 'active', recipe },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('planned meal recipe links', () => {
  it('uses the recipe name for active links and keeps the planned title as the snapshot', () => {
    expect(snapshotTitleForRecipe(recipe)).toBe('Lentil soup')
    expect(displayTitleForPlannedMeal(meal)).toBe('Lentil soup')
    expect(meal.title).toBe('Soup night')
  })

  it('distinguishes free-text, archived and unavailable linked recipe states', () => {
    expect(recipeStateForLink(null, null)).toEqual({ kind: 'free-text' })
    expect(
      recipeStateForLink(recipe.id, { ...recipe, archivedAt: '2026-07-18T00:00:00Z' }),
    ).toEqual({ kind: 'archived', recipe: { ...recipe, archivedAt: '2026-07-18T00:00:00Z' } })
    expect(recipeStateForLink(recipe.id, null)).toEqual({
      kind: 'unavailable',
      recipeId: recipe.id,
    })
  })

  it('unlinks a recipe without losing the editable planned title or notes', () => {
    expect(unlinkPlannedMeal(meal)).toEqual({
      mealDate: '2026-07-17',
      mealType: 'dinner',
      title: 'Soup night',
      notes: 'Use the big pot',
      recipeId: null,
      recipeSource: null,
    })
  })
})
