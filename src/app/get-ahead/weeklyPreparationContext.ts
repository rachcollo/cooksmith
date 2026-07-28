import { createContext, useContext } from 'react'

import type { WeeklyPreparationRepository } from '../../application/get-ahead/weeklyPreparationRepository'

export const WeeklyPreparationRepositoryContext = createContext<WeeklyPreparationRepository | null>(
  null,
)

export function useWeeklyPreparationRepository() {
  return useContext(WeeklyPreparationRepositoryContext)
}
