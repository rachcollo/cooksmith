import { defaultRecipeRepository, renderApp } from '../../renderApp'
import { freezerFixture } from '../../fixtures/freezer'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
const fixture = freezerFixture()
const recipes = {
  ...defaultRecipeRepository,
  list: async (householdId: string) =>
    (await defaultRecipeRepository.list(householdId)).map((recipe) => ({
      ...recipe,
      id: '99000000-0000-4000-8000-000000000009',
    })),
}
renderApp(
  '/pantry',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  fixture.planner,
  undefined,
  recipes,
  undefined,
  undefined,
  undefined,
  undefined,
  fixture.repository,
)
