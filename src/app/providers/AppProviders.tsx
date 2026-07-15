import type { ReactNode } from 'react'

import { AppConfigContext } from './appConfigContext'
import type { PublicEnv } from '../../config/env'
import { AuthProvider } from '../auth/AuthProvider'
import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import type { OnboardingRepository } from '../../application/onboarding/onboardingRepository'
import { OnboardingRepositoryContext } from '../onboarding/onboardingContext'

interface AppProvidersProps {
  children: ReactNode
  config: PublicEnv
  authClient?: CooksmithSupabaseClient | null
  onboardingRepository?: OnboardingRepository
}

export function AppProviders({
  children,
  config,
  authClient,
  onboardingRepository,
}: AppProvidersProps) {
  return (
    <AppConfigContext.Provider value={config}>
      <AuthProvider client={authClient}>
        <OnboardingRepositoryContext.Provider value={onboardingRepository}>
          {children}
        </OnboardingRepositoryContext.Provider>
      </AuthProvider>
    </AppConfigContext.Provider>
  )
}
