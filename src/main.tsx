import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { BootstrapError } from './app/errors/BootstrapError'
import { loadPublicEnv } from './config/env'
import './styles/global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Cooksmith could not find its root element.')
}

const root = createRoot(rootElement)

try {
  const config = loadPublicEnv(import.meta.env)

  root.render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  )
} catch (error) {
  root.render(
    <StrictMode>
      <BootstrapError error={error} />
    </StrictMode>,
  )
}
