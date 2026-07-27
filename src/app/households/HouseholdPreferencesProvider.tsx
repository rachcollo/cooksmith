import { useContext, useMemo, type ReactNode } from 'react'

import { createSupabaseHouseholdPreferencesRepository } from '../../infrastructure/households/supabaseHouseholdPreferencesRepository'
import { EMPTY_HOUSEHOLD_PREFERENCE_PROFILE } from '../../domain/households/preferences'
import { useAuth } from '../auth/authContext'
import { HouseholdPreferencesRepositoryContext } from './householdPreferencesContext'

export function HouseholdPreferencesProvider({ children }: { children: ReactNode }) {
  const supplied = useContext(HouseholdPreferencesRepositoryContext)
  const { client } = useAuth()
  const repository = useMemo(
    () =>
      supplied ??
      (client && typeof client.schema === 'function'
        ? createSupabaseHouseholdPreferencesRepository(client)
        : {
            load: async () => ({ ...EMPTY_HOUSEHOLD_PREFERENCE_PROFILE }),
            save: async () => {
              throw new Error('Household preferences are unavailable. Try again.')
            },
          }),
    [client, supplied],
  )
  return (
    <HouseholdPreferencesRepositoryContext.Provider value={repository}>
      {children}
    </HouseholdPreferencesRepositoryContext.Provider>
  )
}
