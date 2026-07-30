import type {
  WeeklyPreparationCandidate,
  WeeklyPreparationPlan,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'
import type { RecipeIntelligence } from '../../../src/domain/recipes/intelligence.ts'

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
      if (!ingredient.action && !ingredient.preparationDetail) return []
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
          maximumLeadTimeHours: null,
          storageGuidanceReference: null,
          boundaries: [],
          confidence: ingredient.confidence,
        } satisfies WeeklyPreparationCandidate,
      ]
    })
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const userId = await authenticatedUserId(request)
  if (!userId) return json(401, { error: 'unauthenticated' })

  const body = (await request.json().catch(() => null)) as {
    householdId?: unknown
    weekStart?: unknown
    weekEnd?: unknown
    forceRetry?: unknown
  } | null
  if (
    typeof body?.householdId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(body.householdId) ||
    !validDate(body?.weekStart) ||
    !validDate(body?.weekEnd) ||
    body.weekStart > body.weekEnd
  )
    return json(400, { error: 'invalid_week' })

  try {
    const memberships = await rest<Array<{ household_id: string }>>(
      `household_members?user_id=eq.${encodeURIComponent(userId)}&household_id=eq.${encodeURIComponent(body.householdId)}&status=eq.active&select=household_id&limit=1`,
    )
    const householdId = memberships[0]?.household_id
    if (!householdId) return json(403, { error: 'household_unavailable' })
    const planId = `${body.weekStart}_${body.weekEnd}`
    const meals = await rest<MealRow[]>(
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
    const settings = await rest<Array<{ default_servings: number }>>(
      `household_settings?household_id=eq.${householdId}&select=default_servings&limit=1`,
    )
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
    if (!workerToken) throw new Error('worker_unavailable')
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
          forceRetry: body.forceRetry === true,
          requestId: `${householdId}:${planId}`,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!worker.ok) throw new Error('worker_unavailable')
    const result = (await worker.json()) as { plan?: WeeklyPreparationPlan }
    if (!result.plan || result.plan.householdId !== householdId || result.plan.planId !== planId)
      throw new Error('invalid_worker_response')
    return json(200, { plan: result.plan })
  } catch {
    return json(503, { error: 'temporarily_unavailable' })
  }
})

function emptyPlan(householdId: string, planId: string): WeeklyPreparationPlan {
  return {
    schemaVersion: 'weekly-preparation-plan-v1',
    plannerVersion: 'weekly-preparation-planner-v1',
    householdId,
    planId,
    cacheKey: `empty:${planId}`,
    tasks: [],
    ambiguousCandidateIds: [],
    generation: 'deterministic',
    fallbackReason: null,
  }
}
