import { useContext, useMemo, type ReactNode } from 'react'

import { createSupabasePlannedMealRepository } from '../../infrastructure/meal-plans/supabasePlannedMealRepository'
import { useAuth } from '../auth/authContext'
import { PlannedMealRepositoryContext } from './plannedMealContext'

export function PlannedMealProvider({ children }: { children: ReactNode }) {
  const supplied = useContext(PlannedMealRepositoryContext)
  const { client } = useAuth()
  const repository = useMemo(() => {
    if (supplied) return supplied
    if (!client || !('schema' in client)) return undefined
    return createSupabasePlannedMealRepository(client)
  }, [client, supplied])
  return (
    <PlannedMealRepositoryContext.Provider value={repository}>
      {children}
    </PlannedMealRepositoryContext.Provider>
  )
}
