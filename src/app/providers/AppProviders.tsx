import type { ReactNode } from 'react'

import { AppConfigContext } from './appConfigContext'
import type { PublicEnv } from '../../config/env'
import { AuthProvider } from '../auth/AuthProvider'
import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'

interface AppProvidersProps {
  children: ReactNode
  config: PublicEnv
  authClient?: CooksmithSupabaseClient | null
}

export function AppProviders({ children, config, authClient }: AppProvidersProps) {
  return (
    <AppConfigContext.Provider value={config}>
      <AuthProvider client={authClient}>{children}</AuthProvider>
    </AppConfigContext.Provider>
  )
}
