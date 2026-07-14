import { render } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '../src/app/errors/AppErrorBoundary'
import { AppProviders } from '../src/app/providers/AppProviders'
import { createRouteErrorTestRouter, createTestRouter } from '../src/app/router/createAppRouter'
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
export const authenticatedTestClient = {
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
} as unknown as CooksmithSupabaseClient

export function renderApp(
  path = '/',
  config: PublicEnv = defaultConfig,
  authClient: CooksmithSupabaseClient | null = authenticatedTestClient,
) {
  const router = createTestRouter([path])

  return {
    router,
    ...render(
      <AppErrorBoundary>
        <AppProviders config={config} authClient={authClient}>
          <RouterProvider router={router} />
        </AppProviders>
      </AppErrorBoundary>,
    ),
  }
}

export function renderRouteError(config: PublicEnv = defaultConfig) {
  return render(
    <AppErrorBoundary>
      <AppProviders config={config} authClient={authenticatedTestClient}>
        <RouterProvider router={createRouteErrorTestRouter()} />
      </AppProviders>
    </AppErrorBoundary>,
  )
}
