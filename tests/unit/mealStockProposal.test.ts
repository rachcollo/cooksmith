import { expect, it } from 'vitest'
import { mealStockProposal } from '../../src/domain/meal-plans/completion'
import type { Recipe } from '../../src/domain/recipes/types'
import type { PantryItem } from '../../src/domain/pantry/types'
const recipe = (ingredients: string) => ({ ingredientRows: [], ingredients }) as unknown as Recipe
const pantry = [
  { id: 'rice', name: 'Rice', quantity: 1000, unit: 'g', available: true, updatedAt: 'version' },
] as PantryItem[]
it('prefills exact known recipe usage without prompting for each item', () => {
  expect(mealStockProposal(recipe('600 g rice'), pantry)).toEqual({
    lines: [
      {
        kind: 'pantry',
        pantryItemId: 'rice',
        name: 'Rice',
        amount: 600,
        unit: 'g',
        updatedAt: 'version',
      },
    ],
    checks: [],
  })
})
it('combines repeated usage before checking sufficient balance', () => {
  expect(mealStockProposal(recipe('600 g rice\n500 g rice'), pantry)).toEqual({
    lines: [
      {
        kind: 'pantry',
        pantryItemId: 'rice',
        name: 'Rice',
        amount: 1000,
        unit: 'g',
        updatedAt: 'version',
      },
      { kind: 'untracked', name: 'rice' },
    ],
    checks: ['rice'],
  })
  expect(
    mealStockProposal(recipe('600 g rice\n200 g rice'), pantry).lines.filter(
      (line) => line.kind === 'pantry',
    )[0]?.amount,
  ).toBe(800)
})
it('leaves uncertain or absent stock unchanged rather than guessing or clamping', () => {
  for (const ingredients of ['rice to taste', '2 cups rice', 'about 600 g rice'])
    expect(mealStockProposal(recipe(ingredients), pantry).lines).toEqual([
      { kind: 'untracked', name: 'rice' },
    ])
  expect(
    mealStockProposal(recipe('600 g rice'), [{ ...pantry[0]!, quantity: null }]).lines,
  ).toEqual([{ kind: 'untracked', name: 'rice' }])
  expect(mealStockProposal(null, pantry)).toEqual({ lines: [], checks: [] })
})

it('uses known pending groceries after Pantry, leaving remaining put-away stock intact', () => {
  const result = mealStockProposal(
    recipe('600 g rice'),
    [{ ...pantry[0]!, quantity: 200 }],
    [{ id: 'purchase', name: 'rice', revision: 2, amounts: [{ quantity: 500, unit: 'g' }] }],
  )
  expect(result.checks).toEqual([])
  expect(result.lines).toEqual([
    {
      kind: 'pantry',
      pantryItemId: 'rice',
      name: 'Rice',
      unit: 'g',
      updatedAt: 'version',
      amount: 200,
    },
    {
      kind: 'purchase',
      purchaseId: 'purchase',
      purchaseIndex: 0,
      revision: 2,
      name: 'rice',
      unit: 'g',
      amount: 400,
    },
  ])
})
