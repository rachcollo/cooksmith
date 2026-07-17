import { describe, expect, it } from 'vitest'

import { recipeInputSchema } from '../../src/domain/recipes/validationSchemas'

const baseRecipe = {
  name: 'Lentil soup',
  ingredients: '',
  description: '',
  sourceNote: '',
  sourceUrl: '',
  servings: '',
  prepTimeMinutes: '',
  cookTimeMinutes: '',
  imageUrl: '',
}

describe('recipe input validation', () => {
  it('requires a recipe name and normalises blank optional fields', () => {
    const result = recipeInputSchema.safeParse(baseRecipe)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Lentil soup')
      expect(result.data.ingredients).toBeNull()
      expect(result.data.description).toBeNull()
      expect(result.data.sourceUrl).toBeNull()
    }

    expect(recipeInputSchema.safeParse({ ...baseRecipe, name: ' ' }).success).toBe(false)
  })

  it('rejects negative, fractional and unsafe URL values', () => {
    expect(recipeInputSchema.safeParse({ ...baseRecipe, servings: -1 }).success).toBe(false)
    expect(recipeInputSchema.safeParse({ ...baseRecipe, prepTimeMinutes: 1.5 }).success).toBe(false)
    expect(
      recipeInputSchema.safeParse({ ...baseRecipe, sourceUrl: 'javascript:alert(1)' }).success,
    ).toBe(false)
    expect(
      recipeInputSchema.safeParse({ ...baseRecipe, imageUrl: 'ftp://example.invalid/a.jpg' })
        .success,
    ).toBe(false)
  })

  it('accepts safe web URLs and non-negative numbers', () => {
    const result = recipeInputSchema.safeParse({
      ...baseRecipe,
      sourceUrl: 'https://example.invalid/source',
      imageUrl: 'http://example.invalid/image.jpg',
      servings: 4,
      prepTimeMinutes: 0,
      cookTimeMinutes: 30,
    })
    expect(result.success).toBe(true)
  })
})
