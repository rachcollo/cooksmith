import { createContext, useContext } from 'react'
import type { FreezerRepository } from '../../application/freezer/freezerRepository'
export const FreezerRepositoryContext = createContext<FreezerRepository | undefined>(undefined)
export function useFreezerRepository() {
  return useContext(FreezerRepositoryContext)
}
