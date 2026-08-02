import type {
  WeeklyPreparationCandidate,
  WeeklyPreparationPlan,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'
import type { RecipeIntelligence } from '../../../src/domain/recipes/intelligence.ts'
import { fetchWeeklyPreparationHouseholdData } from '../../../src/infrastructure/get-ahead/weeklyPreparationHouseholdData.ts'
import { verifyActiveHouseholdMember } from '../../../src/infrastructure/get-ahead/weeklyPreparationMembership.ts'

declare const Deno: {
  env: { get(key: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })

const serviceHeaders = () => ({
  apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
  'accept-profile': 'cooksmith',
  'content-profile': 'cooksmith',
  'content-type': 'application/json',
})

async function rest<T>(path: string): Promise<T> {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/${path}`, {
    headers: serviceHeaders(),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error('persistence_unavailable')
  return (await response.json()) as T
}

async function authenticatedUserId(request: Request) {
  const authorisation = request.headers.get('authorization')
  if (!authorisation) return null
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authorization: authorisation,
    },
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) return null
  const user = (await response.json()) as { id?: unknown }
  return typeof user.id === 'string' ? user.id : null
}

type MealRow = {
  id: string
  recipe_id: string | null
  imported_recipe_id: string | null
  meal_date: string
}

type MealPlanningContext = {
  plannedMealId: string
  mealDate: string
  recipeName: string
  ingredients: string[]
  instructions: string[]
}

type HouseholdRecipeRow = {
  id: string
  name: string
  recipe_ingredients: Array<{ original_line_text: string }>
  recipe_steps: Array<{ instruction: string }>
}

type ImportedRecipeRow = {
  id: string
  name: string
  ingredient_rows: Array<{ originalLineText?: string; original_line_text?: string }> | null
  instruction_steps: Array<{ instruction?: string }> | null
}

type EnrichmentRow = {
  source_kind: 'household' | 'shared_platform'
  recipe_id: string | null
  imported_recipe_id: string | null
  recipe_version_id: string
  schema_version: string
  rules_version: string
  result: RecipeIntelligence
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function candidatesFrom(
  householdId: string,
  planId: string,
  servings: number,
  meals: MealRow[],
  enrichments: EnrichmentRow[],
): WeeklyPreparationCandidate[] {
  const enrichmentByRecipe = new Map(
    enrichments.map((item) => [
      `${item.source_kind}:${item.recipe_id ?? item.imported_recipe_id}`,
      item,
    ]),
  )
  return meals.flatMap((meal) => {
    const sourceKind = meal.recipe_id ? 'household' : 'shared_platform'
    const recipeId = meal.recipe_id ?? meal.imported_recipe_id
    if (!recipeId) return []
    const enrichment = enrichmentByRecipe.get(`${sourceKind}:${recipeId}`)
    if (!enrichment) return []
    return enrichment.result.ingredients.flatMap((ingredient) => {
      if (!isSupportedPreparationAction(ingredient.action)) return []
      return [
        {
          id: `${meal.id}:${enrichment.recipe_version_id}:${ingredient.sourceIngredientId}`,
          householdId,
          planId,
          plannedMealId: meal.id,
          recipeId,
          recipeVersionId: enrichment.recipe_version_id,
          enrichmentVersion: `${enrichment.schema_version}:${enrichment.rules_version}`,
          servings,
          sourceIngredientId: ingredient.sourceIngredientId,
          sourceStepIds: ingredient.sourceStepIds,
          originalText: ingredient.originalText,
          canonicalIngredient: ingredient.canonicalName,
          canonicalAction: ingredient.action,
          preparationDetail: ingredient.preparationDetail,
          quantity: {
            state: ingredient.quantity.state,
            value: ingredient.quantity.normalisedValue,
            unit: ingredient.quantity.unit,
          },
          maximumLeadTimeHours: 24,
          storageGuidanceReference: 'refrigerate-covered-and-labelled',
          boundaries: [],
          confidence: ingredient.confidence,
        } satisfies WeeklyPreparationCandidate,
      ]
    })
  })
}

const supportedPreparationActions = new Set([
  'bake',
  'blend',
  'boil',
  'chop',
  'cook',
  'dice',
  'grate',
  'marinate',
  'mince',
  'mix',
  'roast',
  'shred',
  'slice',
  'steam',
  'toast',
  'whisk',
])

function isSupportedPreparationAction(action: string | null) {
  return action ? supportedPreparationActions.has(action.trim().toLowerCase()) : false
}

function planningContext(
  meals: MealRow[],
  householdRecipes: HouseholdRecipeRow[],
  importedRecipes: ImportedRecipeRow[],
): MealPlanningContext[] {
  const householdById = new Map(householdRecipes.map((recipe) => [recipe.id, recipe]))
  const importedById = new Map(importedRecipes.map((recipe) => [recipe.id, recipe]))
  return meals.flatMap((meal) => {
    const household = meal.recipe_id ? householdById.get(meal.recipe_id) : undefined
    if (household)
      return [
        {
          plannedMealId: meal.id,
          mealDate: meal.meal_date,
          recipeName: household.name,
          ingredients: household.recipe_ingredients
            .map((item) => item.original_line_text)
            .slice(0, 50),
          instructions: household.recipe_steps.map((item) => item.instruction).slice(0, 30),
        },
      ]
    const imported = meal.imported_recipe_id ? importedById.get(meal.imported_recipe_id) : undefined
    if (!imported) return []
    return [
      {
        plannedMealId: meal.id,
        mealDate: meal.meal_date,
        recipeName: imported.name,
        ingredients: (imported.ingredient_rows ?? [])
          .flatMap((item) => {
            const text = item.originalLineText ?? item.original_line_text
            return typeof text === 'string' ? [text] : []
          })
          .slice(0, 50),
        instructions: (imported.instruction_steps ?? [])
          .flatMap((item) => (typeof item.instruction === 'string' ? [item.instruction] : []))
          .slice(0, 30),
      },
    ]
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const authorisation = request.headers.get('authorization')
  if (!authorisation) return json(401, { error: 'unauthenticated' })
  try {
    if (!(await authenticatedUserId(request))) return json(401, { error: 'unauthenticated' })
  } catch {
    return json(503, { error: 'authentication_unavailable' })
  }

  const body = (await request.json().catch(() => null)) as {
    householdId?: unknown
    weekStart?: unknown
    weekEnd?: unknown
    availableMinutes?: unknown
    forceRetry?: unknown
  } | null
  if (
    typeof body?.householdId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(body.householdId) ||
    !validDate(body?.weekStart) ||
    !validDate(body?.weekEnd) ||
    body.weekStart > body.weekEnd ||
    !Number.isInteger(body.availableMinutes) ||
    Number(body.availableMinutes) < 5 ||
    Number(body.availableMinutes) > 240
  )
    return json(400, { error: 'invalid_week' })

  let householdId: string
  try {
    if (
      !(await verifyActiveHouseholdMember({
        supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
        anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        authorisation,
        householdId: body.householdId,
      }))
    )
      return json(403, { error: 'household_unavailable' })
    householdId = body.householdId
  } catch {
    return json(503, { error: 'membership_verification_unavailable' })
  }

  try {
    const planId = `${body.weekStart}_${body.weekEnd}`
    const householdData = <T>(path: string) =>
      fetchWeeklyPreparationHouseholdData<T>({
        supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
        anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        authorisation,
        path,
      })
    const meals = await householdData<MealRow[]>(
      `planned_meals?household_id=eq.${householdId}&meal_date=gte.${body.weekStart}&meal_date=lte.${body.weekEnd}&or=(recipe_id.not.is.null,imported_recipe_id.not.is.null)&select=id,recipe_id,imported_recipe_id,meal_date&order=meal_date.asc&limit=100`,
    )
    const recipeIds = [
      ...new Set(meals.flatMap((meal) => (meal.recipe_id ? [meal.recipe_id] : []))),
    ]
    const importedRecipeIds = [
      ...new Set(
        meals.flatMap((meal) => (meal.imported_recipe_id ? [meal.imported_recipe_id] : [])),
      ),
    ]
    if (recipeIds.length === 0 && importedRecipeIds.length === 0)
      return json(200, { plan: emptyPlan(householdId, planId) })
    const settings = await householdData<Array<{ default_servings: number }>>(
      `household_settings?household_id=eq.${householdId}&select=default_servings&limit=1`,
    )
    const householdRecipes = recipeIds.length
      ? await householdData<HouseholdRecipeRow[]>(
          `household_recipes?id=in.(${recipeIds.join(',')})&select=id,name,recipe_ingredients(original_line_text),recipe_steps(instruction)&limit=100`,
        )
      : []
    const importedRecipes = importedRecipeIds.length
      ? await householdData<ImportedRecipeRow[]>(
          `imported_recipes?id=in.(${importedRecipeIds.join(',')})&select=id,name,ingredient_rows,instruction_steps&limit=100`,
        )
      : []
    const filters = [
      recipeIds.length
        ? `and(source_kind.eq.household,household_id.eq.${householdId},recipe_id.in.(${recipeIds.join(',')}))`
        : null,
      importedRecipeIds.length
        ? `and(source_kind.eq.shared_platform,imported_recipe_id.in.(${importedRecipeIds.join(',')}))`
        : null,
    ].filter(Boolean)
    const enrichments = await rest<EnrichmentRow[]>(
      `recipe_enrichments?is_active=eq.true&or=(${filters.join(',')})&select=source_kind,recipe_id,imported_recipe_id,recipe_version_id,schema_version,rules_version,result&limit=100`,
    )
    const candidates = candidatesFrom(
      householdId,
      planId,
      settings[0]?.default_servings ?? 4,
      meals,
      enrichments,
    )
    if (candidates.length === 0) return json(422, { error: 'enrichment_unavailable' })
    const workerToken = Deno.env.get('WEEKLY_PREPARATION_WORKER_TOKEN')
    if (!workerToken) return json(503, { error: 'worker_configuration_unavailable' })
    const worker = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-weekly-preparation-plan`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cooksmith-worker-token': workerToken,
        },
        body: JSON.stringify({
          candidates,
          meals: planningContext(meals, householdRecipes, importedRecipes),
          availableMinutes: body.availableMinutes,
          forceRetry: body.forceRetry === true,
          requestId: `${householdId}:${planId}`,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!worker.ok) return json(503, { error: 'worker_unavailable' })
    const result = (await worker.json()) as { plan?: WeeklyPreparationPlan }
    if (!result.plan || result.plan.householdId !== householdId || result.plan.planId !== planId)
      return json(503, { error: 'worker_response_invalid' })
    return json(200, { plan: result.plan })
  } catch {
    return json(503, { error: 'plan_data_unavailable' })
  }
})

function emptyPlan(householdId: string, planId: string): WeeklyPreparationPlan {
  return {
    schemaVersion: 'weekly-preparation-plan-v2',
    plannerVersion: 'weekly-preparation-planner-v6',
    householdId,
    planId,
    cacheKey: `empty:${planId}`,
    tasks: [],
    ambiguousCandidateIds: [],
    generation: 'deterministic',
    fallbackReason: null,
  }
}
