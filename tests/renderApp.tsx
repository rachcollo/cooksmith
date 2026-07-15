import { render } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '../src/app/errors/AppErrorBoundary'
import { AppProviders } from '../src/app/providers/AppProviders'
import { createRouteErrorTestRouter, createTestRouter } from '../src/app/router/createAppRouter'
import type { PublicEnv } from '../src/config/env'
import type { CooksmithSupabaseClient } from '../src/infrastructure/auth/supabaseAuthClient'
import type { Session, User } from '@supabase/supabase-js'
import type { OnboardingRepository } from '../src/application/onboarding/onboardingRepository'
import type { HouseholdPeopleRepository } from '../src/application/households/householdPeopleRepository'

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

export function renderApp(
  path = '/',
  config: PublicEnv = defaultConfig,
  authClient: CooksmithSupabaseClient | null = authenticatedTestClient,
  onboardingRepository: OnboardingRepository = completedOnboardingRepository,
  householdPeopleRepository: HouseholdPeopleRepository = ownerHouseholdPeopleRepository,
) {
  const router = createTestRouter([path])

  return {
    router,
    ...render(
      <AppErrorBoundary>
        <AppProviders
          config={config}
          authClient={authClient}
          onboardingRepository={onboardingRepository}
          householdPeopleRepository={householdPeopleRepository}
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
        onboardingRepository={completedOnboardingRepository}
        householdPeopleRepository={ownerHouseholdPeopleRepository}
      >
        <RouterProvider router={createRouteErrorTestRouter()} />
      </AppProviders>
    </AppErrorBoundary>,
  )
}
