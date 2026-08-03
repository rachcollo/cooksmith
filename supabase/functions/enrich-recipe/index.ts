import {
  buildDeterministicRecipeIntelligence,
  validateProviderEnrichment,
  type RecipeIntelligenceSource,
} from '../../../src/domain/recipes/intelligence.ts'
import { ProviderRequestError, resolveAmbiguousLinks } from './openaiAdapter.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void
}

type Job = {
  id: string
  source_kind: 'household' | 'shared_platform'
  recipe_id: string | null
  imported_recipe_id: string | null
  recipe_version_id: string
  attempt_count: number
  model_key: string
}

type SnapshotIngredient = Partial<RecipeIntelligenceSource['ingredients'][number]> & {
  ingredient_name?: string
  original_line_text?: string
  quantity_text?: string | null
}

type Version = {
  id: string
  source_kind: Job['source_kind']
  recipe_id: string | null
  imported_recipe_id: string | null
  fingerprint: string
  source_snapshot: {
    ingredients?: SnapshotIngredient[]
    steps?: RecipeIntelligenceSource['steps']
  }
}

type Settings = {
  ai_enabled: boolean
  emergency_stop: boolean
  daily_recipe_limit: number
  monthly_cost_limit_aud: number
  max_concurrency: number
  backfill_paused: boolean
}

const PROVIDER_TIMEOUT_MS = 105_000
const JOB_LEASE_MS = 130_000
const MAX_CHAIN_DEPTH = 100
const CONCURRENCY_RETRY_DELAY_MS = 5_000

function env(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`missing_${name.toLowerCase()}`)
  return value
}

function secretKey() {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>
    if (parsed.default) return parsed.default
  }
  return env('SUPABASE_SERVICE_ROLE_KEY')
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders,
      'cache-control': 'no-store',
      'content-type': 'application/json',
    },
  })
}

function restHeaders() {
  return {
    // Supabase secret keys are opaque `sb_secret_...` values, not JWTs.
    // Sending one as a bearer token makes the gateway reject the request.
    apikey: secretKey(),
    'content-type': 'application/json',
    'content-profile': 'cooksmith',
    'accept-profile': 'cooksmith',
  }
}

function userRestHeaders(authorization: string) {
  return {
    apikey: secretKey(),
    authorization,
    'content-type': 'application/json',
    'content-profile': 'cooksmith',
    'accept-profile': 'cooksmith',
  }
}

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: { ...restHeaders(), ...(init.headers ?? {}) },
  })
  if (!response.ok) throw new Error(`database_unavailable:${response.status}:${path.split('?')[0]}`)
  return response
}

async function isAuthorised(request: Request) {
  const expected = Deno.env.get('RECIPE_INTELLIGENCE_WORKER_TOKEN')
  if (expected && request.headers.get('x-cooksmith-worker-token') === expected) return true

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return false
  const response = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/has_application_role`, {
    method: 'POST',
    headers: userRestHeaders(authorization),
    body: JSON.stringify({ required_role: 'admin' }),
  })
  return response.ok && ((await response.json()) as unknown) === true
}

async function dispatchNext(chainDepth: number) {
  const response = await fetch(`${env('SUPABASE_URL')}/functions/v1/enrich-recipe`, {
    method: 'POST',
    headers: {
      apikey: secretKey(),
      'content-type': 'application/json',
      'x-cooksmith-worker-token': env('RECIPE_INTELLIGENCE_WORKER_TOKEN'),
    },
    body: JSON.stringify({ chainDepth }),
  })
  if (!response.ok) throw new Error('worker_dispatch_failed')
}

async function settings(): Promise<Settings> {
  const response = await rest(
    'recipe_intelligence_settings?singleton=eq.true&select=ai_enabled,emergency_stop,daily_recipe_limit,monthly_cost_limit_aud,max_concurrency,backfill_paused',
  )
  const rows = (await response.json()) as Settings[]
  if (!rows[0]) throw new Error('settings_unavailable')
  return rows[0]
}

async function withinUsageLimits(config: Settings) {
  const day = new Date()
  day.setUTCHours(0, 0, 0, 0)
  const month = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1))
  const response = await rest(
    `recipe_enrichment_jobs?model_key=neq.deterministic&created_at=gte.${encodeURIComponent(month.toISOString())}&select=created_at,estimated_cost_aud`,
  )
  const rows = (await response.json()) as Array<{
    created_at: string
    estimated_cost_aud: number | null
  }>
  const dailyCount = rows.filter((row) => new Date(row.created_at) >= day).length
  const monthlyCost = rows.reduce((total, row) => total + Number(row.estimated_cost_aud ?? 0), 0)
  return dailyCount < config.daily_recipe_limit && monthlyCost < config.monthly_cost_limit_aud
}

async function claimJob(modelKey?: string): Promise<{
  job: Job | null
  outcome: 'claimed' | 'busy' | 'waiting' | 'empty'
  retryAfterMs?: number
}> {
  const activeResponse = await rest(
    'recipe_enrichment_jobs?state=eq.processing&leased_until=gt.now()&select=id',
  )
  const active = (await activeResponse.json()) as Array<{ id: string }>
  const config = await settings()
  if (active.length >= config.max_concurrency) return { job: null, outcome: 'busy' }

  const modelFilter = modelKey ? `&model_key=eq.${encodeURIComponent(modelKey)}` : ''
  const response = await rest(
    `recipe_enrichment_jobs?state=eq.pending&available_at=lte.now()${modelFilter}&order=created_at.asc&limit=1&select=id,source_kind,recipe_id,imported_recipe_id,recipe_version_id,attempt_count,model_key`,
  )
  const jobs = (await response.json()) as Job[]
  const candidate = jobs[0]
  if (!candidate) {
    const waitingResponse = await rest(
      `recipe_enrichment_jobs?state=eq.pending${modelFilter}&order=available_at.asc&limit=1&select=available_at`,
    )
    const waiting = (await waitingResponse.json()) as Array<{ available_at: string }>
    if (!waiting[0]) return { job: null, outcome: 'empty' }
    return {
      job: null,
      outcome: 'waiting',
      retryAfterMs: Math.min(
        Math.max(new Date(waiting[0].available_at).getTime() - Date.now(), 1_000),
        30_000,
      ),
    }
  }

  const lease = new Date(Date.now() + JOB_LEASE_MS).toISOString()
  const claim = await rest(
    `recipe_enrichment_jobs?id=eq.${candidate.id}&state=eq.pending&select=id,source_kind,recipe_id,imported_recipe_id,recipe_version_id,attempt_count,model_key`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        state: 'processing',
        attempt_count: candidate.attempt_count + 1,
        leased_until: lease,
        failure_category: null,
      }),
    },
  )
  const claimed = (await claim.json()) as Job[]
  return claimed[0] ? { job: claimed[0], outcome: 'claimed' } : { job: null, outcome: 'busy' }
}

async function loadVersion(job: Job): Promise<Version> {
  const response = await rest(
    `recipe_content_versions?id=eq.${job.recipe_version_id}&select=id,source_kind,recipe_id,imported_recipe_id,fingerprint,source_snapshot`,
  )
  const versions = (await response.json()) as Version[]
  if (
    !versions[0] ||
    versions[0].source_kind !== job.source_kind ||
    versions[0].recipe_id !== job.recipe_id ||
    versions[0].imported_recipe_id !== job.imported_recipe_id
  )
    throw new Error('stale_version')
  return versions[0]
}

function intelligenceSource(version: Version): RecipeIntelligenceSource {
  return {
    recipeId: version.recipe_id ?? version.imported_recipe_id ?? '',
    recipeFingerprint: version.fingerprint,
    ingredients: (version.source_snapshot.ingredients ?? []).map((ingredient) => ({
      id: ingredient.id ?? '',
      name: ingredient.name ?? ingredient.ingredient_name ?? '',
      originalText: ingredient.originalText ?? ingredient.original_line_text ?? '',
      quantityText: ingredient.quantityText ?? ingredient.quantity_text ?? null,
      unit: ingredient.unit ?? null,
      preparation: ingredient.preparation ?? null,
    })),
    steps: version.source_snapshot.steps ?? [],
  }
}

async function currentVersionMatches(version: Version) {
  const response = await rest(
    version.source_kind === 'household'
      ? `recipe_content_versions?source_kind=eq.household&recipe_id=eq.${version.recipe_id}&order=created_at.desc&limit=1&select=id`
      : `recipe_content_versions?source_kind=eq.shared_platform&imported_recipe_id=eq.${version.imported_recipe_id}&order=created_at.desc&limit=1&select=id`,
  )
  const versions = (await response.json()) as Array<{ id: string }>
  return versions[0]?.id === version.id
}

async function finishJob(job: Job, state: 'failed' | 'pending', values: Record<string, unknown>) {
  await rest(`recipe_enrichment_jobs?id=eq.${job.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      state,
      leased_until: null,
      completed_at: null,
      ...values,
    }),
  })
}

async function recordUsageTelemetry(job: Job, values: Record<string, unknown>) {
  try {
    await rest(`recipe_enrichment_jobs?id=eq.${job.id}&state=eq.completed`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    })
  } catch {
    // Activation and job completion are already committed atomically. Usage telemetry is
    // best-effort and must never turn a successful enrichment into a failed job.
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: 'recipe_enrichment_telemetry_failed', jobId: job.id }))
  }
}

function failureCategory(error: unknown) {
  if (error instanceof ProviderRequestError) return error.category
  const value = error instanceof Error ? error.message : 'internal_validation'
  const allowed = new Set([
    'disabled',
    'timeout',
    'usage_limit',
    'transient_provider',
    'permanent_provider',
    'schema_invalid',
    'source_mismatch',
    'unsupported_reference',
    'unsupported_data',
    'stale_version',
    'internal_validation',
  ])
  return allowed.has(value) ? value : 'internal_validation'
}

function providerDiagnostic(error: unknown) {
  if (!(error instanceof ProviderRequestError)) return {}
  return {
    provider_http_status: error.status,
    provider_error_code: error.providerCode,
    provider_error_param: error.providerParam,
    provider_request_id: error.requestId,
  }
}

function estimatedCostAud(inputTokens: number, outputTokens: number) {
  const inputRate = Number(env('OPENAI_INPUT_COST_AUD_PER_MILLION'))
  const outputRate = Number(env('OPENAI_OUTPUT_COST_AUD_PER_MILLION'))
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate))
    throw new Error('internal_validation')
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000
}

async function processOne(modelKey?: string) {
  const config = await settings()
  if (config.emergency_stop || config.backfill_paused) return { outcome: 'disabled' }
  const claimed = await claimJob(modelKey)
  if (!claimed.job) {
    if (claimed.outcome === 'busy') return { outcome: 'busy' }
    if (claimed.outcome === 'waiting')
      return { outcome: 'waiting', retryAfterMs: claimed.retryAfterMs }
    return { outcome: 'idle' }
  }
  const job = claimed.job
  const startedAt = performance.now()

  try {
    const version = await loadVersion(job)
    const source = intelligenceSource(version)
    const deterministic = buildDeterministicRecipeIntelligence(source)
    let result = deterministic
    let provider = 'deterministic'
    let modelKey = 'deterministic'
    let inputTokens = 0
    let outputTokens = 0
    let costAud = 0

    if (job.model_key === 'provider-assisted-v1') {
      if (!config.ai_enabled) throw new Error('disabled')
      if (!(await currentVersionMatches(version))) throw new Error('stale_version')
      if (!(await withinUsageLimits(config))) throw new Error('usage_limit')
      modelKey = Deno.env.get('RECIPE_INTELLIGENCE_MODEL') ?? 'gpt-5-mini-2025-08-07'
      const assisted = await resolveAmbiguousLinks({
        apiKey: env('OPENAI_API_KEY'),
        model: modelKey,
        source,
        deterministic,
        timeoutMs: PROVIDER_TIMEOUT_MS,
      })
      result = assisted.result
      inputTokens = assisted.inputTokens
      outputTokens = assisted.outputTokens
      costAud = estimatedCostAud(inputTokens, outputTokens)
      provider = 'openai'
    }

    const validation = validateProviderEnrichment(source, result)
    if (!validation.ok) throw new Error(validation.reason)
    if (!(await currentVersionMatches(version))) throw new Error('stale_version')

    await rest('rpc/activate_recipe_enrichment', {
      method: 'POST',
      body: JSON.stringify({
        target_job_id: job.id,
        target_provider: provider,
        target_model_key: modelKey,
        target_result: result,
        target_overall_confidence: result.overallConfidence,
      }),
    })
    await recordUsageTelemetry(job, {
      latency_ms: Math.round(performance.now() - startedAt),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_aud: costAud,
    })
    return { outcome: 'completed', jobId: job.id, provider }
  } catch (error) {
    const category = failureCategory(error)
    const retry = category === 'transient_provider' && job.attempt_count + 1 < 3
    await finishJob(job, retry ? 'pending' : 'failed', {
      failure_category: category,
      available_at: retry ? new Date(Date.now() + 30_000).toISOString() : undefined,
      latency_ms: Math.round(performance.now() - startedAt),
      ...providerDiagnostic(error),
    })
    return {
      outcome: retry ? 'retry_scheduled' : 'failed',
      jobId: job.id,
      category,
      providerStatus: error instanceof ProviderRequestError ? error.status : undefined,
      providerCode: error instanceof ProviderRequestError ? error.providerCode : undefined,
      providerParam: error instanceof ProviderRequestError ? error.providerParam : undefined,
      providerRequestId: error instanceof ProviderRequestError ? error.requestId : undefined,
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    if (!(await isAuthorised(request))) return json(401, { error: 'unauthorised' })
    const body = (await request.json().catch(() => ({}))) as {
      dispatchMode?: unknown
      modelKey?: unknown
      chainDepth?: unknown
    }
    const dispatchMode = body.dispatchMode === 'single' ? 'single' : 'chain'
    const modelKey =
      dispatchMode === 'single' && body.modelKey === 'provider-assisted-v1'
        ? 'provider-assisted-v1'
        : undefined
    const chainDepth =
      typeof body.chainDepth === 'number' && Number.isInteger(body.chainDepth)
        ? Math.min(Math.max(body.chainDepth, 0), MAX_CHAIN_DEPTH)
        : 0
    const result = await processOne(modelKey)
    // Operational metadata only; recipe content, credentials and provider payloads are excluded.
    // eslint-disable-next-line no-console
    console.info(JSON.stringify({ event: 'recipe_enrichment', ...result }))
    const shouldContinue =
      result.outcome === 'completed' ||
      result.outcome === 'retry_scheduled' ||
      result.outcome === 'failed' ||
      result.outcome === 'busy' ||
      result.outcome === 'waiting'
    if (dispatchMode === 'chain' && shouldContinue && chainDepth < MAX_CHAIN_DEPTH) {
      EdgeRuntime.waitUntil(
        (async () => {
          if (result.outcome === 'busy' || result.outcome === 'waiting') {
            const delay =
              result.outcome === 'waiting'
                ? (result.retryAfterMs ?? CONCURRENCY_RETRY_DELAY_MS)
                : CONCURRENCY_RETRY_DELAY_MS
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
          await dispatchNext(chainDepth + 1)
        })().catch(() => {
          // The durable queue can be resumed safely by another admin command.
          // eslint-disable-next-line no-console
          console.error(JSON.stringify({ event: 'recipe_enrichment_dispatch_failed' }))
        }),
      )
    }
    return json(200, result)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown'
    // Operational metadata only: status and endpoint name, never response bodies,
    // credentials, recipe content or provider payloads.
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: 'recipe_enrichment_unavailable', reason }))
    return json(503, { error: 'temporarily_unavailable' })
  }
})
