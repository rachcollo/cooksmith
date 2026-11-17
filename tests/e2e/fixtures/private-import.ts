import { renderApp } from '../../renderApp'
import type { RecipeRepository } from '../../../src/application/recipes/recipeRepository'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'

const repository: RecipeRepository = {
  list: async () => [],
  create: async () => {
    throw new Error('Unused fixture action')
  },
  update: async () => {
    throw new Error('Unused fixture action')
  },
  archive: async () => {
    throw new Error('Unused fixture action')
  },
  importFromUrl: async () => ({
    name: 'Synthetic noodles',
    ingredients: '200 g noodles',
    description: 'Boil noodles.',
    sourceUrl: 'https://example.invalid/noodles',
    authorName: 'Synthetic cook',
    publisherName: 'Synthetic kitchen',
    servings: 2,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    imageUrl: null,
    warnings: [],
  }),
  createImported: async (input, visibility) => {
    if (visibility !== 'private') throw new Error('Imports must be private')
    return {
      ...input,
      id: 'synthetic-import',
      householdId: '',
      scope: visibility,
      ingredientRows: [],
      steps: [],
      archivedAt: null,
      createdAt: '2026-11-17T00:00:00Z',
      updatedAt: '2026-11-17T00:00:00Z',
    }
  },
}
renderApp(
  '/recipes',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  repository,
)
