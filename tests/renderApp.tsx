import { render } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '../src/app/errors/AppErrorBoundary'
import { AppProviders } from '../src/app/providers/AppProviders'
import { createTestRouter } from '../src/app/router/createAppRouter'
import type { PublicEnv } from '../src/config/env'

const defaultConfig: PublicEnv = { appEnvironment: 'test', buildCommit: 'test-build' }

export function renderApp(path = '/', config: PublicEnv = defaultConfig) {
  const router = createTestRouter([path])

  return {
    router,
    ...render(
      <AppErrorBoundary>
        <AppProviders config={config}>
          <RouterProvider router={router} />
        </AppProviders>
      </AppErrorBoundary>,
    ),
  }
}
