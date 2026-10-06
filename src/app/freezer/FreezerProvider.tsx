import { useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '../auth/authContext'
import { FreezerRepositoryContext } from './freezerContext'
import { createSupabaseFreezerRepository } from '../../infrastructure/freezer/supabaseFreezerRepository'
export function FreezerProvider({ children }: { children: ReactNode }) {
  const supplied = useContext(FreezerRepositoryContext)
  const { client } = useAuth()
  const repository = useMemo(
    () =>
      supplied ??
      (client && 'schema' in client ? createSupabaseFreezerRepository(client) : undefined),
    [supplied, client],
  )
  return (
    <FreezerRepositoryContext.Provider value={repository}>
      {children}
    </FreezerRepositoryContext.Provider>
  )
}
