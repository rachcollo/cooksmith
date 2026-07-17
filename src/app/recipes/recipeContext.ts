import { createContext, useContext } from 'react'

import type { RecipeRepository } from '../../application/recipes/recipeRepository'

export const RecipeRepositoryContext = createContext<RecipeRepository | undefined>(undefined)

export function useRecipeRepository() {
  const value = useContext(RecipeRepositoryContext)
  if (!value) throw new Error('Recipe library is not configured.')
  return value
}
