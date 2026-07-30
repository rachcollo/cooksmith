import {
  applyAndValidateModelDecision,
  buildDeterministicWeeklyPreparationPlan,
  withWeeklyPreparationFallback,
  type WeeklyPreparationCandidate,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'
import { decideAmbiguousPreparation } from './openaiAdapter.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

const serviceHeaders = () => ({
  apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
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
    forceRetry?: unknown
    requestId?: unknown
  } | null
  const candidates = candidatesFrom(body?.candidates)
  if (!candidates) return json(400, { error: 'invalid_request' })

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
        settings?.ai_enabled && !settings.emergency_stop ? 'ai' : 'usual',
        settings?.model_identifier ?? 'unconfigured',
        settings?.prompt_version ?? 'unconfigured',
        settings?.corpus_version ?? 'unconfigured',
      ].join(':'),
    }
    const cached = await loadCached(
      deterministic.householdId,
      deterministic.planId,
      deterministic.cacheKey,
    )
    if (cached && body?.forceRetry !== true)
      return json(200, { plan: cached, metrics: { cacheHit: true } })
    if (deterministic.ambiguousCandidateIds.length === 0) {
      await savePlan(deterministic)
      return json(200, { plan: deterministic, metrics: { modelCalled: false } })
    }

    if (!settings?.ai_enabled || settings.emergency_stop) {
      const fallback = withWeeklyPreparationFallback(
        deterministic,
        settings?.emergency_stop ? 'emergency_stop' : 'ai_disabled',
      )
      await savePlan(fallback)
      return json(200, {
        plan: fallback,
        metrics: { modelCalled: false },
      })
    }

    const ambiguous = candidates.filter((candidate) =>
      deterministic.ambiguousCandidateIds.includes(candidate.id),
    )
    const assisted = await decideAmbiguousPreparation({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
      model: Deno.env.get('WEEKLY_PREPARATION_MODEL') ?? 'gpt-5-mini-2025-08-07',
      candidates: ambiguous,
      timeoutMs: 10_000,
    })
    const validated = applyAndValidateModelDecision(deterministic, candidates, assisted.decision)
    if (!validated.ok) {
      const fallback = withWeeklyPreparationFallback(deterministic, validated.reason)
      await savePlan(fallback)
      return json(200, {
        plan: fallback,
        metrics: { modelCalled: true, validation: 'rejected' },
      })
    }
    await savePlan(validated.value)
    return json(200, {
      plan: validated.value,
      metrics: {
        modelCalled: true,
        validation: 'accepted',
        inputTokens: assisted.inputTokens,
        outputTokens: assisted.outputTokens,
      },
    })
  } catch (error) {
    const deterministic = buildDeterministicWeeklyPreparationPlan(candidates)
    const reason = error instanceof Error ? error.message : 'temporarily_unavailable'
    const fallback = withWeeklyPreparationFallback(deterministic, reason)
    await savePlan(fallback).catch(() => undefined)
    return json(200, {
      plan: fallback,
      metrics: { modelCalled: true, validation: 'fallback' },
    })
  }
})
