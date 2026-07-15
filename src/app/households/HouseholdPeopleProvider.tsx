import { useContext, useMemo, type ReactNode } from 'react'

import { createSupabaseHouseholdPeopleRepository } from '../../infrastructure/households/supabaseHouseholdPeopleRepository'
import { useAuth } from '../auth/authContext'
import { HouseholdPeopleRepositoryContext } from './householdPeopleContext'

export function HouseholdPeopleProvider({ children }: { children: ReactNode }) {
  const supplied = useContext(HouseholdPeopleRepositoryContext)
  const { client } = useAuth()
  const repository = useMemo(
    () => supplied ?? (client ? createSupabaseHouseholdPeopleRepository(client) : undefined),
    [client, supplied],
  )
  return (
    <HouseholdPeopleRepositoryContext.Provider value={repository}>
      {children}
    </HouseholdPeopleRepositoryContext.Provider>
  )
}
