import type { Recipe } from '../../src/domain/recipes/types'
import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures/ingredient-identity-v2.json'
import {
  canonicalIngredientName,
  ingredientPurchaseKey,
  ingredientIdentityVersion,
} from '../../src/domain/shopping/ingredientIdentity'
import { categoriseIngredient } from '../../src/domain/shopping/planGeneration'

describe('reviewed Australian purchasing fixtures', () => {
  it('covers at least 150 distinct ingredients', () => {
    expect(new Set(fixtures.map(({ name }) => name)).size).toBeGreaterThanOrEqual(150)
    expect(ingredientIdentityVersion).toBe(2)
  })
  it.each(fixtures)('$name belongs in $category', ({ name, category }) => {
    expect(categoriseIngredient(name)).toBe(category)
    const canonical = canonicalIngredientName(name)
    expect(canonicalIngredientName(canonical)).toBe(canonical)
  })
  it.each([
    ['mushrooms', 'mushroom'],
    ['berries', 'berry'],
    ['radishes', 'radish'],
    ['sandwiches', 'sandwich'],
    ['peaches', 'peach'],
    ['leaves', 'leaf'],
    ['asparagus', 'asparagus'],
    ['couscous', 'couscous'],
    ['molasses', 'molasses'],
    ['aubergines', 'eggplant'],
    ['scallions', 'spring onion'],
    ['arugula', 'rocket'],
    ['garbanzo beans', 'chickpea'],
    ['shrimp', 'prawn'],
    ['EVOO', 'extra virgin olive oil'],
  ])('%s and %s share one purchase key', (left, right) => {
    expect(ingredientPurchaseKey(left, 'g')).toBe(ingredientPurchaseKey(right, 'g'))
  })
  it.each([
    ['garlic powder', 'garlic'],
    ['olive oil', 'extra virgin olive oil'],
    ['dried mushrooms', 'mushrooms'],
    ['frozen peas', 'peas'],
    ['black pepper', 'capsicum'],
    ['shallot', 'spring onion'],
    ['plain flour', 'self raising flour'],
    ['canned tomatoes', 'tomatoes'],
  ])('keeps %s distinct from %s', (left, right) => {
    expect(ingredientPurchaseKey(left, null)).not.toBe(ingredientPurchaseKey(right, null))
  })
})

it('merges two recipe plural variants while keeping both original sources', async () => {
  const { buildPlanAdditions } = await import('../../src/domain/shopping/planGeneration')
  const recipes = ['mushrooms', 'mushroom'].map((name, index) => ({
    id: `recipe-${index}`,
    scope: 'household',
    updatedAt: '2026-11-17T00:00:00Z',
    ingredientRows: [{ id: `source-${index}`, name, quantity: '100', unit: 'g', position: 0 }],
  })) as unknown as Recipe[]
  const meals = recipes.map((recipe) => ({
    recipeState: {
      kind: 'active' as const,
      recipe: { id: recipe.id, name: recipe.name, archivedAt: null },
    },
  }))
  const result = buildPlanAdditions(meals, recipes, [])
  expect(result.additions).toHaveLength(1)
  expect(result.additions[0]).toMatchObject({
    name: 'mushroom',
    quantity: 200,
    category: 'produce',
  })
  expect(result.additions[0]!.sourceQuantities?.map((source) => source.sourceRecipeId)).toEqual([
    'recipe-0',
    'recipe-1',
  ])
  expect(
    result.additions[0]!.sourceQuantities?.every(
      (source) => source.ingredientIdentityVersion === 2,
    ),
  ).toBe(true)
})

it('keeps the released recipe structure canonical identity stable while purchasing upgrades', async () => {
  const { structureIngredient } = await import('../../src/domain/recipes/ingredientStructure')
  const structured = structureIngredient('100 g mushrooms')
  expect(structured.canonicalName).toBe('mushrooms')
  expect(canonicalIngredientName(structured.name)).toBe('mushroom')
})
