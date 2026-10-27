import { describe, expect, it } from 'vitest'
import { recipeImportError } from '../../src/infrastructure/recipes/recipeImportError'

describe('recipe import diagnostics', () => {
  it.each([
    'recipe_not_found',
    'incomplete_recipe',
    'ambiguous_recipe',
    'unsupported_layout',
    'unsupported_content_type',
    'unavailable',
    'too_large',
    'rate_limited',
    'invalid_url',
    'blocked_url',
    'redirect_limit',
    'unsupported',
  ])('maps %s to safe recovery advice', async (error) => {
    const message = await recipeImportError({
      context: new Response(JSON.stringify({ error }), { status: 422 }),
    })
    expect(message).not.toContain(error)
    expect(message).not.toBe(
      'Cooksmith could not import that page. Try again or add the recipe manually.',
    )
  })
  it('provides session recovery', async () => {
    expect(await recipeImportError({ context: new Response(null, { status: 401 }) })).toContain(
      'Sign in again',
    )
  })
  it.each([
    new Response('private gateway details'),
    new Response(JSON.stringify({ error: 'secret network details' })),
    null,
  ])('never exposes raw remote errors', async (context) => {
    expect(await recipeImportError({ context })).toBe(
      'Cooksmith could not import that page. Try again or add the recipe manually.',
    )
  })
})
