import {
  applyAndValidateModelDecision,
  buildDeterministicWeeklyPreparationPlan,
  type WeeklyPreparationCandidate,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'
import { decideAmbiguousPreparation, WeeklyPreparationProviderError } from './openaiAdapter.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

const serviceHeaders = () => ({
  apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
  'accept-profile': 'cooksmith',
  'content-profile': 'cooksmith',
  'content-type': 'application/json',
})

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...init.headers },
  })
  if (!response.ok) throw new Error('persistence_unavailable')
  return response
}

async function loadCached(householdId: string, planId: string, cacheKey: string) {
  const query = new URLSearchParams({
    household_id: `eq.${householdId}`,
    plan_key: `eq.${planId}`,
    cache_key: `eq.${cacheKey}`,
    select: 'result',
    limit: '1',
  })
  const response = await rest(`weekly_preparation_plans?${query}`)
  const rows = (await response.json()) as Array<{ result: unknown }>
  return rows[0]?.result ?? null
}

async function deleteCached(householdId: string, planId: string, cacheKey: string) {
  const query = new URLSearchParams({
    household_id: `eq.${householdId}`,
    plan_key: `eq.${planId}`,
    cache_key: `eq.${cacheKey}`,
  })
  await rest(`weekly_preparation_plans?${query}`, { method: 'DELETE' })
}

function isUsablePlan(
  value: unknown,
): value is ReturnType<typeof buildDeterministicWeeklyPreparationPlan> {
  if (!value || typeof value !== 'object') return false
  const plan = value as { tasks?: unknown; generation?: unknown }
  return plan.generation === 'model-assisted' && Array.isArray(plan.tasks) && plan.tasks.length > 0
}

async function recordAttempt(input: {
  householdId: string
  planId: string
  requestKey: string
  outcome: 'model-assisted' | 'failed'
  reasonCode: string | null
  modelCalled: boolean
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}) {
  await rest('weekly_preparation_generation_attempts?on_conflict=household_id,request_key', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      household_id: input.householdId,
      plan_key: input.planId,
      request_key: input.requestKey,
      outcome: input.outcome,
      reason_code: input.reasonCode,
      model_called: input.modelCalled,
      latency_ms: input.latencyMs,
      input_tokens: input.inputTokens ?? 0,
      output_tokens: input.outputTokens ?? 0,
      estimated_cost_aud: 0,
    }),
  }).catch(() => undefined)
}

async function savePlan(plan: ReturnType<typeof buildDeterministicWeeklyPreparationPlan>) {
  await rest('weekly_preparation_plans?on_conflict=household_id,plan_key,cache_key', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      household_id: plan.householdId,
      plan_key: plan.planId,
      cache_key: plan.cacheKey,
      schema_version: plan.schemaVersion,
      planner_version: plan.plannerVersion,
      generation: plan.generation,
      result: plan,
      fallback_reason: plan.fallbackReason,
    }),
  })
}

function candidatesFrom(value: unknown): WeeklyPreparationCandidate[] | null {
  if (!Array.isArray(value) || value.length > 500) return null
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.householdId === 'string' &&
      typeof item.planId === 'string' &&
      typeof item.recipeId === 'string' &&
      typeof item.recipeVersionId === 'string' &&
      typeof item.enrichmentVersion === 'string' &&
      typeof item.servings === 'number' &&
      item.quantity &&
      typeof item.quantity === 'object' &&
      Array.isArray(item.boundaries),
  )
    ? (value as WeeklyPreparationCandidate[])
    : null
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const expected = Deno.env.get('WEEKLY_PREPARATION_WORKER_TOKEN')
  if (!expected || request.headers.get('x-cooksmith-worker-token') !== expected)
    return json(401, { error: 'unauthorised' })

  const body = (await request.json().catch(() => null)) as {
    candidates?: unknown
    meals?: unknown
    availableMinutes?: unknown
    forceRetry?: unknown
    requestId?: unknown
  } | null
  const startedAt = Date.now()
  const candidates = candidatesFrom(body?.candidates)
  const availableMinutes = body?.availableMinutes
  const meals = Array.isArray(body?.meals) ? body.meals : null
  if (
    !candidates ||
    !meals ||
    !Number.isInteger(availableMinutes) ||
    Number(availableMinutes) < 5 ||
    Number(availableMinutes) > 240
  )
    return json(400, { error: 'invalid_request' })

  try {
    const settingsResponse = await rest(
      'weekly_preparation_settings?singleton=eq.true&select=ai_enabled,emergency_stop,model_identifier,prompt_version,corpus_version',
    )
    const [settings] = (await settingsResponse.json()) as Array<{
      ai_enabled: boolean
      emergency_stop: boolean
      model_identifier: string
      prompt_version: string
      corpus_version: string
    }>
    const basePlan = buildDeterministicWeeklyPreparationPlan(candidates)
    const deterministic = {
      ...basePlan,
      cacheKey: [
        basePlan.cacheKey,
        basePlan.plannerVersion,
        settings?.ai_enabled && !settings.emergency_stop ? 'ai' : 'usual',
        settings?.model_identifier ?? 'unconfigured',
        settings?.prompt_version ?? 'unconfigured',
        settings?.corpus_version ?? 'unconfigured',
        availableMinutes,
      ].join(':'),
    }
    const cached = await loadCached(
      deterministic.householdId,
      deterministic.planId,
      deterministic.cacheKey,
    )
    if (cached && !isUsablePlan(cached))
      await deleteCached(deterministic.householdId, deterministic.planId, deterministic.cacheKey)
    if (isUsablePlan(cached) && body?.forceRetry !== true)
      return json(200, { plan: cached, metrics: { cacheHit: true } })
    if (!settings?.ai_enabled || settings.emergency_stop) {
      return json(409, { error: 'ai_unavailable' })
    }

    const configuredModel = Deno.env.get('WEEKLY_PREPARATION_MODEL')
    if (!configuredModel || configuredModel !== settings.model_identifier) {
      return json(503, { error: 'ai_unavailable' })
    }

    const requestKey = typeof body?.requestId === 'string' ? body.requestId : crypto.randomUUID()
    let assisted: Awaited<ReturnType<typeof decideAmbiguousPreparation>>
    try {
      assisted = await decideAmbiguousPreparation({
        apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
        model: configuredModel,
        candidates,
        meals: meals as Array<{
          plannedMealId: string
          mealDate: string
          recipeName: string
          ingredients: string[]
          instructions: string[]
        }>,
        availableMinutes: Number(availableMinutes),
        timeoutMs: 45_000,
      })
    } catch (error) {
      const reasonCode =
        error instanceof WeeklyPreparationProviderError ? error.category : 'provider_output_invalid'
      await recordAttempt({
        householdId: deterministic.householdId,
        planId: deterministic.planId,
        requestKey,
        outcome: 'failed',
        reasonCode,
        modelCalled: true,
        latencyMs: Date.now() - startedAt,
      })
      return json(503, { error: reasonCode })
    }
    const validated = applyAndValidateModelDecision(
      deterministic,
      candidates,
      assisted.decision,
      Number(availableMinutes),
    )
    if (!validated.ok) {
      await recordAttempt({
        householdId: deterministic.householdId,
        planId: deterministic.planId,
        requestKey,
        outcome: 'failed',
        reasonCode: validated.reason,
        modelCalled: assisted.modelCalled,
        latencyMs: Date.now() - startedAt,
        inputTokens: assisted.inputTokens,
        outputTokens: assisted.outputTokens,
      })
      return json(422, { error: validated.reason })
    }
    await savePlan(validated.value)
    await recordAttempt({
      householdId: deterministic.householdId,
      planId: deterministic.planId,
      requestKey,
      outcome: 'model-assisted',
      reasonCode: null,
      modelCalled: assisted.modelCalled,
      latencyMs: Date.now() - startedAt,
      inputTokens: assisted.inputTokens,
      outputTokens: assisted.outputTokens,
    })
    return json(200, {
      plan: validated.value,
      metrics: {
        modelCalled: assisted.modelCalled,
        validation: 'accepted',
        inputTokens: assisted.inputTokens,
        outputTokens: assisted.outputTokens,
      },
    })
  } catch {
    return json(503, { error: 'ai_unavailable' })
  }
})
