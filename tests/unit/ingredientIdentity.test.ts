import { describe, expect, it } from 'vitest'
import {
  canonicalIngredientName,
  canonicalIngredientUnit,
  ingredientPurchaseKey,
  parseIngredientQuantity,
} from '../../src/domain/shopping/ingredientIdentity'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import { matchShoppingItemToPantry } from '../../src/domain/shopping/pantryMatching'
import type { Recipe } from '../../src/domain/recipes/types'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import type { PantryItem } from '../../src/domain/pantry/types'

describe('v1 purchasing identity', () => {
  it.each([
    [' Diced onions ', 'onion'],
    ['ONIONS, thinly sliced', 'onion'],
    ['chopped onion', 'onion'],
    ['Garlic-powder', 'garlic powder'],
    ['garlic powders', 'garlic powder'],
    ['bell peppers', 'capsicum'],
    ['courgettes', 'zucchini'],
    ['cilantro', 'coriander'],
    ['Greek yogurt', 'greek yoghurt'],
    ['red onions', 'red onion'],
    ['brown onions', 'brown onion'],
    ['frozen diced onions', 'frozen diced onion'],
    ['pre-diced onions', 'pre diced onion'],
    ['canned chopped tomatoes', 'canned chopped tomato'],
    ['minced beef', 'minced beef'],
    ['diced tomatoes', 'diced tomato'],
    ['2 onions', '2 onions'],
  ])('normalises %s conservatively to %s', (input, expected) => {
    expect(canonicalIngredientName(input)).toBe(expected)
    expect(canonicalIngredientName(expected)).toBe(expected)
  })

  it('keeps material product varieties, forms and dietary qualifiers distinct', () => {
    const names = [
      'onion',
      'red onion',
      'brown onion',
      'spring onion',
      'onion powder',
      'frozen diced onion',
      'pre diced onion',
      'garlic',
      'garlic powder',
      'milk',
      'lactose-free milk',
    ]
    expect(new Set(names.map(canonicalIngredientName)).size).toBe(names.length)
    expect(ingredientPurchaseKey('onions', 'cup')).not.toBe(ingredientPurchaseKey('onion', null))
  })

  it('converts only explicit metric scales and keeps household measures separate', () => {
    expect(canonicalIngredientUnit('kg')).toEqual({ unit: 'g', multiplier: 1000 })
    expect(canonicalIngredientUnit('litres')).toEqual({ unit: 'ml', multiplier: 1000 })
    expect(canonicalIngredientUnit('tablespoons')).toEqual({ unit: 'tbsp', multiplier: 1 })
    expect(canonicalIngredientUnit('cup').unit).not.toBe(canonicalIngredientUnit('ml').unit)
    expect(parseIngredientQuantity('1 1/2')).toBe(1.5)
    expect(parseIngredientQuantity('1/0')).toBeNull()
    expect(parseIngredientQuantity('to taste')).toBeNull()
  })

  it('consolidates 1 diced + 2 sliced + 1 chopped onion while retaining recipe sources', () => {
    const rows = [
      { name: 'diced onions', quantity: '1', unit: null },
      { name: 'sliced onions', quantity: '2', unit: 'each' },
      { name: 'chopped onion', quantity: '1', unit: null },
      { name: 'onion', quantity: '1', unit: 'cup' },
      { name: 'carrots', quantity: '0.5', unit: 'kg' },
      { name: 'carrot', quantity: '250', unit: 'g' },
    ]
    const recipe = { id: 'recipe', ingredientRows: rows } as Recipe
    const meal = { recipeState: { kind: 'active', recipe: { id: 'recipe' } } } as PlannedMeal
    const result = buildPlanAdditions([meal], [recipe], [])
    expect(result.additions).toEqual([
      expect.objectContaining({
        name: 'onion',
        quantity: 4,
        unit: null,
        sourceQuantities: rows.slice(0, 3).map((row) =>
          expect.objectContaining({
            ...row,
            purchaseName: 'onion',
            measurementSystem: 'unknown',
            approximate: false,
          }),
        ),
      }),
      expect.objectContaining({ name: 'onion', quantity: 1, unit: 'cup' }),
      expect.objectContaining({ name: 'carrot', quantity: 750, unit: 'g' }),
    ])
    expect(rows[0]!.name).toBe('diced onions')
  })

  it('uses the same product identity for pantry matching without choosing between existing aliases', () => {
    const pantry = { id: 'p1', name: 'onion', available: true } as PantryItem
    expect(matchShoppingItemToPantry('diced onions', [pantry])).toMatchObject({
      state: 'match',
      pantryItemId: 'p1',
    })
    expect(
      matchShoppingItemToPantry('onions', [pantry, { ...pantry, id: 'p2', name: 'sliced onions' }]),
    ).toMatchObject({ state: 'ambiguous' })
    expect(
      matchShoppingItemToPantry('garlic powder', [{ ...pantry, name: 'garlic' }]),
    ).not.toMatchObject({ state: 'match' })
  })
})
