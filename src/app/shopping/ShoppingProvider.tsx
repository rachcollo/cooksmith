import { useContext, useMemo, type ReactNode } from 'react'

import { createSupabaseShoppingRepository } from '../../infrastructure/shopping/supabaseShoppingRepository'
import { useAuth } from '../auth/authContext'
import { ShoppingRepositoryContext } from './shoppingContext'

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const supplied = useContext(ShoppingRepositoryContext)
  const { client } = useAuth()
  const repository = useMemo(() => {
    if (supplied) return supplied
    if (!client || !('schema' in client)) return undefined
    return createSupabaseShoppingRepository(client)
  }, [client, supplied])
  return (
    <ShoppingRepositoryContext.Provider value={repository}>
      {children}
    </ShoppingRepositoryContext.Provider>
  )
}
