import { describe, expect, it } from 'vitest'

import {
  prepareMultilineRecipeInput,
  recipeToMultilineInput,
  splitMeaningfulLines,
} from '../../src/domain/recipes/multilineContent'
import type { Recipe, RecipeInput } from '../../src/domain/recipes/types'

const input: RecipeInput = {
  name: 'Aloo gobi',
  ingredients: '  1½ cups potatoes\n\n½ tsp turmeric – optional\n coriander, to serve  ',
  description: 'Heat oil.\n\nAdd potatoes, then cauliflower.\nFinish with lemon.',
  sourceNote: null,
  sourceUrl: null,
  servings: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  imageUrl: null,
  notes: null,
  category: null,
  tags: [' dinner ', 'Dinner', 'vegetarian'],
  favourite: false,
  ingredientRows: [],
  steps: [],
}

describe('recipe multiline content', () => {
  it('derives ordered rows from meaningful multiline text without changing the source text', () => {
    const prepared = prepareMultilineRecipeInput(input)

    expect(prepared.ingredients).toBe(input.ingredients)
    expect(prepared.description).toBe(input.description)
    expect(prepared.ingredientRows.map((row) => row.name)).toEqual([
      '1½ cups potatoes',
      '½ tsp turmeric – optional',
      'coriander, to serve',
    ])
    expect(prepared.steps.map((step) => step.instruction)).toEqual([
      'Heat oil.',
      'Add potatoes, then cauliflower.',
      'Finish with lemon.',
    ])
  })

  it('converts structured legacy recipes to multiline text only when source text is missing', () => {
    const recipe: Recipe = {
      id: 'recipe-1',
      householdId: 'household-1',
      name: 'Legacy soup',
      ingredients: null,
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
      ingredientRows: [
        {
          id: 'i1',
          name: 'lentils',
          quantity: '1',
          unit: 'cup',
          preparation: null,
          originalLineText: '1 cup lentils',
          parserVersion: 'legacy',
          derivationStatus: 'derived',
          position: 1,
        },
        {
          id: 'i2',
          name: 'lemon',
          quantity: null,
          unit: null,
          preparation: 'juiced',
          originalLineText: 'lemon juiced',
          parserVersion: 'legacy',
          derivationStatus: 'derived',
          position: 2,
        },
      ],
      steps: [
        {
          id: 's1',
          instruction: 'Simmer gently.',
          originalLineText: 'Simmer gently.',
          parserVersion: 'legacy',
          derivationStatus: 'derived',
          position: 1,
        },
        {
          id: 's2',
          instruction: 'Season and serve.',
          originalLineText: 'Season and serve.',
          parserVersion: 'legacy',
          derivationStatus: 'derived',
          position: 2,
        },
      ],
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    expect(recipeToMultilineInput(recipe)).toMatchObject({
      ingredients: '1 cup lentils\nlemon juiced',
      description: 'Simmer gently.\nSeason and serve.',
    })
  })

  it('splits CRLF, CR and LF lines consistently for detail display', () => {
    expect(splitMeaningfulLines('one\r\ntwo\rthree\n\n')).toEqual(['one', 'two', 'three'])
  })
})
