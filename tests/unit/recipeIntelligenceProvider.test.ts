import { describe, expect, it } from 'vitest'

import {
  applyProviderIngredientSuggestions,
  buildDeterministicRecipeIntelligence,
  type ProviderIngredientSuggestion,
} from '../../src/domain/recipes/intelligence'

const source = {
  recipeId: 'recipe-1',
  recipeFingerprint: 'fingerprint-1',
  ingredients: [
    {
      id: 'ingredient-1',
      name: '1 large Brown Onion (finely chopped)',
      originalText: '1 large brown onion (finely chopped)',
      quantityText: '1',
      unit: null,
      preparation: null,
    },
  ],
  steps: [{ id: 'step-1', instruction: 'Finely chop the onion.' }],
}

const suggestion: ProviderIngredientSuggestion = {
  sourceIngredientId: 'ingredient-1',
  canonicalName: 'onion',
  aliases: ['brown onion'],
  modifiers: ['large'],
  quantity: {
    state: 'known',
    original: '1',
    normalisedValue: 1,
    normalisedMaximum: 1,
    unit: null,
    dimension: 'count',
  },
  action: 'chopped',
  preparationDetail: 'finely chopped',
  sourceStepIds: ['step-1'],
  confidence: 'high',
}

describe('Recipe Intelligence provider results', () => {
  it('improves Get Ahead fields while preserving immutable source evidence', () => {
    const result = applyProviderIngredientSuggestions(
      source,
      buildDeterministicRecipeIntelligence(source),
      [suggestion],
    )

    expect(result.ingredients[0]).toMatchObject({
      originalText: '1 large brown onion (finely chopped)',
      canonicalName: 'onion',
      aliases: ['brown onion'],
      action: 'chopped',
      preparationDetail: 'finely chopped',
      sourceStepIds: ['step-1'],
      provenance: 'model',
    })
    expect(result.unresolvedIngredientIds).toEqual([])
    expect(result.overallConfidence).toBe('high')
  })

  it('stores source-bound recipe-level make-ahead opportunities', () => {
    const result = applyProviderIngredientSuggestions(
      source,
      buildDeterministicRecipeIntelligence(source),
      [suggestion],
      [
        {
          opportunityId: 'onion-prep',
          title: 'Finely chop the onion',
          canonicalIngredient: 'onion',
          action: 'chop',
          kind: 'ingredient_prep',
          preparationDetail: 'finely chopped',
          sourceIngredientIds: ['ingredient-1'],
          sourceStepIds: ['step-1'],
          ingredientLines: ['1 large brown onion'],
          instructionSteps: ['Finely chop the onion.'],
          stoppingPoint: 'The onion is finely chopped.',
          storageGuidance: 'Refrigerate in a covered container.',
          finishingGuidance: 'Add the onion when making the sauce.',
          estimatedMinutes: 6,
          estimatedTimeSavedMinutes: 8,
          maximumLeadTimeHours: 72,
          boundaries: [],
          confidence: 'high',
        },
      ],
    )

    expect(result.preparationOpportunities).toEqual([
      expect.objectContaining({
        opportunityId: 'onion-prep',
        title: 'Finely chop the onion',
        maximumLeadTimeHours: 72,
      }),
    ])
  })

  it('rejects opportunities that invent recipe evidence', () => {
    expect(() =>
      applyProviderIngredientSuggestions(
        source,
        buildDeterministicRecipeIntelligence(source),
        [suggestion],
        [
          {
            opportunityId: 'invented',
            title: 'Make an invented sauce',
            canonicalIngredient: 'sauce',
            action: 'mix',
            preparationDetail: null,
            sourceIngredientIds: ['invented-ingredient'],
            sourceStepIds: ['step-1'],
            estimatedMinutes: 10,
            estimatedTimeSavedMinutes: 15,
            maximumLeadTimeHours: 48,
            boundaries: [],
            confidence: 'high',
          },
        ],
      ),
    ).toThrow('unsupported_data')
  })

  it('rejects visible storage-deadline suggestions', () => {
    expect(() =>
      applyProviderIngredientSuggestions(
        source,
        buildDeterministicRecipeIntelligence(source),
        [suggestion],
        [
          {
            opportunityId: 'storage-copy',
            title: 'Chop onion and use within two days',
            canonicalIngredient: 'onion',
            action: 'chop',
            preparationDetail: null,
            sourceIngredientIds: ['ingredient-1'],
            sourceStepIds: ['step-1'],
            estimatedMinutes: 6,
            estimatedTimeSavedMinutes: 8,
            maximumLeadTimeHours: 48,
            boundaries: [],
            confidence: 'high',
          },
        ],
      ),
    ).toThrow('unsupported_data')
  })

  it('rejects duplicate and invented source identities', () => {
    const twoIngredientSource = {
      ...source,
      ingredients: [...source.ingredients, { ...source.ingredients[0], id: 'ingredient-2' }],
    }
    expect(() =>
      applyProviderIngredientSuggestions(
        twoIngredientSource,
        buildDeterministicRecipeIntelligence(twoIngredientSource),
        [suggestion, suggestion],
      ),
    ).toThrow('unsupported_data')
  })

  it('rejects duplicate provider values after schema validation', () => {
    expect(() =>
      applyProviderIngredientSuggestions(source, buildDeterministicRecipeIntelligence(source), [
        { ...suggestion, aliases: ['brown onion', 'brown onion'] },
      ]),
    ).toThrow('unsupported_data')

    expect(() =>
      applyProviderIngredientSuggestions(source, buildDeterministicRecipeIntelligence(source), [
        { ...suggestion, sourceStepIds: ['step-1', 'step-1'] },
      ]),
    ).toThrow('unsupported_data')
  })
})
