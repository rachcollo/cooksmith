import { describe, expect, it } from 'vitest'

import {
  buildDeterministicRecipeIntelligence,
  type RecipeIntelligenceSource,
} from '../../src/domain/recipes/intelligence'

const corpus: Array<{
  name: string
  source: RecipeIntelligenceSource
  expected: Array<Record<string, unknown>>
}> = [
  {
    name: 'metric publisher-style recipe',
    source: {
      recipeId: 'metric',
      recipeFingerprint: 'metric-v1',
      ingredients: [
        {
          id: 'metric-onion',
          name: 'brown onion',
          originalText: '1 kg brown onion, finely diced',
          quantityText: '1',
          unit: 'kg',
          preparation: 'finely diced',
        },
      ],
      steps: [{ id: 'metric-step', instruction: 'Finely dice the onion.' }],
    },
    expected: [
      {
        canonicalName: 'onion',
        preparationDetail: 'finely diced',
        quantity: expect.objectContaining({ normalisedValue: 1000, unit: 'g' }),
      },
    ],
  },
  {
    name: 'imperial user-authored recipe',
    source: {
      recipeId: 'imperial',
      recipeFingerprint: 'imperial-v1',
      ingredients: [
        {
          id: 'imperial-beef',
          name: 'beef',
          originalText: '1 lb beef, roughly chopped',
          quantityText: '1',
          unit: 'lb',
          preparation: 'roughly chopped',
        },
      ],
      steps: [{ id: 'imperial-step', instruction: 'Roughly chop the beef.' }],
    },
    expected: [
      {
        canonicalName: 'beef',
        preparationDetail: 'roughly chopped',
        quantity: expect.objectContaining({ normalisedValue: 453.592, unit: 'g' }),
      },
    ],
  },
  {
    name: 'range and ambiguous wording',
    source: {
      recipeId: 'range',
      recipeFingerprint: 'range-v1',
      ingredients: [
        {
          id: 'range-stock',
          name: 'stock',
          originalText: '2-3 cups stock',
          quantityText: '2-3',
          unit: 'cups',
          preparation: null,
        },
      ],
      steps: [{ id: 'range-step', instruction: 'Add enough liquid to cover.' }],
    },
    expected: [
      {
        quantity: expect.objectContaining({
          state: 'range',
          normalisedValue: 2,
          normalisedMaximum: 3,
          unit: 'cup',
        }),
        sourceStepIds: [],
      },
    ],
  },
  {
    name: 'unknown quantity remains unknown',
    source: {
      recipeId: 'unknown',
      recipeFingerprint: 'unknown-v1',
      ingredients: [
        {
          id: 'unknown-herbs',
          name: 'herbs',
          originalText: 'a handful of herbs',
          quantityText: 'a handful',
          unit: null,
          preparation: 'roughly chopped',
        },
      ],
      steps: [{ id: 'unknown-step', instruction: 'Roughly chop the herbs.' }],
    },
    expected: [
      {
        preparationDetail: 'roughly chopped',
        quantity: expect.objectContaining({ state: 'unknown', normalisedValue: null }),
      },
    ],
  },
]

describe('Recipe Intelligence representative deterministic evaluation', () => {
  it.each(corpus)('$name', ({ source, expected }) => {
    const result = buildDeterministicRecipeIntelligence(source)
    expected.forEach((ingredient, index) => {
      expect(result.ingredients[index]).toEqual(expect.objectContaining(ingredient))
    })
    expect(result.ingredients.every((ingredient) => ingredient.originalText.length > 0)).toBe(true)
  })
})
