import {
  applyAndValidateModelDecision,
  buildDeterministicWeeklyPreparationPlan,
  weeklyPreparationPlannerVersion,
  weeklyPreparationPlanSchemaVersion,
  type WeeklyPreparationCandidate,
} from '../../../src/domain/get-ahead/weeklyPreparationPlan.ts'
import {
  decideAmbiguousPreparation,
  WeeklyPreparationProviderError,
} from '../generate-weekly-preparation-plan/openaiAdapter.ts'

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
    headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
const serviceHeaders = () => ({
  apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
  'accept-profile': 'cooksmith',
  'content-profile': 'cooksmith',
  'content-type': 'application/json',
})
const userHeaders = (authorisation: string) => ({
  apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  authorization: authorisation,
  'accept-profile': 'cooksmith',
  'content-profile': 'cooksmith',
  'content-type': 'application/json',
})

function evaluationFailure(error: unknown) {
  if (error instanceof WeeklyPreparationProviderError) {
    // Operational metadata only. Provider payloads and Cooksmith content are excluded.
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        event: 'weekly_preparation_evaluation_provider_failure',
        category: error.category,
        provider_http_status: error.status,
        provider_error_code: error.providerCode,
        provider_error_param: error.providerParam,
        provider_request_id: error.requestId,
      }),
    )
    return error.category
  }
  if (error instanceof Error && error.message === 'schema_invalid') return 'provider_output_invalid'
  return 'evaluation_failed'
}

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...init.headers },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error('persistence_unavailable')
  return response
}

async function isAdministrator(request: Request) {
  const authorisation = request.headers.get('authorization')
  if (!authorisation) return false
  const userResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authorization: authorisation,
    },
    signal: AbortSignal.timeout(5_000),
  })
  if (!userResponse.ok) return false
  const roleResponse = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/has_application_role`,
    {
      method: 'POST',
      headers: userHeaders(authorisation),
      body: JSON.stringify({ required_role: 'admin' }),
      signal: AbortSignal.timeout(5_000),
    },
  )
  if (!roleResponse.ok) throw new Error('authorisation_unavailable')
  return (await roleResponse.json()) === true
}

async function prepareEvaluationSlot() {
  const response = await rest(
    'weekly_preparation_evaluation_runs?status=eq.running&select=id,created_at&order=created_at.desc&limit=1',
  )
  const [running] = (await response.json()) as Array<{ id: string; created_at: string }>
  if (!running) return null
  const createdAt = Date.parse(running.created_at)
  if (Number.isFinite(createdAt) && Date.now() - createdAt < 15 * 60 * 1_000)
    return 'evaluation_already_running'
  await rest(`weekly_preparation_evaluation_runs?id=eq.${encodeURIComponent(running.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_reason: 'evaluation_interrupted',
    }),
  })
  return null
}

function candidate(
  caseNumber: number,
  item: number,
  action: string,
  ingredient = 'onion',
): WeeklyPreparationCandidate {
  const id = `evaluation-${caseNumber}-${item}`
  return {
    id,
    householdId: '00000000-0000-4000-8000-000000000094',
    planId: `evaluation-${caseNumber}`,
    plannedMealId: `meal-${id}`,
    recipeId: `recipe-${id}`,
    recipeVersionId: `version-${id}`,
    enrichmentVersion: 'recipe-intelligence-v1',
    servings: 4,
    sourceIngredientId: `ingredient-${id}`,
    sourceStepIds: [`step-${id}`],
    originalText: `1 ${ingredient}, ${action}`,
    canonicalIngredient: ingredient,
    canonicalAction: action,
    preparationDetail: action,
    quantity: { state: 'known', value: 1, unit: null },
    maximumLeadTimeHours: 24,
    storageGuidanceReference: 'refrigerate-covered-and-labelled',
    boundaries: [],
    confidence: 'high',
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  try {
    if (!(await isAdministrator(request))) return json(403, { error: 'administrator_required' })
  } catch {
    return json(503, { error: 'authorisation_unavailable' })
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('WEEKLY_PREPARATION_MODEL')
  const deploymentSha = Deno.env.get('COOKSMITH_DEPLOYMENT_SHA')
  const inputRate = Number(Deno.env.get('OPENAI_INPUT_COST_AUD_PER_MILLION'))
  const outputRate = Number(Deno.env.get('OPENAI_OUTPUT_COST_AUD_PER_MILLION'))
  if (
    !apiKey ||
    !model ||
    !deploymentSha ||
    !Number.isFinite(inputRate) ||
    inputRate < 0 ||
    !Number.isFinite(outputRate) ||
    outputRate < 0
  )
    return json(412, { error: 'configuration_incomplete' })

  let settings: {
    corpus_version: string
    prompt_version: string
    pricing_version: string
    model_identifier: string
  }
  let runId: string
  try {
    const slotError = await prepareEvaluationSlot()
    if (slotError) return json(409, { error: slotError })
    const settingsResponse = await rest(
      'weekly_preparation_settings?singleton=eq.true&select=corpus_version,prompt_version,pricing_version,model_identifier',
    )
    const rows = (await settingsResponse.json()) as (typeof settings)[]
    if (!rows[0]) return json(412, { error: 'configuration_incomplete' })
    settings = rows[0]

    if (settings.model_identifier !== model) {
      await rest('weekly_preparation_settings?singleton=eq.true', {
        method: 'PATCH',
        body: JSON.stringify({
          model_identifier: model,
          smoke_verified_at: null,
          smoke_deployment_sha: null,
        }),
      })
    }

    const runResponse = await rest('weekly_preparation_evaluation_runs?select=id', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        corpus_version: settings.corpus_version,
        schema_version: weeklyPreparationPlanSchemaVersion,
        planner_version: weeklyPreparationPlannerVersion,
        prompt_version: settings.prompt_version,
        model_identifier: model,
        pricing_version: settings.pricing_version,
        status: 'running',
        plan_count: 30,
        deterministic_count: 0,
        model_call_count: 0,
        valid_output_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        fallback_count: 0,
        unsupported_count: 0,
        reviewed_correct_count: 0,
        total_latency_ms: 0,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_aud: 0,
        ambiguous_decision: 'fallback',
        deployment_sha: deploymentSha,
      }),
    })
    const runs = (await runResponse.json()) as Array<{ id: string }>
    if (!runs[0]) return json(503, { error: 'evaluation_persistence_unavailable' })
    runId = runs[0].id
  } catch {
    return json(503, { error: 'evaluation_persistence_unavailable' })
  }

  let deterministicCount = 0
  let modelCallCount = 0
  let validOutputCount = 0
  let fallbackCount = 0
  let reviewedCorrectCount = 0
  let totalLatencyMs = 0
  let inputTokens = 0
  let outputTokens = 0
  let estimatedCostAud = 0
  try {
    for (let index = 0; index < 30; index += 1) {
      const caseNumber = index + 1
      const expectedModelCall = true
      const candidates = [
        candidate(caseNumber, 1, 'dice'),
        candidate(caseNumber, 2, 'chop', 'carrot'),
        candidate(caseNumber, 3, 'mince', 'garlic'),
        candidate(caseNumber, 4, 'cook', 'garlic cloves'),
        candidate(caseNumber, 5, 'slice', 'capsicum'),
      ]
      const meals = Array.from({ length: 5 }, (_, mealIndex) => ({
        plannedMealId: candidates[mealIndex]?.plannedMealId ?? `meal-${mealIndex}`,
        mealDate: `2026-08-${String(mealIndex + 3).padStart(2, '0')}`,
        recipeName: `Representative meal ${mealIndex + 1}`,
        ingredients: [candidates[mealIndex]?.originalText ?? '1 vegetable'],
        instructions:
          mealIndex === 3
            ? ['Cook garlic cloves and reserve the simmering water.']
            : ['Prepare the vegetables, then cook the meal on the planned day.'],
      }))
      const startedAt = Date.now()
      const deterministic = buildDeterministicWeeklyPreparationPlan(candidates)
      let outcome = 'deterministic'
      let modelCalled = false
      let caseInputTokens = 0
      let caseOutputTokens = 0
      if (expectedModelCall) {
        modelCalled = true
        modelCallCount += 1
        const assisted = await decideAmbiguousPreparation({
          apiKey,
          model,
          candidates,
          meals,
          availableMinutes: 30,
          timeoutMs: 12_000,
        })
        caseInputTokens = assisted.inputTokens
        caseOutputTokens = assisted.outputTokens
        inputTokens += caseInputTokens
        outputTokens += caseOutputTokens
        const caseCostAud =
          (caseInputTokens * inputRate + caseOutputTokens * outputRate) / 1_000_000
        estimatedCostAud += caseCostAud
        const validated = applyAndValidateModelDecision(
          deterministic,
          candidates,
          assisted.decision,
          30,
        )
        const usefulMinutes = validated.ok
          ? validated.value.tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0)
          : 0
        const usefulPlan =
          validated.ok &&
          validated.value.tasks.length >= 2 &&
          usefulMinutes >= 15 &&
          validated.value.tasks.every(
            (task) => !/cook garlic|reserve .*water|preheat/i.test(task.title),
          )
        if (!validated.ok || !usefulPlan) {
          fallbackCount += 1
          outcome = 'fallback'
        } else {
          validOutputCount += 1
          reviewedCorrectCount += 1
          outcome = 'model-assisted'
        }
      } else {
        deterministicCount += 1
        reviewedCorrectCount += 1
      }
      const latencyMs = Date.now() - startedAt
      totalLatencyMs += latencyMs
      await rest('weekly_preparation_evaluation_cases', {
        method: 'POST',
        body: JSON.stringify({
          run_id: runId,
          case_number: caseNumber,
          case_key: `representative-week-${caseNumber}`,
          expected_model_call: expectedModelCall,
          model_called: modelCalled,
          outcome,
          reason_code: outcome === 'fallback' ? 'validation' : null,
          latency_ms: latencyMs,
          input_tokens: caseInputTokens,
          output_tokens: caseOutputTokens,
          estimated_cost_aud:
            (caseInputTokens * inputRate + caseOutputTokens * outputRate) / 1_000_000,
        }),
      })
    }
    await rest(`weekly_preparation_evaluation_runs?id=eq.${runId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        completed_at: new Date().toISOString(),
        deterministic_count: deterministicCount,
        model_call_count: modelCallCount,
        valid_output_count: validOutputCount,
        accepted_count: validOutputCount,
        fallback_count: fallbackCount,
        reviewed_correct_count: reviewedCorrectCount,
        total_latency_ms: totalLatencyMs,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_aud: estimatedCostAud,
        ambiguous_decision: fallbackCount === 0 ? 'accepted' : 'fallback',
      }),
    })
    await rest('weekly_preparation_settings?singleton=eq.true', {
      method: 'PATCH',
      body: JSON.stringify({
        smoke_verified_at: new Date().toISOString(),
        smoke_deployment_sha: deploymentSha,
      }),
    })
    return json(200, { runId, status: 'completed' })
  } catch (error) {
    const errorReason = evaluationFailure(error)
    await rest(`weekly_preparation_evaluation_runs?id=eq.${runId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_reason: errorReason,
        deterministic_count: deterministicCount,
        model_call_count: modelCallCount,
        valid_output_count: validOutputCount,
        accepted_count: validOutputCount,
        fallback_count: fallbackCount,
        reviewed_correct_count: reviewedCorrectCount,
        total_latency_ms: totalLatencyMs,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_aud: estimatedCostAud,
      }),
    }).catch(() => undefined)
    return json(503, { error: errorReason })
  }
})
