import { describe, expect, it } from 'vitest'
import {
  convertPurchaseAmount,
  ingredientMeasures,
  normaliseMeasure,
  recipeMeasures,
  type MeasurementSystem,
} from '../../src/domain/measurements/purchaseMeasures'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import { groupShoppingPurchases } from '../../src/domain/shopping/purchaseGroups'
import type { Recipe } from '../../src/domain/recipes/types'
import type { ShoppingItem } from '../../src/domain/shopping/types'
const recipe = (ingredients: string, measurementSystem: MeasurementSystem = 'au') =>
  ({
    id: 'r',
    name: 'Synthetic',
    ingredientRows: [],
    ingredients,
    measurementSystem,
  }) as unknown as Recipe
const additions = (r: Recipe) =>
  buildPlanAdditions(
    [{ recipeState: { kind: 'active', recipe: { id: 'r', name: 'Synthetic', archivedAt: null } } }],
    [r],
    [],
  ).additions
const rows = (inputs: ReturnType<typeof additions>) =>
  inputs.map((input, index) => ({
    ...input,
    id: String(index),
    householdId: 'h',
    manual: false,
    completed: false,
    position: 0,
    updatedAt: '',
  })) as ShoppingItem[]
describe('sourced purchasing measures', () => {
  it.each([
    ['au', 20, 250],
    ['metric', 15, 250],
    ['us', 15, 240],
  ] as const)('uses explicit %s spoon/cup sizes', (system, spoon, cup) => {
    expect(normaliseMeasure('tbsp.', system)).toEqual({ unit: 'ml', multiplier: spoon })
    expect(normaliseMeasure('cups', system)).toEqual({ unit: 'ml', multiplier: cup })
    expect(normaliseMeasure('teaspoons', system)).toEqual({ unit: 'ml', multiplier: 5 })
  })
  it.each(['tsp', 'tbsp', 'cup'])('never invents an unknown %s size', (unit) =>
    expect(normaliseMeasure(unit)).toEqual({ unit, multiplier: 1 }),
  )
  it('uses only verified publisher hostnames, never locale/country suffix or lookalikes', () => {
    expect(recipeMeasures({ sourceUrl: 'https://www.taste.com.au/recipes/example' }).system).toBe(
      'au',
    )
    expect(recipeMeasures({ sourceUrl: 'https://taste.com.au.evil.invalid/' }).system).toBe(
      'unknown',
    )
    expect(recipeMeasures({ sourceUrl: 'https://other.com.au/' }).system).toBe('unknown')
    expect(
      recipeMeasures({ sourceUrl: 'https://taste.com.au/r', measurementSystem: 'us' }).system,
    ).toBe('us')
  })
  it('combines tsp, tbsp, cups, mL, g and kg for an explicit oil form', () => {
    const [purchase] = groupShoppingPurchases(
      rows(
        additions(
          recipe(
            '2 tsp extra virgin olive oil\n1 tbsp extra virgin olive oil\n1 cup extra virgin olive oil\n20 ml extra virgin olive oil\n91.3 g extra virgin olive oil\n0.0913 kg extra virgin olive oil',
          ),
        ),
      ),
    )
    expect(purchase?.amountLabel).toBe('about 500 ml')
    expect(purchase?.sourceQuantities).toHaveLength(6)
    expect(
      purchase?.sourceQuantities?.filter((source) => source.conversionId === 'codex-olive-oil-v1'),
    ).toHaveLength(2)
  })
  it('totals fractional legacy flour only with a known cup size and marks the estimate', () => {
    const [purchase] = groupShoppingPurchases(
      rows(additions(recipe('1 1/2 cups plain flour\n½ cup plain flour\n50 g plain flour'))),
    )
    expect(purchase?.amountLabel).toBe('about 350 g')
  })
  it('keeps exact weight totals exact', () => {
    const [purchase] = groupShoppingPurchases(
      rows(additions(recipe('0.5 kg plain flour\n50 g plain flour'))),
    )
    expect(purchase?.amountLabel).toBe('550 g')
  })
  it('keeps an unsupported or unverified amount alongside the known amount in one row', () => {
    const [purchase] = groupShoppingPurchases(
      rows(additions(recipe('1 cup plain flour\n50 g plain flour', 'unknown'))),
    )
    expect(purchase?.amountLabel).toBe('1 cup + 50 g')
    expect(
      groupShoppingPurchases(
        rows(additions(recipe('50 g sea salt flakes\n2 tsp sea salt flakes'))),
      )[0]?.amountLabel,
    ).toBe('50 g + 10 ml')
  })
  it.each([
    'sea salt flakes',
    'fine sea salt',
    'salt',
    'fresh garlic',
    'garlic powder',
    'brown sugar',
    'sifted plain flour',
    'packed plain flour',
    'melted butter',
    'whipped butter',
    'olive oil spray',
    'infused olive oil',
  ])('does not borrow a density for %s', (name) => {
    expect(convertPurchaseAmount(name, 1, 'cup', 'au')).toMatchObject({
      quantity: 250,
      unit: 'ml',
      approximate: false,
      conversionId: null,
    })
  })
  it('retains range and to-taste uncertainty', () => {
    const [purchase] = groupShoppingPurchases(
      rows(additions(recipe('1-2 cups plain flour\n50 g plain flour'))),
    )
    expect(purchase?.amountLabel).toContain('amount to check')
    const salt = groupShoppingPurchases(rows(additions(recipe('sea salt flakes to taste'))))[0]
    expect(salt?.amountLabel).toBe('to taste')
  })
  it('converts manual and planned rows together without rewriting them', () => {
    const planned = rows(additions(recipe('1 cup plain flour')))
    const manual = {
      ...planned[0]!,
      id: 'manual',
      combineWithPlan: true,
      quantity: 50,
      unit: 'g',
      manual: true,
      sourceQuantities: undefined,
    }
    expect(groupShoppingPurchases([...planned, manual])[0]?.amountLabel).toBe('about 200 g')
    expect(manual.quantity).toBe(50)
    expect(
      groupShoppingPurchases([...planned, { ...manual, combineWithPlan: false }]),
    ).toHaveLength(2)
  })
  it('all catalogue entries carry versioned primary-source evidence and positive measurements', () => {
    expect(new Set(ingredientMeasures.map((entry) => entry.id)).size).toBe(
      ingredientMeasures.length,
    )
    for (const entry of ingredientMeasures) {
      expect(entry.grams).toBeGreaterThan(0)
      expect(entry.millilitres).toBeGreaterThan(0)
      expect(entry.version).toBe(1)
      expect(entry.sourceUrl).toMatch(/^https:\/\//)
      expect(entry.sourceDescription.length).toBeGreaterThan(30)
    }
  })
  it('does not trust enrichment that drops a measured-form qualifier', () => {
    const source = recipe('1 cup sifted plain flour')
    source.ingredientRows = [
      {
        id: 'ingredient',
        name: 'plain flour',
        quantity: '1',
        unit: 'cup',
        preparation: null,
        originalLineText: '1 cup sifted plain flour',
        parserVersion: 'model-enriched',
        derivationStatus: 'derived',
        position: 0,
      },
    ]
    expect(additions(source)[0]).toMatchObject({
      quantity: 250,
      unit: 'ml',
      sourceQuantities: [expect.objectContaining({ approximate: false, conversionId: null })],
    })
  })
  it('parses spaced Unicode fractions and leading decimals before conversion', () => {
    expect(
      groupShoppingPurchases(rows(additions(recipe('1 ½ cups plain flour\n.5 cup plain flour'))))[0]
        ?.amountLabel,
    ).toBe('about 300 g')
  })
})
