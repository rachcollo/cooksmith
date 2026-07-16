import { useContext, useMemo, type ReactNode } from 'react'

import { createSupabasePantryRepository } from '../../infrastructure/pantry/supabasePantryRepository'
import { useAuth } from '../auth/authContext'
import { PantryRepositoryContext } from './pantryContext'

export function PantryProvider({ children }: { children: ReactNode }) {
  const supplied = useContext(PantryRepositoryContext)
  const { client } = useAuth()
  const repository = useMemo(() => {
    if (supplied) return supplied
    if (!client || !('schema' in client)) return undefined
    return createSupabasePantryRepository(client)
  }, [client, supplied])
  return (
    <PantryRepositoryContext.Provider value={repository}>
      {children}
    </PantryRepositoryContext.Provider>
  )
}
