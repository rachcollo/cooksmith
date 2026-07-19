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

interface AppProvidersProps {
  children: ReactNode
  config: PublicEnv
  authClient: CooksmithSupabaseClient | null
  initialAuthState: InitialAuthState
  onboardingRepository?: OnboardingRepository
  householdPeopleRepository?: HouseholdPeopleRepository
  pantryRepository?: PantryRepository
  recipeRepository?: RecipeRepository
  plannedMealRepository?: PlannedMealRepository
  shoppingRepository?: ShoppingRepository
}

export function AppProviders({
  children,
  config,
  authClient,
  initialAuthState,
  onboardingRepository,
  householdPeopleRepository,
  pantryRepository,
  recipeRepository,
  plannedMealRepository,
  shoppingRepository,
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
                    <PlannedMealProvider>
                      <RecipeRepositoryContext.Provider value={recipeRepository}>
                        <RecipeProvider>
                          <ShoppingRepositoryContext.Provider value={shoppingRepository}>
                            <ShoppingProvider>{children}</ShoppingProvider>
                          </ShoppingRepositoryContext.Provider>
                        </RecipeProvider>
                      </RecipeRepositoryContext.Provider>
                    </PlannedMealProvider>
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
