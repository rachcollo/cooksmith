import type { ReactNode } from 'react'

import { AppConfigContext } from './appConfigContext'
import type { PublicEnv } from '../../config/env'
import type { InitialAuthState } from '../../application/auth/bootstrapAuth'
import { AuthProvider } from '../auth/AuthProvider'
import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import type { OnboardingRepository } from '../../application/onboarding/onboardingRepository'
import { OnboardingRepositoryContext } from '../onboarding/onboardingContext'
import type { HouseholdPeopleRepository } from '../../application/households/householdPeopleRepository'
import { HouseholdPeopleRepositoryContext } from '../households/householdPeopleContext'
import { HouseholdPeopleProvider } from '../households/HouseholdPeopleProvider'
import type { PantryRepository } from '../../application/pantry/pantryRepository'
import { PantryProvider } from '../pantry/PantryProvider'
import { PantryRepositoryContext } from '../pantry/pantryContext'
import type { PlannedMealRepository } from '../../application/meal-plans/plannedMealRepository'
import { PlannedMealProvider } from '../meal-plans/PlannedMealProvider'
import { PlannedMealRepositoryContext } from '../meal-plans/plannedMealContext'

interface AppProvidersProps {
  children: ReactNode
  config: PublicEnv
  authClient: CooksmithSupabaseClient | null
  initialAuthState: InitialAuthState
  onboardingRepository?: OnboardingRepository
  householdPeopleRepository?: HouseholdPeopleRepository
  pantryRepository?: PantryRepository
  plannedMealRepository?: PlannedMealRepository
}

export function AppProviders({
  children,
  config,
  authClient,
  initialAuthState,
  onboardingRepository,
  householdPeopleRepository,
  pantryRepository,
  plannedMealRepository,
}: AppProvidersProps) {
  return (
    <AppConfigContext.Provider value={config}>
      <AuthProvider client={authClient} initialAuthState={initialAuthState}>
        <HouseholdPeopleRepositoryContext.Provider value={householdPeopleRepository}>
          <HouseholdPeopleProvider>
            <OnboardingRepositoryContext.Provider value={onboardingRepository}>
              <PantryRepositoryContext.Provider value={pantryRepository}>
                <PantryProvider>
                  <PlannedMealRepositoryContext.Provider value={plannedMealRepository}>
                    <PlannedMealProvider>{children}</PlannedMealProvider>
                  </PlannedMealRepositoryContext.Provider>
                </PantryProvider>
              </PantryRepositoryContext.Provider>
            </OnboardingRepositoryContext.Provider>
          </HouseholdPeopleProvider>
        </HouseholdPeopleRepositoryContext.Provider>
      </AuthProvider>
    </AppConfigContext.Provider>
  )
}
