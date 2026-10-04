import { describe, expect, it } from 'vitest'
import { groupShoppingPurchases } from '../../src/domain/shopping/purchaseGroups'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import { deriveRecipeContent } from '../../src/domain/recipes/contentDerivation'
import type { ShoppingItem } from '../../src/domain/shopping/types'
import type { Recipe } from '../../src/domain/recipes/types'

const row = (
  id: string,
  name: string,
  quantity: number | null,
  unit: string | null,
  extra: Partial<ShoppingItem> = {},
): ShoppingItem => ({
  id,
  name,
  quantity,
  unit,
  householdId: 'synthetic-household',
  category: 'pantry',
  completed: false,
  position: 0,
  updatedAt: '2026-10-04T00:00:00Z',
  manual: false,
  ...extra,
})
describe('one purchasing row per product', () => {
  it('combines existing metric teaspoon and mL records without needing new shopping IDs', () => {
    const source = [
      row('old-ml', 'extra virgin olive oil', 60, 'mL'),
      row('old-tsp', 'Extra Virgin Olive Oil', 2, 'teaspoons'),
    ]
    const [purchase] = groupShoppingPurchases(source)
    expect(purchase?.amountLabel).toBe('70 ml')
    expect(purchase?.members.map((x) => x.id)).toEqual(['old-ml', 'old-tsp'])
    expect(source[1]?.quantity).toBe(2)
  })
  it('keeps regional tablespoons explicit in a single row instead of guessing their size', () => {
    const result = groupShoppingPurchases([
      row('a', 'extra virgin olive oil', 60, 'ml'),
      row('b', 'extra virgin olive oil', 3, 'tbsp'),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.amountLabel).toBe('60 ml + 3 tbsp')
  })
  it('keeps weight and volume explicit without guessing a salt density', () => {
    const result = groupShoppingPurchases([
      row('a', 'sea salt flakes', 50, 'g'),
      row('b', 'sea salt flakes', 2, 'tsp'),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.amountLabel).toBe('50 g + 10 ml')
  })
  it('removes usage wording and chooses specifically requested flakes for unspecified sea salt', () => {
    const result = groupShoppingPurchases([
      row('a', 'sea salt', 1, 'tsp'),
      row('b', 'sea salt flakes', 1, 'tsp'),
      row('c', 'sea salt flakes plus extra to taste', null, null),
      row('d', 'sea salt flakes to taste', null, null),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'sea salt flakes', amountLabel: '10 ml + to taste' })
  })
  it('does not merge explicitly fine/coarse salts or grades and forms of oil', () => {
    const names = [
      'fine sea salt',
      'coarse sea salt',
      'sea salt flakes',
      'extra virgin olive oil',
      'olive oil',
      'olive oil spray',
    ]
    expect(
      groupShoppingPurchases(names.map((name, i) => row(String(i), name, 1, null))),
    ).toHaveLength(names.length)
  })
  it('shows only quantities still needed when part of a product has been bought', () => {
    const result = groupShoppingPurchases([
      row('a', 'sea salt', 50, 'g', { completed: true }),
      row('b', 'sea salt', 1, 'tsp'),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ completed: false, amountLabel: '5 ml' })
    expect(result[0]?.members).toHaveLength(2)
  })
  it('retains known quantities alongside unquantified contributions', () => {
    const result = groupShoppingPurchases([
      row('a', 'sea salt flakes', null, 'g', {
        sourceQuantities: [
          { name: 'sea salt flakes', quantity: 50, unit: 'g' },
          { name: 'sea salt flakes to taste', quantity: null, unit: null },
        ],
      }),
    ])
    expect(result[0]?.amountLabel).toBe('50 g + to taste')
  })
  it('aggregates compatible weights and preserves genuinely different varieties', () => {
    const result = groupShoppingPurchases([
      row('a', 'brown onions', 0.5, 'kg'),
      row('b', 'brown onion', 250, 'g'),
      row('c', 'red onions', 1, null),
    ])
    expect(result).toHaveLength(2)
    expect(result[0]?.amountLabel).toBe('750 g')
  })
  it.each([false, true])(
    'repairs old plain-text/derived rows including mixed and Unicode fractions (structured=%s)',
    (structured) => {
      const ingredients =
        '1 diced onion\n2 sliced onions\n1 onion, peeled and finely chopped\n1 1/2 cups flour\n½ cup flour'
      const recipe = {
        id: 'r',
        ingredients,
        ingredientRows: structured ? deriveRecipeContent(ingredients, null).ingredients : [],
      } as Recipe
      const additions = buildPlanAdditions(
        [
          {
            recipeState: {
              kind: 'active',
              recipe: { id: 'r', name: 'Synthetic recipe', archivedAt: null },
            },
          },
        ],
        [recipe],
        [],
      ).additions
      expect(additions).toEqual([
        expect.objectContaining({ name: 'onion', quantity: 4, unit: null }),
        expect.objectContaining({ name: 'flour', quantity: 2, unit: 'cup' }),
      ])
      expect(recipe.ingredients).toBe(ingredients)
    },
  )
  it('groups old quantity-bearing shopping labels before any regeneration', () => {
    const result = groupShoppingPurchases([
      row('a', '1 diced onion', null, null),
      row('b', '2 sliced onions', null, null),
      row('c', '1 chopped onion', null, null),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'onion', amountLabel: '4' })
  })
  it('never chooses another household’s salt form or adds its quantity', () => {
    const purchases = groupShoppingPurchases([
      row('a', 'sea salt', 1, 'tsp'),
      row('b', 'sea salt flakes', 50, 'g', { householdId: 'different-household' }),
    ])
    expect(purchases).toHaveLength(2)
    expect(purchases[0]).toMatchObject({ name: 'sea salt', amountLabel: '5 ml' })
  })
  it('normalises teaspoon punctuation before adding plan contributions', () => {
    const recipe = {
      id: 'r',
      ingredients: '60 mL extra virgin olive oil\n2 tsp. extra virgin olive oil',
      ingredientRows: [],
    } as unknown as Recipe
    const additions = buildPlanAdditions(
      [{ recipeState: { kind: 'active', recipe: { id: 'r', name: 'Recipe', archivedAt: null } } }],
      [recipe],
      [],
    ).additions
    expect(additions).toHaveLength(1)
    expect(additions[0]).toMatchObject({ quantity: 70, unit: 'ml' })
    expect(additions[0]?.sourceQuantities).toHaveLength(2)
  })
})
