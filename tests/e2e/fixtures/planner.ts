import {
  renderApp,
  defaultPlannedMealRepository,
  defaultRecipeRepository,
  defaultShoppingRepository,
} from '../../renderApp'
import type { PlannedMeal, PlannedMealInput } from '../../../src/domain/meal-plans/types'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
const recipes = {
  ...defaultRecipeRepository,
  list: async (householdId: string) =>
    (await defaultRecipeRepository.list(householdId)).map((r) => ({
      ...r,
      id: '30000000-0000-4000-8000-000000000001',
    })),
}
let rows: PlannedMeal[] = []
async function save(
  householdId: string,
  input: PlannedMealInput,
  id: string = crypto.randomUUID(),
) {
  const recipe = (await recipes.list(householdId)).find((r) => r.id === input.recipeId)
  const linkedRecipe = recipe ? { id: recipe.id, name: recipe.name, archivedAt: null } : null
  const meal: PlannedMeal = {
    ...input,
    id,
    householdId,
    linkedRecipe,
    recipeState: linkedRecipe ? { kind: 'active', recipe: linkedRecipe } : { kind: 'free-text' },
    createdAt: '2026-10-05',
    updatedAt: '2026-10-05',
  }
  rows = [...rows.filter((r) => r.id !== id), meal]
  return meal
}
renderApp(
  '/plan',
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  {
    ...defaultPlannedMealRepository,
    listWeek: async () => rows,
    create: save,
    update: async (id, input) => save('20000000-0000-4000-8000-000000000001', input, id),
    remove: async (id) => {
      rows = rows.filter((r) => r.id !== id)
    },
  },
  undefined,
  recipes,
  { ...defaultShoppingRepository, createFromPlan: async () => undefined },
)
