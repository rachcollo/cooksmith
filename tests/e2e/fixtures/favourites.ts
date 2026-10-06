import { renderApp, defaultRecipeRepository } from '../../renderApp'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
let rows = (await defaultRecipeRepository.list('household')).map((r) => ({
  ...r,
  favourite: false,
}))
let failNext = new URLSearchParams(location.search).has('fail')
const repository = {
  ...defaultRecipeRepository,
  list: async () => rows,
  setFavourite: async (_h: string, id: string, _s: 'household' | 'imported', desired: boolean) => {
    if (failNext) {
      failNext = false
      throw new Error('Synthetic offline request')
    }
    rows = rows.map((r) => (r.id === id ? { ...r, favourite: desired } : r))
    return desired
  },
}
renderApp(
  '/recipes',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  repository,
)
