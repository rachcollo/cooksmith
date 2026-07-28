import { createContext, useContext } from 'react'

import type { WeeklyPreparationAdminRepository } from '../../application/admin/weeklyPreparationAdminRepository'

export const WeeklyPreparationAdminRepositoryContext =
  createContext<WeeklyPreparationAdminRepository | null>(null)

export function useWeeklyPreparationAdminRepository() {
  return useContext(WeeklyPreparationAdminRepositoryContext)
}
