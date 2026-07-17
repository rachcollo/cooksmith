import { createContext, useContext } from 'react'
import type { PlannedMealRepository } from '../../application/meal-plans/plannedMealRepository'
export const PlannedMealRepositoryContext = createContext<PlannedMealRepository | undefined>(
  undefined,
)
export function usePlannedMealRepository() {
  const repository = useContext(PlannedMealRepositoryContext)
  if (!repository) throw new Error('Planned meal repository is not available.')
  return repository
}
