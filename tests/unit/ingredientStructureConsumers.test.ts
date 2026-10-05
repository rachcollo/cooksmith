import { describe, expect, it } from 'vitest'
import { deriveRecipeContent } from '../../src/domain/recipes/contentDerivation'
import {
  buildDeterministicRecipeIntelligence,
  ingredientPreparationEvidence,
  validateProviderEnrichment,
} from '../../src/domain/recipes/intelligence'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import {
  refreshedIngredientInputs,
  sameIngredientSources,
} from '../../src/domain/shopping/structureRefresh'
import type { Recipe } from '../../src/domain/recipes/types'

function recipe(ingredients: string, scope: Recipe['scope'] = 'household'): Recipe {
  return {
    householdId: 'household',
    description: null,
    sourceNote: null,
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    imageUrl: null,
    notes: null,
    category: null,
    tags: [],
    favourite: false,
    createdAt: '2026-10-05T00:00:00Z',
    id: 'recipe',
    scope,
    ingredients,
    name: 'Synthetic',
    ingredientRows: deriveRecipeContent(ingredients, null).ingredients.map((row, index) => ({
      ...row,
      id: String(index),
      position: index,
    })),
    steps: [],
    measurementSystem: 'au',
    sourceUrl: null,
    updatedAt: '2026-10-05T00:00:00Z',
    archivedAt: null,
  }
}
const meal = {
  recipeState: {
    kind: 'active' as const,
    recipe: { id: 'recipe', name: 'Synthetic', archivedAt: null },
  },
}
const additions = (r: Recipe) => buildPlanAdditions([meal], [r], []).additions

describe('shared ingredient consumers', () => {
  it.each(['fresh garlic', 'onion', 'tomato', 'avocado', 'kohlrabi', 'radicchio'])(
    'groups prep-only variants of %s and preserves distinct Get Ahead preparation',
    (product) => {
      const r = recipe(`1 ${product}, sliced\n2 ${product}, crushed\n3 ${product}, diced`)
      const purchases = additions(r)
      expect(purchases).toHaveLength(1)
      expect(purchases[0]?.quantity).toBe(6)
      const source = {
        recipeId: r.id,
        recipeFingerprint: 'version',
        ingredients: r.ingredientRows.map((row) => ({
          id: row.id,
          name: row.name,
          quantityText: row.quantity,
          unit: row.unit,
          preparation: row.preparation,
          originalText: row.originalLineText,
          parserVersion: row.parserVersion,
        })),
        steps: [],
      }
      const intelligence = buildDeterministicRecipeIntelligence(source)
      expect(intelligence.ingredients.map((row) => row.structure?.preparation)).toEqual([
        'sliced',
        'crushed',
        'diced',
      ])
      expect(intelligence.ingredients.map((row) => row.structure?.canonicalName)).toEqual(
        purchases[0]?.sourceQuantities?.map((row) => row.ingredientStructure?.canonicalName),
      )
      expect(
        intelligence.ingredients.map(
          (ingredient) =>
            ingredientPreparationEvidence(intelligence, {
              kind: 'ingredient_prep',
              sourceIngredientIds: [ingredient.sourceIngredientId],
              canonicalIngredient: 'provider alias',
              preparationDetail: 'generic prep',
            } as Parameters<typeof ingredientPreparationEvidence>[1]).preparationDetail,
        ),
      ).toEqual(['sliced', 'crushed', 'diced'])
      expect(validateProviderEnrichment(source, intelligence).ok).toBe(true)
      intelligence.ingredients[0]!.structure!.name = 'invented product'
      expect(validateProviderEnrichment(source, intelligence)).toEqual({
        ok: false,
        reason: 'ingredient_structure_mismatch',
      })
    },
  )
  it('preserves garlic products, oil grades, optional alternatives and honest non-convertible amounts', () => {
    const purchases = additions(
      recipe(
        '3 tbsp extra virgin olive oil\n60 ml extra virgin olive oil\n2 tbsp olive oil\n55 g brown sugar\n1 tbsp brown sugar can be substituted with honey\n2 handfuls fresh baby spinach\n2 garlic, crushed\n20 g garlic powder\n20 g commercially jarred garlic paste',
      ),
    )
    expect(purchases.find((row) => row.name === 'extra virgin olive oil')).toMatchObject({
      quantity: 120,
      unit: 'ml',
    })
    expect(purchases.find((row) => row.name === 'olive oil')).toMatchObject({
      quantity: 40,
      unit: 'ml',
    })
    expect(purchases.filter((row) => row.name === 'brown sugar')).toHaveLength(2)
    expect(purchases.some((row) => row.name === 'honey')).toBe(false)
    expect(purchases.find((row) => row.name === 'fresh baby spinach')).toMatchObject({
      quantity: 2,
      unit: 'handful',
    })
    expect(purchases.filter((row) => row.name.includes('garlic'))).toHaveLength(3)
  })
  it('retains ambiguous conventions instead of inventing an EVOO total', () => {
    const r = {
      ...recipe('3 tbsp extra virgin olive oil\n60 ml extra virgin olive oil'),
      measurementSystem: 'unknown' as const,
    }
    expect(additions(r).map((row) => [row.quantity, row.unit])).toEqual([
      [3, 'tbsp'],
      [60, 'ml'],
    ])
  })
  it('matches source kind before an ID and rejects an ambiguous untyped collision', () => {
    const household = recipe('2 carrots'),
      shared = recipe('3 garlic', 'public')
    expect(
      buildPlanAdditions([{ ...meal, recipeSource: 'imported' }], [household, shared], [])
        .additions[0]?.name,
    ).toBe('garlic')
    expect(buildPlanAdditions([meal], [household, shared], []).additions).toEqual([])
  })
  it('refreshes only surviving source lines, repairs legacy fractions and rejects mismatched edits', () => {
    const r = recipe('1 1/2 cups plain flour\n2 carrots')
    const sources = [{ name: '1/2 cups plain flour', quantity: '1', unit: null }]
    expect(refreshedIngredientInputs(r, sources)).toMatchObject([
      { name: 'plain flour', quantity: 225, unit: 'g' },
    ])
    expect(refreshedIngredientInputs(recipe('2 cups plain flour'), sources)).toBeNull()
  })
  it('round-trips exact line whitespace through ingestion and rejects stale rules/source context', () => {
    expect(
      deriveRecipeContent('  2 garlic, crushed  ', null).ingredients[0]?.originalLineText,
    ).toBe('  2 garlic, crushed  ')
    const source = {
      recipeId: 'r',
      recipeFingerprint: 'v',
      sourceKind: 'household' as const,
      versionId: 'snapshot',
      sourceUrl: 'https://www.taste.com.au/recipe',
      ingredients: [],
      steps: [],
    }
    const value = buildDeterministicRecipeIntelligence(source)
    expect(value.sourceContext).toMatchObject({
      kind: 'household',
      versionId: 'snapshot',
      measurementSystem: 'au',
    })
    expect(
      validateProviderEnrichment(source, { ...value, rulesVersion: 'cooksmith-rules-v3' }).ok,
    ).toBe(false)
    expect(validateProviderEnrichment({ ...source, sourceKind: 'shared_platform' }, value).ok).toBe(
      false,
    )
  })
})

it('recognises JSONB-equivalent evidence and refuses duplicate legacy source claims', () => {
  expect(
    sameIngredientSources(
      [{ name: 'garlic', quantity: '2', unit: null }],
      [{ unit: null, quantity: '2', name: 'garlic' }],
    ),
  ).toBe(true)
  const r = recipe('2 garlic sliced')
  const source = { name: 'garlic sliced', quantity: '2', unit: null }
  expect(refreshedIngredientInputs(r, [source, source])).toBeNull()
})
