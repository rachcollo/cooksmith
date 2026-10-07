import { renderApp } from '../../renderApp'
import { putAwayFixture } from '../../fixtures/putAway'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
const fixture = putAwayFixture()
renderApp(
  '/shopping',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  fixture.repository,
)
