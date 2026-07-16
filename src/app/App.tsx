import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from './errors/AppErrorBoundary'
import { AppProviders } from './providers/AppProviders'
import { createAppRouter } from './router/createAppRouter'
import { LoadingState } from '../components/ui/LoadingState'
import type { InitialAuthState } from '../application/auth/bootstrapAuth'
import type { PublicEnv } from '../config/env'
import type { CooksmithSupabaseClient } from '../infrastructure/auth/supabaseAuthClient'

interface AppProps {
  authClient: CooksmithSupabaseClient | null
  config: PublicEnv
  initialAuthState: InitialAuthState
}

export function App({ authClient, config, initialAuthState }: AppProps) {
  const router = createAppRouter()

  return (
    <AppErrorBoundary>
      <AppProviders authClient={authClient} config={config} initialAuthState={initialAuthState}>
        <Suspense fallback={<LoadingState label="Getting Cooksmith ready" fullPage />}>
          <RouterProvider router={router} />
        </Suspense>
      </AppProviders>
    </AppErrorBoundary>
  )
}
