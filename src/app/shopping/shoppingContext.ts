import { createContext, useContext } from 'react'

import type { ShoppingRepository } from '../../application/shopping/shoppingRepository'

export const ShoppingRepositoryContext = createContext<ShoppingRepository | undefined>(undefined)

export function useShoppingRepository() {
  const value = useContext(ShoppingRepositoryContext)
  if (!value) throw new Error('Shopping is not configured.')
  return value
}
