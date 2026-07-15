import type { ReactNode } from 'react'

import { AppConfigContext } from './appConfigContext'
import type { PublicEnv } from '../../config/env'
import { AuthProvider } from '../auth/AuthProvider'
import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import type { OnboardingRepository } from '../../application/onboarding/onboardingRepository'
import { OnboardingRepositoryContext } from '../onboarding/onboardingContext'
import type { HouseholdPeopleRepository } from '../../application/households/householdPeopleRepository'
import { HouseholdPeopleRepositoryContext } from '../households/householdPeopleContext'
import { HouseholdPeopleProvider } from '../households/HouseholdPeopleProvider'

interface AppProvidersProps {
  children: ReactNode
  config: PublicEnv
  authClient?: CooksmithSupabaseClient | null
  onboardingRepository?: OnboardingRepository
  householdPeopleRepository?: HouseholdPeopleRepository
}

export function AppProviders({
  children,
  config,
  authClient,
  onboardingRepository,
  householdPeopleRepository,
}: AppProvidersProps) {
  return (
    <AppConfigContext.Provider value={config}>
      <AuthProvider client={authClient}>
        <HouseholdPeopleRepositoryContext.Provider value={householdPeopleRepository}>
          <HouseholdPeopleProvider>
            <OnboardingRepositoryContext.Provider value={onboardingRepository}>
              {children}
            </OnboardingRepositoryContext.Provider>
          </HouseholdPeopleProvider>
        </HouseholdPeopleRepositoryContext.Provider>
      </AuthProvider>
    </AppConfigContext.Provider>
  )
}
