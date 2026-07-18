import { describe, expect, it } from 'vitest'

import {
  deriveRecipeContent,
  recipeContentParserVersion,
} from '../../src/domain/recipes/contentDerivation'

describe('lossless recipe content derivation', () => {
  it('splits trimmed non-empty lines and preserves original ingredient text', () => {
    const result = deriveRecipeContent(
      '  1 cup lentils\r\n\n½ tsp salt\nripe tomatoes, chopped  ',
      null,
    )

    expect(result.parserVersion).toBe(recipeContentParserVersion)
    expect(result.ingredients).toEqual([
      expect.objectContaining({
        originalLineText: '1 cup lentils',
        quantity: '1',
        unit: 'cup',
        name: 'lentils',
        derivationStatus: 'derived',
      }),
      expect.objectContaining({
        originalLineText: '½ tsp salt',
        quantity: '½',
        unit: 'tsp',
        name: 'salt',
        derivationStatus: 'derived',
      }),
      expect.objectContaining({
        originalLineText: 'ripe tomatoes, chopped',
        quantity: null,
        unit: null,
        name: 'ripe tomatoes, chopped',
        derivationStatus: 'display_only',
      }),
    ])
  })

  it('supports ranges and leaves ambiguous quantities as display-only text', () => {
    const result = deriveRecipeContent('1-2 tbsp olive oil\n2 x large eggs', null)

    expect(result.ingredients[0]).toEqual(
      expect.objectContaining({ quantity: '1-2', unit: 'tbsp', name: 'olive oil' }),
    )
    expect(result.ingredients[1]).toEqual(
      expect.objectContaining({
        originalLineText: '2 x large eggs',
        quantity: null,
        unit: null,
        name: '2 x large eggs',
        derivationStatus: 'display_only',
      }),
    )
  })

  it('removes only decorative instruction numbering from derived steps', () => {
    const result = deriveRecipeContent(null, '1. Warm the pan.\n• Add pasta.\nServe as written.')

    expect(result.steps.map((step) => step.instruction)).toEqual([
      'Warm the pan.',
      'Add pasta.',
      'Serve as written.',
    ])
    expect(result.steps.map((step) => step.originalLineText)).toEqual([
      '1. Warm the pan.',
      '• Add pasta.',
      'Serve as written.',
    ])
  })

  it('is deterministic for the same parser version', () => {
    const first = deriveRecipeContent('200 g rice', '1) Rinse rice.', 'test-parser')
    const second = deriveRecipeContent('200 g rice', '1) Rinse rice.', 'test-parser')

    expect(second).toEqual(first)
    expect(first.ingredients[0]?.parserVersion).toBe('test-parser')
    expect(first.steps[0]?.parserVersion).toBe('test-parser')
  })
})
