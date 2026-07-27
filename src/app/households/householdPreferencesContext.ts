import { createContext, useContext } from 'react'

import type { HouseholdPreferencesRepository } from '../../application/households/householdPreferencesRepository'

export const HouseholdPreferencesRepositoryContext =
  createContext<HouseholdPreferencesRepository | null>(null)

export function useHouseholdPreferencesRepository() {
  const repository = useContext(HouseholdPreferencesRepositoryContext)
  if (!repository) throw new Error('Household preferences repository is unavailable.')
  return repository
}
