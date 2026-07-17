import { useContext, useMemo, type ReactNode } from 'react'

import { createSupabaseRecipeRepository } from '../../infrastructure/recipes/supabaseRecipeRepository'
import { useAuth } from '../auth/authContext'
import { RecipeRepositoryContext } from './recipeContext'

export function RecipeProvider({ children }: { children: ReactNode }) {
  const supplied = useContext(RecipeRepositoryContext)
  const { client } = useAuth()
  const repository = useMemo(() => {
    if (supplied) return supplied
    if (!client || !('schema' in client)) return undefined
    return createSupabaseRecipeRepository(client)
  }, [client, supplied])
  return (
    <RecipeRepositoryContext.Provider value={repository}>
      {children}
    </RecipeRepositoryContext.Provider>
  )
}
