import { describe, expect, it } from 'vitest'

import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import type { Recipe, RecipeIngredient } from '../../src/domain/recipes/types'
import type { ShoppingItem } from '../../src/domain/shopping/types'
import { buildPlanAdditions, categoriseIngredient } from '../../src/domain/shopping/planGeneration'

const householdId = '20000000-0000-4000-8000-000000000001'

function ingredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    id: 'ingredient-1',
    name: 'Brown lentils',
    quantity: '1',
    unit: 'cup',
    preparation: null,
    originalLineText: '1 cup brown lentils',
    parserVersion: 'recipe-content-v1',
    derivationStatus: 'derived',
    position: 1,
    ...overrides,
  }
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    householdId,
    name: 'Lentil soup',
    ingredients: null,
    description: null,
    sourceNote: null,
    sourceUrl: null,
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 30,
    imageUrl: null,
    notes: null,
    category: null,
    tags: [],
    favourite: false,
    ingredientRows: [ingredient()],
    steps: [],
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function linkedMeal(recipeId: string, overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return {
    id: `meal-${recipeId}`,
    householdId,
    mealDate: '2026-07-20',
    mealType: 'dinner',
    title: 'Dinner',
    notes: null,
    recipeId,
    linkedRecipe: { id: recipeId, name: 'Lentil soup', archivedAt: null },
    recipeState: {
      kind: 'active',
      recipe: { id: recipeId, name: 'Lentil soup', archivedAt: null },
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function listItem(name: string): ShoppingItem {
  return {
    id: `item-${name}`,
    householdId,
    name,
    quantity: null,
    unit: null,
    category: 'other',
    completed: false,
    position: 0,
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('buildPlanAdditions', () => {
  it('collects structured ingredient rows from linked recipes', () => {
    const result = buildPlanAdditions([linkedMeal('recipe-1')], [recipe()], [])
    expect(result.additions).toEqual([
      { name: 'Brown lentils', quantity: 1, unit: 'cup', category: 'pantry' },
    ])
    expect(result.linkedMealCount).toBe(1)
    expect(result.unlinkedMealCount).toBe(0)
  })

  it('merges duplicate ingredients and sums matching units', () => {
    const soup = recipe({
      id: 'recipe-1',
      ingredientRows: [ingredient({ name: 'Carrot', quantity: '2', unit: null })],
    })
    const stew = recipe({
      id: 'recipe-2',
      name: 'Stew',
      ingredientRows: [
        ingredient({ id: 'ingredient-2', name: 'carrot', quantity: '3', unit: null }),
      ],
    })
    const result = buildPlanAdditions(
      [linkedMeal('recipe-1'), linkedMeal('recipe-2')],
      [soup, stew],
      [],
    )
    expect(result.additions).toEqual([
      { name: 'Carrot', quantity: 5, unit: null, category: 'produce' },
    ])
  })

  it('drops quantity when merged units disagree', () => {
    const first = recipe({
      id: 'recipe-1',
      ingredientRows: [ingredient({ name: 'Milk', quantity: '1', unit: 'cup' })],
    })
    const second = recipe({
      id: 'recipe-2',
      ingredientRows: [
        ingredient({ id: 'ingredient-2', name: 'Milk', quantity: '600', unit: 'ml' }),
      ],
    })
    const result = buildPlanAdditions(
      [linkedMeal('recipe-1'), linkedMeal('recipe-2')],
      [first, second],
      [],
    )
    expect(result.additions).toEqual([
      { name: 'Milk', quantity: null, unit: null, category: 'dairy_and_eggs' },
    ])
  })

  it('skips ingredients already on the shopping list', () => {
    const result = buildPlanAdditions(
      [linkedMeal('recipe-1')],
      [
        recipe({
          ingredientRows: [
            ingredient({ name: 'Brown lentils' }),
            ingredient({ id: 'ingredient-2', name: 'Milk', quantity: null, unit: null }),
          ],
        }),
      ],
      [listItem('brown Lentils')],
    )
    expect(result.additions.map((addition) => addition.name)).toEqual(['Milk'])
    expect(result.alreadyListedNames).toEqual(['Brown lentils'])
  })

  it('counts meals without an active linked recipe and reads free-text ingredients', () => {
    const freeText: PlannedMeal = {
      ...linkedMeal('recipe-1'),
      id: 'meal-free',
      recipeId: null,
      linkedRecipe: null,
      recipeState: { kind: 'free-text' },
    }
    const multiline = recipe({
      ingredientRows: [],
      ingredients: '2 zucchini\n\n  Feta  ',
    })
    const result = buildPlanAdditions([linkedMeal('recipe-1'), freeText], [multiline], [])
    expect(result.additions).toEqual([
      { name: '2 zucchini', quantity: null, unit: null, category: 'produce' },
      { name: 'Feta', quantity: null, unit: null, category: 'dairy_and_eggs' },
    ])
    expect(result.linkedMealCount).toBe(1)
    expect(result.unlinkedMealCount).toBe(1)
  })

  it('ignores non-numeric quantities and clamps long names', () => {
    const longName = `Very long ingredient ${'x'.repeat(120)}`
    const result = buildPlanAdditions(
      [linkedMeal('recipe-1')],
      [
        recipe({
          ingredientRows: [ingredient({ name: longName, quantity: '1/2', unit: 'cup' })],
        }),
      ],
      [],
    )
    expect(result.additions).toHaveLength(1)
    expect(result.additions[0]?.quantity).toBeNull()
    expect(result.additions[0]?.name.length).toBeLessThanOrEqual(100)
  })
})

describe('categoriseIngredient', () => {
  it('prefers the longest matching keyword', () => {
    expect(categoriseIngredient('Coconut milk')).toBe('pantry')
    expect(categoriseIngredient('Full cream milk')).toBe('dairy_and_eggs')
    expect(categoriseIngredient('Frozen peas')).toBe('frozen')
    expect(categoriseIngredient('Chicken thighs')).toBe('meat_and_seafood')
    expect(categoriseIngredient('Sourdough bread')).toBe('bakery')
    expect(categoriseIngredient('Mystery item')).toBe('other')
  })
})
