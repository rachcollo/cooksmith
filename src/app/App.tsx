import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from './errors/AppErrorBoundary'
import { AppProviders } from './providers/AppProviders'
import { createAppRouter } from './router/createAppRouter'
import { LoadingState } from '../components/ui/LoadingState'
import type { PublicEnv } from '../config/env'

interface AppProps {
  config: PublicEnv
}

export function App({ config }: AppProps) {
  const router = createAppRouter()

  return (
    <AppErrorBoundary>
      <AppProviders config={config}>
        <Suspense fallback={<LoadingState label="Getting Cooksmith ready" fullPage />}>
          <RouterProvider router={router} />
        </Suspense>
      </AppProviders>
    </AppErrorBoundary>
  )
}
