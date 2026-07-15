import { createContext, useContext } from 'react'

import type { HouseholdPeopleRepository } from '../../application/households/householdPeopleRepository'

export const HouseholdPeopleRepositoryContext = createContext<
  HouseholdPeopleRepository | undefined
>(undefined)

export function useHouseholdPeopleRepository() {
  const repository = useContext(HouseholdPeopleRepositoryContext)
  if (!repository) throw new Error('Household people management is not configured.')
  return repository
}
