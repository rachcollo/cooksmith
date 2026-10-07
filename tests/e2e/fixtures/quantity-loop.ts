import { createClient } from '@supabase/supabase-js'
import { renderApp, completedOnboardingRepository } from '../../renderApp'
import type { Database } from '../../../src/infrastructure/database/generated/database.types'
import { createSupabasePantryRepository } from '../../../src/infrastructure/pantry/supabasePantryRepository'
import { createSupabasePlannedMealRepository } from '../../../src/infrastructure/meal-plans/supabasePlannedMealRepository'
import { createSupabaseShoppingRepository } from '../../../src/infrastructure/shopping/supabaseShoppingRepository'
import { createSupabaseRecipeRepository } from '../../../src/infrastructure/recipes/supabaseRecipeRepository'
import { createSupabaseFreezerRepository } from '../../../src/infrastructure/freezer/supabaseFreezerRepository'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '../../../src/styles/global.css'
const config = (
  window as unknown as { localStock: { url: string; token: string; householdId: string } }
).localStock
if (!config || !['127.0.0.1', 'localhost'].includes(new URL(config.url).hostname))
  throw new Error('Synthetic local database required')
const client = createClient<Database>(config.url, config.token, {
  accessToken: async () => config.token,
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(String(input).replace('/rest/v1', ''), init) },
})
renderApp(
  '/shopping',
  undefined,
  undefined,
  {
    ...completedOnboardingRepository,
    load: async () => ({ step: 5, complete: true, householdId: config.householdId }),
  },
  undefined,
  createSupabasePantryRepository(client),
  createSupabasePlannedMealRepository(client),
  undefined,
  createSupabaseRecipeRepository(client),
  createSupabaseShoppingRepository(client),
  undefined,
  undefined,
  undefined,
  createSupabaseFreezerRepository(client),
)
