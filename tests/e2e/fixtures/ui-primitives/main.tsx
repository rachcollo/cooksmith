import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Fixture } from './Fixture'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
