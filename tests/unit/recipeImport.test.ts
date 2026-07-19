import { describe, expect, it } from 'vitest'

import { extractRecipe } from '../../supabase/functions/import-recipe/extractor'
import {
  isBlockedAddress,
  validatePublicUrl,
} from '../../supabase/functions/import-recipe/urlSafety'

describe('recipe URL import', () => {
  it('extracts Recipe JSON-LD with author, ordered content and durations', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Tomato pasta',
      author: { '@type': 'Person', name: 'Alex Cook' },
      publisher: { '@type': 'Organization', name: 'Kitchen Test' },
      recipeIngredient: ['200 g pasta', '2 tomatoes'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Boil the pasta.' },
        {
          '@type': 'HowToSection',
          itemListElement: [{ '@type': 'HowToStep', text: 'Add tomatoes.' }],
        },
      ],
      recipeYield: '4 servings',
      prepTime: 'PT10M',
      cookTime: 'PT1H5M',
      image: ['https://images.example/pasta.jpg'],
    })}</script>`
    expect(extractRecipe(html, 'https://example.com/pasta')).toEqual({
      name: 'Tomato pasta',
      authorName: 'Alex Cook',
      publisherName: 'Kitchen Test',
      ingredients: '200 g pasta\n2 tomatoes',
      description: 'Boil the pasta.\nAdd tomatoes.',
      sourceUrl: 'https://example.com/pasta',
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 65,
      imageUrl: 'https://images.example/pasta.jpg',
      warnings: [],
    })
  })

  it('rejects internal and credential-bearing targets', () => {
    expect(() => validatePublicUrl('http://127.0.0.1/secret')).toThrow('blocked_url')
    expect(() => validatePublicUrl('https://user:pass@example.com/recipe')).toThrow('invalid_url')
    expect(isBlockedAddress('169.254.169.254')).toBe(true)
    expect(isBlockedAddress('::1')).toBe(true)
    expect(isBlockedAddress('::ffff:172.16.0.1')).toBe(true)
    expect(isBlockedAddress('203.0.113.8')).toBe(true)
    expect(isBlockedAddress('8.8.8.8')).toBe(false)
  })
})
