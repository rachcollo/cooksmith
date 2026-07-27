import { describe, expect, it } from 'vitest'

import {
  buildDeterministicRecipeIntelligence,
  recipeIntelligenceRulesVersion,
  recipeIntelligenceSchemaVersion,
  validateProviderEnrichment,
  type RecipeIntelligenceSource,
} from '../../src/domain/recipes/intelligence'

const source: RecipeIntelligenceSource = {
  recipeId: 'recipe-1',
  recipeFingerprint: 'fingerprint-1',
  ingredients: [
    {
      id: 'ingredient-1',
      name: 'Brown onion',
      originalText: '1 kg brown onion, finely diced',
      quantityText: '1',
      unit: 'kg',
      preparation: 'finely diced',
    },
    {
      id: 'ingredient-2',
      name: 'Stock',
      originalText: 'about 2 cups stock',
      quantityText: 'about 2',
      unit: 'cups',
      preparation: null,
    },
  ],
  steps: [{ id: 'step-1', instruction: 'Finely dice the onion, then add it to the pan.' }],
}

describe('recipe intelligence', () => {
  it('normalises known aliases and quantities without losing source text or preparation detail', () => {
    const result = buildDeterministicRecipeIntelligence(source)

    expect(result.ingredients[0]).toMatchObject({
      originalText: '1 kg brown onion, finely diced',
      canonicalName: 'onion',
      aliases: ['brown onion'],
      action: 'diced',
      preparationDetail: 'finely diced',
      sourceStepIds: ['step-1'],
      quantity: { state: 'known', normalisedValue: 1000, unit: 'g', dimension: 'mass' },
    })
    expect(result.ingredients[1].quantity).toMatchObject({
      state: 'approximate',
      normalisedValue: 2,
      unit: 'cup',
    })
  })

  it('keeps meaningfully different preparation actions distinct', () => {
    const diced = buildDeterministicRecipeIntelligence(source).ingredients[0]
    const chopped = buildDeterministicRecipeIntelligence({
      ...source,
      ingredients: [{ ...source.ingredients[0], preparation: 'roughly chopped' }],
    }).ingredients[0]

    expect(diced.preparationDetail).toBe('finely diced')
    expect(chopped.preparationDetail).toBe('roughly chopped')
  })

  it('keeps unsupported quantities explicitly unknown', () => {
    const result = buildDeterministicRecipeIntelligence({
      ...source,
      ingredients: [{ ...source.ingredients[0], quantityText: 'a handful', unit: null }],
    })

    expect(result.ingredients[0].quantity).toMatchObject({
      state: 'unknown',
      normalisedValue: null,
      dimension: 'unknown',
    })
  })

  it('rejects provider output with invented source references', () => {
    const deterministic = buildDeterministicRecipeIntelligence(source)
    const invented = {
      ...deterministic,
      ingredients: [{ ...deterministic.ingredients[0], sourceIngredientId: 'invented-ingredient' }],
    }

    expect(validateProviderEnrichment(source, invented)).toEqual({
      ok: false,
      reason: 'unsupported_reference',
    })
  })

  it('accepts a source-bound structured result', () => {
    const deterministic = buildDeterministicRecipeIntelligence(source)
    expect(validateProviderEnrichment(source, deterministic)).toEqual({
      ok: true,
      value: expect.objectContaining({
        schemaVersion: recipeIntelligenceSchemaVersion,
        rulesVersion: recipeIntelligenceRulesVersion,
      }),
    })
  })
})
