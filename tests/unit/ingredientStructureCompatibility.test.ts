import { expect, it } from 'vitest'
import {
  buildDeterministicRecipeIntelligence,
  validateProviderEnrichment,
} from '../../src/domain/recipes/intelligence'
const source = {
  recipeId: 'synthetic',
  recipeFingerprint: 'version',
  ingredients: [
    {
      id: 'butter',
      name: '25g unsalted butter, melted and cooled',
      originalText: '25g unsalted butter, melted and cooled',
      quantityText: null,
      unit: null,
      preparation: null,
      parserVersion: 'recipe-content-v2',
    },
  ],
  steps: [],
}
it('keeps existing v1 intelligence valid against its exact historical derivation', () => {
  const legacy = buildDeterministicRecipeIntelligence(source, 'ingredient-structure-rules-v1')
  expect(legacy.ingredients[0]?.structure?.name).toBe('25g unsalted butter, melted and cooled')
  expect(validateProviderEnrichment(source, legacy).ok).toBe(true)
  const current = buildDeterministicRecipeIntelligence(source)
  expect(current.ingredients[0]?.structure?.name).toBe('unsalted butter')
  expect(validateProviderEnrichment(source, current).ok).toBe(true)
  expect(validateProviderEnrichment({ ...source, recipeFingerprint: 'changed' }, legacy).ok).toBe(
    false,
  )
  legacy.ingredients[0]!.structure!.quantity.value = 500
  expect(validateProviderEnrichment(source, legacy)).toEqual({
    ok: false,
    reason: 'ingredient_structure_mismatch',
  })
})
it('does not accept a current derived structure labelled with legacy rules', () => {
  const value = buildDeterministicRecipeIntelligence(source)
  value.ingredients[0]!.structure!.rulesVersion = 'ingredient-structure-rules-v1'
  expect(validateProviderEnrichment(source, value).ok).toBe(false)
})
