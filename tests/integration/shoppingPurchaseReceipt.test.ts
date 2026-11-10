import { describe, expect, it } from 'vitest'
import { deriveRecipeContent } from '../../src/domain/recipes/contentDerivation'
import type { Recipe } from '../../src/domain/recipes/types'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import {
  groupShoppingPurchases,
  purchaseReceiptAmounts,
} from '../../src/domain/shopping/purchaseGroups'
import { groupPutAwaySources } from '../../src/domain/shopping/putAway'
import type { ShoppingItem } from '../../src/domain/shopping/types'

const item = (overrides: Partial<ShoppingItem>): ShoppingItem => ({
  id: 'shopping-synthetic',
  householdId: 'household-synthetic',
  name: 'butter',
  quantity: null,
  unit: null,
  category: 'pantry',
  completed: false,
  position: 0,
  updatedAt: '2026-11-07T00:00:00Z',
  manual: false,
  ...overrides,
})
function purchasesFor(ingredients: string, structured: boolean) {
  const recipe: Recipe = {
    id: 'recipe-synthetic',
    householdId: 'household-synthetic',
    name: 'Synthetic recipe',
    ingredients,
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
    favourite: false,
    steps: [],
    archivedAt: null,
    createdAt: '2026-11-07T00:00:00Z',
    updatedAt: '2026-11-07T00:00:00Z',
    ingredientRows: structured
      ? deriveRecipeContent(ingredients, null).ingredients.map((row, position) => ({
          ...row,
          id: `ingredient-${position}`,
          position,
        }))
      : [],
  }
  const plan = buildPlanAdditions(
    [
      {
        recipeState: {
          kind: 'active',
          recipe: {
            id: recipe.id,
            name: recipe.name,
            archivedAt: null,
          },
        },
      },
    ],
    [recipe],
    [],
  )
  return groupShoppingPurchases(
    plan.additions.map((addition, position) =>
      item({
        ...addition,
        id: `shopping-${position}`,
        position,
      }),
    ),
  )
}

describe('source measurements through shopping and bought receipts', () => {
  it.each([false, true])(
    'preserves explicit metric quantities and source evidence through put-away (structured=%s)',
    (structured) => {
      const lines = [
        '25g / 1 1/2 tbsp unsalted butter melted and cooled',
        '600 g lamb mince (substitute beef)',
        '2 x 400 g canned tomatoes',
      ]
      const purchases = purchasesFor(lines.join('\n'), structured)
      expect(purchases.map(({ name, amountLabel }) => ({ name, amountLabel }))).toEqual([
        { name: 'unsalted butter', amountLabel: '25 g' },
        { name: 'lamb mince', amountLabel: '600 g' },
        { name: 'canned tomato', amountLabel: '800 g' },
      ])
      const receipts = purchases.map((purchase) => ({
        key: purchase.id,
        token: 'synthetic-token',
        shoppingItemId: purchase.id,
        name: purchase.name,
        amounts: purchaseReceiptAmounts(purchase),
      }))
      expect(receipts.map(({ amounts }) => amounts)).toEqual([
        [{ quantity: 25, unit: 'g' }],
        [{ quantity: 600, unit: 'g' }],
        [{ quantity: 800, unit: 'g' }],
      ])
      expect(
        groupPutAwaySources(receipts).map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      ).toEqual([
        { name: 'unsalted butter', quantity: 25, unit: 'g' },
        { name: 'lamb mince', quantity: 600, unit: 'g' },
        { name: 'canned tomato', quantity: 800, unit: 'g' },
      ])
      purchases.forEach((purchase, index) =>
        expect(purchase.members[0]?.sourceQuantities?.[0]?.originalText).toBe(lines[index]),
      )
    },
  )
  it.each(['about 600 g lamb mince', '500-600 g lamb mince', 'lamb mince as needed'])(
    'does not invent exact bought stock for %s',
    (line) => {
      const purchase = purchasesFor(line, true)[0]!
      expect(purchaseReceiptAmounts(purchase).every(({ quantity }) => quantity === null)).toBe(true)
    },
  )
  it('retains an unknown extra contribution alongside a measured amount', () => {
    const [purchase] = purchasesFor('25 g butter plus extra to serve', true)
    const receipt = purchaseReceiptAmounts(purchase!)
    expect(receipt).toEqual([
      { quantity: 25, unit: 'g' },
      { quantity: null, unit: null },
    ])
    expect(
      groupPutAwaySources([
        {
          key: 'key',
          token: 'token',
          shoppingItemId: 'item',
          name: purchase!.name,
          amounts: receipt,
        },
      ])[0],
    ).toMatchObject({ quantity: 25, unit: 'g', quantityUntracked: true })
  })
  it('does not treat extra virgin as an unquantified extra', () => {
    const [purchase] = purchasesFor('20 ml extra virgin olive oil', true)
    expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity: 20, unit: 'ml' }])
  })
  it('preserves ordinary manual display fields and exact receipt units for inline editing', () => {
    const [purchase] = groupShoppingPurchases([
      item({ name: 'Milk', quantity: 2, unit: 'l', manual: true }),
    ])
    expect(purchase).toMatchObject({ name: 'Milk', quantity: 2, unit: 'l', amountLabel: '2 l' })
    expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity: 2, unit: 'l' }])
    expect(
      groupPutAwaySources([
        {
          key: 'p:milk',
          token: 'token',
          shoppingItemId: 'milk',
          name: purchase!.name,
          amounts: purchaseReceiptAmounts(purchase!),
        },
      ])[0],
    ).toMatchObject({ name: 'milk', quantity: 2000, unit: 'ml' })
  })
  it('keeps manual quantity-bearing labels readable and honours explicit quantity edits', () => {
    const [parsed] = groupShoppingPurchases([
      item({ name: '600 g lamb mince (substitute beef)', manual: true }),
    ])
    expect(parsed).toMatchObject({ name: 'lamb mince', amountLabel: '600 g' })
    expect(purchaseReceiptAmounts(parsed!)).toEqual([{ quantity: 600, unit: 'g' }])
    const [edited] = groupShoppingPurchases([
      item({ name: '600 g lamb mince (substitute beef)', quantity: 750, unit: 'g', manual: true }),
    ])
    expect(purchaseReceiptAmounts(edited!)).toEqual([{ quantity: 750, unit: 'g' }])
  })
  it('keeps density-based shopping estimates out of exact stock', () => {
    const [purchase] = groupShoppingPurchases([
      item({ name: 'plain flour', quantity: 1, unit: 'cup', measurementSystem: 'au' }),
    ])
    expect(purchase?.amountLabel).toBe('about 150 g')
    expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity: null, unit: 'g' }])
  })
  it('uses a validated package aggregate in a legacy manual label', () => {
    const [purchase] = groupShoppingPurchases([
      item({ name: '2 x 400 g canned tomatoes', manual: true }),
    ])
    expect(purchase).toMatchObject({ name: 'canned tomato', amountLabel: '800 g' })
    expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity: 800, unit: 'g' }])
  })
  it('carries explicit source counts without assuming every unitless manual amount is a count', () => {
    const [counted] = groupShoppingPurchases([item({ name: '2 eggs', manual: true })])
    expect(purchaseReceiptAmounts(counted!)).toEqual([{ quantity: 2, unit: 'each' }])
    const [unknown] = groupShoppingPurchases([item({ name: 'flour', quantity: 2, manual: true })])
    expect(purchaseReceiptAmounts(unknown!)).toEqual([{ quantity: 2, unit: null }])
  })
  it.each([750, null])(
    'preserves an explicit plan override of %s without reusing recipe demand or uncertainty',
    (quantity) => {
      const [purchase] = groupShoppingPurchases([
        item({
          name: 'lamb mince',
          quantity,
          unit: 'g',
          planOverride: true,
          sourceQuantities: [
            { name: 'lamb mince as needed', quantity: '600', unit: 'g', approximate: true },
          ],
        }),
      ])
      expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity, unit: 'g' }])
    },
  )
  it('does not recover recipe-label demand for a completed unknown purchase', () => {
    const [purchase] = groupShoppingPurchases([item({ name: '600 g lamb mince', completed: true })])
    expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity: null, unit: null }])
  })
  it('never repopulates a completed unknown purchase from recipe demand', () => {
    const [purchase] = groupShoppingPurchases([
      item({
        name: 'lamb mince',
        completed: true,
        sourceQuantities: [{ name: 'lamb mince', quantity: '600', unit: 'g' }],
      }),
    ])
    expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity: null, unit: null }])
  })
  it('does not turn an upper-bound stock check into exact bought stock', () => {
    const [purchase] = groupShoppingPurchases([
      item({ name: 'lamb mince', quantity: 600, unit: 'g', stockCheck: true }),
    ])
    expect(purchaseReceiptAmounts(purchase!)).toEqual([{ quantity: null, unit: 'g' }])
  })
})
