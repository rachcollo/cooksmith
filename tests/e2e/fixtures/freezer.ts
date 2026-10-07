import { renderApp } from '../../renderApp'
import { freezerFixture } from '../../fixtures/freezer'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
const fixture = freezerFixture()
renderApp(
  '/pantry',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  fixture.planner,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  fixture.repository,
)
