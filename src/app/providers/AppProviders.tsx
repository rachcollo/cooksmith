import type { ReactNode } from 'react'

import { AppConfigContext } from './appConfigContext'
import type { PublicEnv } from '../../config/env'

interface AppProvidersProps {
  children: ReactNode
  config: PublicEnv
}

export function AppProviders({ children, config }: AppProvidersProps) {
  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>
}
