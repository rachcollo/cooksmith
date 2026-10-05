import { describe, expect, it } from 'vitest'
import { groupShoppingPurchases } from '../../src/domain/shopping/purchaseGroups'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import { structureIngredient } from '../../src/domain/recipes/ingredientStructure'
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
  measurementSystem: 'au',
  ...extra,
})
describe('one purchasing row per product', () => {
  it('groups optional-replacement wording with the requested product without purchasing the alternative', () => {
    const source = [
      row('a', 'caster sugar', 40, 'g'),
      row('b', 'caster sugar can be substituted with maple syrup', 1, 'tbsp', {
        measurementSystem: 'unknown',
      }),
    ]
    const result = groupShoppingPurchases(source)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'caster sugar', amountLabel: '40 g + 1 tbsp' })
    expect(result[0]?.members[1]?.name).toBe('caster sugar can be substituted with maple syrup')
  })
  it('removes a numbered reference without confusing food packed in oil with frying oil', () => {
    const source = [
      row('a', 'oil for frying see note 7', null, null),
      row('b', 'roughly chopped sun dried tomatoes in oil see note 8', 30, 'g'),
      row('c', 'olive oil', 20, 'ml'),
    ]
    expect(groupShoppingPurchases(source).map((item) => item.name)).toEqual([
      'oil',
      'sun dried tomato in oil',
      'olive oil',
    ])
    expect(source[0]?.name).toBe('oil for frying see note 7')
    expect(structureIngredient(source[0]!.name)).toMatchObject({
      purpose: 'for frying',
      noteReferences: ['see note 7'],
    })
    expect(structureIngredient(source[1]!.name).preparation).toBe('roughly chopped')
  })
  it.each(['see notes', 'see note', '(see notes 4 and 5)', ', see note 6'])(
    'removes a trailing reference %s while retaining its source text',
    (reference) => {
      const original = `sunflower oil ${reference}`
      const [purchase] = groupShoppingPurchases([row('reference', original, 20, 'ml')])
      expect(purchase?.name).toBe('sunflower oil')
      expect(purchase?.members[0]?.name).toBe(original)
    },
  )
  it('cleans explicit fresh preparation but preserves packaged tomato forms and handful measures', () => {
    const names = [
      'tomato finely diced',
      'avocados mashed with a fork',
      'canned diced tomatoes',
      'diced tomatoes',
      'handfuls fresh baby spinach',
    ]
    expect(
      groupShoppingPurchases(names.map((name, i) => row(String(i), name, 1, null))).map(
        (item) => item.name,
      ),
    ).toEqual([
      'tomato',
      'avocados',
      'canned diced tomato',
      'diced tomato',
      'handfuls fresh baby spinach',
    ])
  })
  it('cleans fresh generated identities while retaining substitution wording in provenance', () => {
    const recipe = {
      id: 'r',
      ingredientRows: [],
      ingredients: '40 g caster sugar\n10 g caster sugar can be replaced with maple syrup',
    } as unknown as Recipe
    const { additions } = buildPlanAdditions(
      [
        {
          recipeState: { kind: 'active', recipe: { id: 'r', name: 'Synthetic', archivedAt: null } },
        },
      ],
      [recipe],
      [],
    )
    // Shared structure now consolidates stored contributions; legacy override matching has SQL/API coverage.
    expect(additions).toHaveLength(1)
    expect(
      groupShoppingPurchases(
        additions.map((input, index) =>
          row(String(index), input.name, input.quantity, input.unit, {
            sourceQuantities: input.sourceQuantities,
          }),
        ),
      )[0],
    ).toMatchObject({ name: 'caster sugar', amountLabel: '50 g' })
    expect(additions[0]?.sourceQuantities?.[1]?.name).toBe(
      'caster sugar can be replaced with maple syrup',
    )
    expect(additions[0]?.sourceQuantities?.[1]?.ingredientStructure?.substitutions).toEqual([
      'can be replaced with maple syrup',
    ])
  })
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
      row('b', 'extra virgin olive oil', 3, 'tbsp', { measurementSystem: 'unknown' }),
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
      measurementSystem: 'au',
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
