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

const ACTIVE_RECIPE_SCHEMA = 'recipe-intelligence-v3'
const ACTIVE_RECIPE_RULES = 'cooksmith-rules-v3'

async function continueRecipeEnrichment() {
  const workerToken = Deno.env.get('RECIPE_INTELLIGENCE_WORKER_TOKEN')
  if (!workerToken) return
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enrich-recipe`, {
    method: 'POST',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      'content-type': 'application/json',
      'x-cooksmith-worker-token': workerToken,
    },
    body: JSON.stringify({ dispatchMode: 'chain' }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined)
}

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

type RecipeVersionRow = {
  id: string
  source_snapshot: {
    ingredients?: Array<{ id?: string; originalText?: string; original_line_text?: string }>
    steps?: Array<{ id?: string; instruction?: string }>
  }
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
  versions: RecipeVersionRow[],
): WeeklyPreparationCandidate[] {
  const enrichmentByRecipe = new Map(
    enrichments.map((item) => [
      `${item.source_kind}:${item.recipe_id ?? item.imported_recipe_id}`,
      item,
    ]),
  )
  const versionById = new Map(versions.map((version) => [version.id, version]))
  const today = new Date().toISOString().slice(0, 10)
  return meals.flatMap((meal) => {
    const sourceKind = meal.recipe_id ? 'household' : 'shared_platform'
    const recipeId = meal.recipe_id ?? meal.imported_recipe_id
    if (!recipeId) return []
    const enrichment = enrichmentByRecipe.get(`${sourceKind}:${recipeId}`)
    if (!enrichment) return []
    const snapshot = versionById.get(enrichment.recipe_version_id)?.source_snapshot
    return enrichment.result.preparationOpportunities.flatMap((opportunity) => {
      if (!isSupportedPreparationAction(opportunity.action)) return []
      const daysUntilMeal = Math.round(
        (Date.parse(`${meal.meal_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
      )
      if (daysUntilMeal < 0 || opportunity.maximumLeadTimeHours < Math.max(1, daysUntilMeal * 24))
        return []
      const ingredient = enrichment.result.ingredients.find((item) =>
        opportunity.sourceIngredientIds.includes(item.sourceIngredientId),
      )
      return [
        {
          id: `${meal.id}:${enrichment.recipe_version_id}:${opportunity.opportunityId}`,
          householdId,
          planId,
          plannedMealId: meal.id,
          recipeId,
          recipeVersionId: enrichment.recipe_version_id,
          enrichmentVersion: `${enrichment.schema_version}:${enrichment.rules_version}`,
          servings,
          sourceIngredientId: opportunity.sourceIngredientIds.join('+'),
          sourceStepIds: opportunity.sourceStepIds,
          originalText: sourceInstructions(opportunity, snapshot) || opportunity.title,
          canonicalIngredient: opportunity.canonicalIngredient,
          canonicalAction: opportunity.action,
          preparationDetail: opportunity.preparationDetail,
          opportunityKind: opportunity.kind,
          ingredientLines: opportunity.ingredientLines ?? [],
          instructionSteps: opportunity.instructionSteps ?? [],
          stoppingPoint: opportunity.stoppingPoint ?? '',
          finishingGuidance: opportunity.finishingGuidance ?? '',
          providerStorageGuidance: opportunity.storageGuidance ?? '',
          quantity: {
            state: ingredient?.quantity.state ?? 'unknown',
            value: ingredient?.quantity.normalisedValue ?? null,
            unit: ingredient?.quantity.unit ?? null,
          },
          maximumLeadTimeHours: opportunity.maximumLeadTimeHours,
          storageGuidanceReference: storageGuidanceReferenceFor(opportunity),
          boundaries: opportunity.boundaries,
          confidence: opportunity.confidence,
        } satisfies WeeklyPreparationCandidate,
      ]
    })
  })
}

function storageGuidanceReferenceFor(
  opportunity: RecipeIntelligence['preparationOpportunities'][number],
) {
  if (opportunity.kind === 'component_cook' || opportunity.kind === 'meal_cook')
    return 'provider-validated-cooked-storage'
  const ingredient = opportunity.canonicalIngredient.trim().toLocaleLowerCase('en-AU')
  if (
    ingredient.includes('potato') &&
    ['slice', 'dice', 'chop', 'roughly_chop'].includes(opportunity.action)
  )
    return 'refrigerate-potatoes-covered-in-water'
  if (
    opportunity.boundaries.includes('raw-protein') ||
    opportunity.boundaries.includes('cross-contamination')
  )
    return 'refrigerate-raw-protein-covered'
  if (
    ['slice', 'dice', 'chop', 'roughly_chop', 'mince', 'grate', 'shred'].includes(
      opportunity.action,
    )
  )
    return 'refrigerate-prepared-produce-covered'
  if (['marinate', 'mix', 'whisk', 'blend'].includes(opportunity.action))
    return 'refrigerate-prepared-component-covered'
  return null
}

function sourceInstructions(
  opportunity: RecipeIntelligence['preparationOpportunities'][number],
  snapshot: RecipeVersionRow['source_snapshot'] | undefined,
) {
  const ingredients = (snapshot?.ingredients ?? []).flatMap((ingredient) => {
    if (!ingredient.id || !opportunity.sourceIngredientIds.includes(ingredient.id)) return []
    const text = ingredient.originalText ?? ingredient.original_line_text
    return typeof text === 'string' && text.trim() ? [text.trim()] : []
  })
  const steps = (snapshot?.steps ?? []).flatMap((step) =>
    step.id && opportunity.sourceStepIds.includes(step.id) && step.instruction?.trim()
      ? [step.instruction.trim()]
      : [],
  )
  return [...ingredients, ...steps].join(' ')
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
  'roughly_chop',
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
      return json(422, { error: 'no_planned_meals' })
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
      `recipe_enrichments?is_active=eq.true&schema_version=eq.${ACTIVE_RECIPE_SCHEMA}&rules_version=eq.${ACTIVE_RECIPE_RULES}&or=(${filters.join(',')})&select=source_kind,recipe_id,imported_recipe_id,recipe_version_id,schema_version,rules_version,result&limit=100`,
    )
    const coveredRecipes = new Set(
      enrichments.map((item) => `${item.source_kind}:${item.recipe_id ?? item.imported_recipe_id}`),
    )
    const expectedRecipes = [
      ...recipeIds.map((id) => `household:${id}`),
      ...importedRecipeIds.map((id) => `shared_platform:${id}`),
    ]
    if (expectedRecipes.some((id) => !coveredRecipes.has(id))) {
      await continueRecipeEnrichment()
      return json(409, { error: 'recipes_preparing' })
    }
    if (enrichments.some((enrichment) => enrichment.result.preparationOpportunities.length === 0)) {
      await continueRecipeEnrichment()
      return json(409, { error: 'recipes_without_opportunities' })
    }
    const recipeVersions = await rest<RecipeVersionRow[]>(
      `recipe_content_versions?id=in.(${enrichments.map((item) => item.recipe_version_id).join(',')})&select=id,source_snapshot&limit=100`,
    )
    const candidates = candidatesFrom(
      householdId,
      planId,
      settings[0]?.default_servings ?? 4,
      meals,
      enrichments,
      recipeVersions,
    )
    if (candidates.length === 0) return json(422, { error: 'opportunities_not_ready_yet' })
    const workerToken = Deno.env.get('WEEKLY_PREPARATION_WORKER_TOKEN')
    if (!workerToken) return json(503, { error: 'worker_configuration_unavailable' })
    const worker = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-weekly-preparation-plan`,
      {
        method: 'POST',
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          'content-type': 'application/json',
          'x-cooksmith-worker-token': workerToken,
        },
        body: JSON.stringify({
          candidates,
          meals: planningContext(meals, householdRecipes, importedRecipes),
          availableMinutes: body.availableMinutes,
          forceRetry: body.forceRetry === true,
          requestId: crypto.randomUUID(),
        }),
        signal: AbortSignal.timeout(55_000),
      },
    )
    if (!worker.ok) {
      const failure = (await worker.json().catch(() => null)) as { error?: unknown } | null
      if (failure?.error === 'no_worthwhile_preparation')
        return json(422, { error: 'no_worthwhile_preparation' })
      return json(503, { error: 'ai_unavailable' })
    }
    const result = (await worker.json()) as { plan?: WeeklyPreparationPlan }
    if (!result.plan || result.plan.householdId !== householdId || result.plan.planId !== planId)
      return json(503, { error: 'ai_unavailable' })
    if (result.plan.tasks.length === 0) return json(422, { error: 'no_worthwhile_preparation' })
    return json(200, { plan: result.plan })
  } catch {
    return json(503, { error: 'plan_data_unavailable' })
  }
})
