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
import type { HouseholdPreferencesRepository } from '../../application/households/householdPreferencesRepository'
import { HouseholdPreferencesRepositoryContext } from '../households/householdPreferencesContext'
import { HouseholdPreferencesProvider } from '../households/HouseholdPreferencesProvider'
import type { PantryRepository } from '../../application/pantry/pantryRepository'
import type { RecipeRepository } from '../../application/recipes/recipeRepository'
import { PantryProvider } from '../pantry/PantryProvider'
import { PantryRepositoryContext } from '../pantry/pantryContext'
import { RecipeProvider } from '../recipes/RecipeProvider'
import { RecipeRepositoryContext } from '../recipes/recipeContext'
import type { PlannedMealRepository } from '../../application/meal-plans/plannedMealRepository'
import { PlannedMealProvider } from '../meal-plans/PlannedMealProvider'
import { PlannedMealRepositoryContext } from '../meal-plans/plannedMealContext'
import type { ShoppingRepository } from '../../application/shopping/shoppingRepository'
import { ShoppingProvider } from '../shopping/ShoppingProvider'
import { ShoppingRepositoryContext } from '../shopping/shoppingContext'
import type { FeatureFlagRepository } from '../../application/admin/featureFlagRepository'
import { createSupabaseFeatureFlagRepository } from '../../infrastructure/admin/supabaseFeatureFlagRepository'
import { FeatureFlagProvider } from '../admin/FeatureFlagProvider'
import { FeatureFlagRepositoryContext } from '../admin/featureFlagContext'
import type { WeeklyPreparationRepository } from '../../application/get-ahead/weeklyPreparationRepository'
import { createSupabaseWeeklyPreparationRepository } from '../../infrastructure/get-ahead/supabaseWeeklyPreparationRepository'
import { WeeklyPreparationRepositoryContext } from '../get-ahead/weeklyPreparationContext'
import type { WeeklyPreparationAdminRepository } from '../../application/admin/weeklyPreparationAdminRepository'
import { createSupabaseWeeklyPreparationAdminRepository } from '../../infrastructure/admin/supabaseWeeklyPreparationAdminRepository'
import { WeeklyPreparationAdminRepositoryContext } from '../admin/weeklyPreparationAdminContext'

interface AppProvidersProps {
  children: ReactNode
  config: PublicEnv
  authClient: CooksmithSupabaseClient | null
  initialAuthState: InitialAuthState
  onboardingRepository?: OnboardingRepository
  householdPeopleRepository?: HouseholdPeopleRepository
  householdPreferencesRepository?: HouseholdPreferencesRepository
  pantryRepository?: PantryRepository
  recipeRepository?: RecipeRepository
  plannedMealRepository?: PlannedMealRepository
  shoppingRepository?: ShoppingRepository
  featureFlagRepository?: FeatureFlagRepository
  weeklyPreparationRepository?: WeeklyPreparationRepository
  weeklyPreparationAdminRepository?: WeeklyPreparationAdminRepository
}

export function AppProviders({
  children,
  config,
  authClient,
  initialAuthState,
  onboardingRepository,
  householdPeopleRepository,
  householdPreferencesRepository,
  pantryRepository,
  recipeRepository,
  plannedMealRepository,
  shoppingRepository,
  featureFlagRepository,
  weeklyPreparationRepository,
  weeklyPreparationAdminRepository,
}: AppProvidersProps) {
  const resolvedFeatureFlagRepository =
    featureFlagRepository ??
    (authClient && typeof authClient.schema === 'function'
      ? createSupabaseFeatureFlagRepository(authClient)
      : null)
  const resolvedWeeklyPreparationRepository =
    weeklyPreparationRepository ??
    (authClient ? createSupabaseWeeklyPreparationRepository(authClient) : null)
  const resolvedWeeklyPreparationAdminRepository =
    weeklyPreparationAdminRepository ??
    (authClient && typeof authClient.schema === 'function'
      ? createSupabaseWeeklyPreparationAdminRepository(authClient)
      : null)
  return (
    <AppConfigContext.Provider value={config}>
      <AuthProvider client={authClient} initialAuthState={initialAuthState}>
        <HouseholdPeopleRepositoryContext.Provider value={householdPeopleRepository}>
          <HouseholdPeopleProvider>
            <HouseholdPreferencesRepositoryContext.Provider
              value={householdPreferencesRepository ?? null}
            >
              <HouseholdPreferencesProvider>
                <OnboardingRepositoryContext.Provider value={onboardingRepository}>
                  <PantryRepositoryContext.Provider value={pantryRepository}>
                    <PantryProvider>
                      <PlannedMealRepositoryContext.Provider value={plannedMealRepository}>
                        <PlannedMealProvider>
                          <RecipeRepositoryContext.Provider value={recipeRepository}>
                            <RecipeProvider>
                              <FeatureFlagRepositoryContext.Provider
                                value={resolvedFeatureFlagRepository}
                              >
                                <FeatureFlagProvider>
                                  <WeeklyPreparationAdminRepositoryContext.Provider
                                    value={resolvedWeeklyPreparationAdminRepository}
                                  >
                                    <WeeklyPreparationRepositoryContext.Provider
                                      value={resolvedWeeklyPreparationRepository}
                                    >
                                      <ShoppingRepositoryContext.Provider
                                        value={shoppingRepository}
                                      >
                                        <ShoppingProvider>{children}</ShoppingProvider>
                                      </ShoppingRepositoryContext.Provider>
                                    </WeeklyPreparationRepositoryContext.Provider>
                                  </WeeklyPreparationAdminRepositoryContext.Provider>
                                </FeatureFlagProvider>
                              </FeatureFlagRepositoryContext.Provider>
                            </RecipeProvider>
                          </RecipeRepositoryContext.Provider>
                        </PlannedMealProvider>
                      </PlannedMealRepositoryContext.Provider>
                    </PantryProvider>
                  </PantryRepositoryContext.Provider>
                </OnboardingRepositoryContext.Provider>
              </HouseholdPreferencesProvider>
            </HouseholdPreferencesRepositoryContext.Provider>
          </HouseholdPeopleProvider>
        </HouseholdPeopleRepositoryContext.Provider>
      </AuthProvider>
    </AppConfigContext.Provider>
  )
}
