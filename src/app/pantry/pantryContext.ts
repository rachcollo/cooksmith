import { createContext, useContext } from 'react'

import type { PantryRepository } from '../../application/pantry/pantryRepository'

export const PantryRepositoryContext = createContext<PantryRepository | undefined>(undefined)

export function usePantryRepository() {
  const value = useContext(PantryRepositoryContext)
  if (!value) throw new Error('Pantry is not configured.')
  return value
}
