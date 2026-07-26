import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { AuthBootstrapError, bootstrapAuth } from './application/auth/bootstrapAuth'
import { AuthCallbackError } from './app/errors/AuthCallbackError'
import { BootstrapError } from './app/errors/BootstrapError'
import { LoadingState } from './components/ui/LoadingState'
import { loadPublicEnv } from './config/env'
import { createSupabaseAuthClient } from './infrastructure/auth/supabaseAuthClient'
import { initObservability } from './infrastructure/observability/observability'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/space-mono/latin-700.css'
import './styles/global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Cooksmith could not find its root element.')
}

const root = createRoot(rootElement)

root.render(
  <StrictMode>
    <LoadingState label="Getting Cooksmith ready" fullPage />
  </StrictMode>,
)

async function startCooksmith() {
  const config = loadPublicEnv(import.meta.env)
  initObservability(config)
  const authClient = createSupabaseAuthClient(config)
  const initialAuthState = await bootstrapAuth(authClient)

  root.render(
    <StrictMode>
      <App authClient={authClient} config={config} initialAuthState={initialAuthState} />
    </StrictMode>,
  )
}

startCooksmith().catch((error: unknown) => {
  root.render(
    <StrictMode>
      {error instanceof AuthBootstrapError ? (
        <AuthCallbackError category={error.category} />
      ) : (
        <BootstrapError error={error} />
      )}
    </StrictMode>,
  )
})
