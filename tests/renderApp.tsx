import { render } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '../src/app/errors/AppErrorBoundary'
import { AppProviders } from '../src/app/providers/AppProviders'
import { createRouteErrorTestRouter, createTestRouter } from '../src/app/router/createAppRouter'
import type { InitialAuthState } from '../src/application/auth/bootstrapAuth'
import type { HouseholdPeopleRepository } from '../src/application/households/householdPeopleRepository'
import type { OnboardingRepository } from '../src/application/onboarding/onboardingRepository'
import type { PantryRepository } from '../src/application/pantry/pantryRepository'
import type { RecipeRepository } from '../src/application/recipes/recipeRepository'
import type { PublicEnv } from '../src/config/env'
import type { CooksmithSupabaseClient } from '../src/infrastructure/auth/supabaseAuthClient'
import type { Session, User } from '@supabase/supabase-js'

const defaultConfig: PublicEnv = { appEnvironment: 'test', buildCommit: 'test-build' }
const user = {
  id: 'test-user',
  email: 'cook@test.invalid',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
} as User
const session = {
  access_token: 'test',
  refresh_token: 'test',
  expires_in: 3600,
  token_type: 'bearer',
  user,
} as Session
export const authenticatedTestAuthState: InitialAuthState = { session, user }
export const signedOutTestAuthState: InitialAuthState = { session: null, user: null }

export const authenticatedTestClient = {
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
} as unknown as CooksmithSupabaseClient

export const completedOnboardingRepository: OnboardingRepository = {
  load: async () => ({
    step: 5,
    complete: true,
    householdId: '20000000-0000-4000-8000-000000000001',
  }),
  saveProfile: async () => undefined,
  bootstrapHousehold: async () => '20000000-0000-4000-8000-000000000001',
  saveHouseholdPreferences: async () => undefined,
  completeDietaryPreferences: async () => undefined,
}

export const ownerHouseholdPeopleRepository: HouseholdPeopleRepository = {
  load: async (householdId) => ({
    householdId,
    currentUserRole: 'owner',
    members: [
      {
        id: 'membership-owner',
        userId: 'test-user',
        displayName: 'Cook Test',
        role: 'owner',
        joinedAt: '2026-01-01T00:00:00Z',
      },
    ],
    invitations: [],
  }),
  invite: async () => undefined,
  resend: async () => undefined,
  cancel: async () => undefined,
  removeMember: async () => undefined,
  accept: async () => '20000000-0000-4000-8000-000000000001',
}

export const defaultRecipeRepository: RecipeRepository = {
  list: async (householdId) => [
    {
      id: 'recipe-1',
      householdId,
      name: 'Lentil soup',
      description: 'A gentle weeknight dinner.',
      sourceNote: null,
      sourceUrl: null,
      servings: 4,
      prepTimeMinutes: 10,
      cookTimeMinutes: 30,
      imageUrl: null,
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  create: async (householdId, input) => ({
    id: 'recipe-created',
    householdId,
    ...input,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }),
  update: async (recipeId, input) => ({
    id: recipeId,
    householdId: '20000000-0000-4000-8000-000000000001',
    ...input,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  }),
  archive: async (recipeId) => ({
    id: recipeId,
    householdId: '20000000-0000-4000-8000-000000000001',
    name: 'Lentil soup',
    description: null,
    sourceNote: null,
    sourceUrl: null,
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    imageUrl: null,
    archivedAt: '2026-01-02T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  }),
}

export const defaultPantryRepository: PantryRepository = {
  list: async (householdId) => [
    {
      id: 'pantry-item-1',
      householdId,
      name: 'Plain flour',
      category: 'baking',
      storageLocation: 'pantry',
      quantity: 1,
      unit: 'kg',
      available: true,
      isDefault: true,
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  create: async (householdId, input) => ({
    id: 'pantry-item-created',
    householdId,
    ...input,
    isDefault: false,
    updatedAt: '2026-01-01T00:00:00Z',
  }),
  update: async (itemId, input) => ({
    id: itemId,
    householdId: '20000000-0000-4000-8000-000000000001',
    ...input,
    isDefault: false,
    updatedAt: '2026-01-01T00:00:00Z',
  }),
  remove: async () => undefined,
}

export function renderApp(
  path = '/',
  config: PublicEnv = defaultConfig,
  authClient: CooksmithSupabaseClient | null = authenticatedTestClient,
  onboardingRepository: OnboardingRepository = completedOnboardingRepository,
  householdPeopleRepository: HouseholdPeopleRepository = ownerHouseholdPeopleRepository,
  pantryRepository: PantryRepository = defaultPantryRepository,
  initialAuthState: InitialAuthState = authClient
    ? authenticatedTestAuthState
    : signedOutTestAuthState,
  recipeRepository: RecipeRepository = defaultRecipeRepository,
) {
  const router = createTestRouter([path])

  return {
    router,
    ...render(
      <AppErrorBoundary>
        <AppProviders
          config={config}
          authClient={authClient}
          initialAuthState={initialAuthState}
          onboardingRepository={onboardingRepository}
          householdPeopleRepository={householdPeopleRepository}
          pantryRepository={pantryRepository}
          recipeRepository={recipeRepository}
        >
          <RouterProvider router={router} />
        </AppProviders>
      </AppErrorBoundary>,
    ),
  }
}

export function renderRouteError(config: PublicEnv = defaultConfig) {
  return render(
    <AppErrorBoundary>
      <AppProviders
        config={config}
        authClient={authenticatedTestClient}
        initialAuthState={authenticatedTestAuthState}
        onboardingRepository={completedOnboardingRepository}
        householdPeopleRepository={ownerHouseholdPeopleRepository}
        pantryRepository={defaultPantryRepository}
        recipeRepository={defaultRecipeRepository}
      >
        <RouterProvider router={createRouteErrorTestRouter()} />
      </AppProviders>
    </AppErrorBoundary>,
  )
}
