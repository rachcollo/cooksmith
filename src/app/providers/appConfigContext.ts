import { createContext, useContext } from 'react'

import type { PublicEnv } from '../../config/env'

export const AppConfigContext = createContext<PublicEnv | null>(null)

export function useAppConfig() {
  const config = useContext(AppConfigContext)

  if (!config) {
    throw new Error('App configuration is unavailable outside AppProviders.')
  }

  return config
}
