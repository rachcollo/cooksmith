import {
  buildDeterministicRecipeIntelligence,
  validateProviderEnrichment,
  type RecipeIntelligenceSource,
} from '../../../src/domain/recipes/intelligence.ts'
import { resolveAmbiguousLinks } from './openaiAdapter.ts'

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
}

type Version = {
  id: string
  source_kind: Job['source_kind']
  recipe_id: string | null
  imported_recipe_id: string | null
  fingerprint: string
  source_snapshot: {
    ingredients?: RecipeIntelligenceSource['ingredients']
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

function json(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'content-type': 'application/json' },
  })
}

function restHeaders() {
  const key = secretKey()
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
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
  if (!response.ok) throw new Error('database_unavailable')
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

async function dispatchNext() {
  const response = await fetch(`${env('SUPABASE_URL')}/functions/v1/enrich-recipe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-cooksmith-worker-token': env('RECIPE_INTELLIGENCE_WORKER_TOKEN'),
    },
    body: '{}',
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
    `recipe_enrichment_jobs?created_at=gte.${encodeURIComponent(month.toISOString())}&select=created_at,estimated_cost_aud`,
  )
  const rows = (await response.json()) as Array<{
    created_at: string
    estimated_cost_aud: number | null
  }>
  const dailyCount = rows.filter((row) => new Date(row.created_at) >= day).length
  const monthlyCost = rows.reduce((total, row) => total + Number(row.estimated_cost_aud ?? 0), 0)
  return dailyCount < config.daily_recipe_limit && monthlyCost < config.monthly_cost_limit_aud
}

async function claimJob(): Promise<Job | null> {
  const activeResponse = await rest(
    'recipe_enrichment_jobs?state=eq.processing&leased_until=gt.now()&select=id',
  )
  const active = (await activeResponse.json()) as Array<{ id: string }>
  const config = await settings()
  if (active.length >= config.max_concurrency) return null

  const response = await rest(
    'recipe_enrichment_jobs?state=eq.pending&available_at=lte.now()&order=created_at.asc&limit=1&select=id,source_kind,recipe_id,imported_recipe_id,recipe_version_id,attempt_count',
  )
  const jobs = (await response.json()) as Job[]
  const candidate = jobs[0]
  if (!candidate) return null

  const lease = new Date(Date.now() + 60_000).toISOString()
  const claim = await rest(
    `recipe_enrichment_jobs?id=eq.${candidate.id}&state=eq.pending&select=id,source_kind,recipe_id,imported_recipe_id,recipe_version_id,attempt_count`,
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
  return claimed[0] ?? null
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

async function currentVersionMatches(version: Version) {
  const response = await rest(
    version.source_kind === 'household'
      ? `recipe_content_versions?source_kind=eq.household&recipe_id=eq.${version.recipe_id}&order=created_at.desc&limit=1&select=id`
      : `recipe_content_versions?source_kind=eq.shared_platform&imported_recipe_id=eq.${version.imported_recipe_id}&order=created_at.desc&limit=1&select=id`,
  )
  const versions = (await response.json()) as Array<{ id: string }>
  return versions[0]?.id === version.id
}

async function finishJob(
  job: Job,
  state: 'completed' | 'failed' | 'pending',
  values: Record<string, unknown>,
) {
  await rest(`recipe_enrichment_jobs?id=eq.${job.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      state,
      leased_until: null,
      completed_at: state === 'completed' ? new Date().toISOString() : null,
      ...values,
    }),
  })
}

function failureCategory(error: unknown) {
  const value = error instanceof Error ? error.message : 'internal_validation'
  const allowed = new Set([
    'disabled',
    'timeout',
    'usage_limit',
    'transient_provider',
    'permanent_provider',
    'schema_invalid',
    'unsupported_data',
    'stale_version',
    'internal_validation',
  ])
  return allowed.has(value) ? value : 'internal_validation'
}

function estimatedCostAud(inputTokens: number, outputTokens: number) {
  const inputRate = Number(env('OPENAI_INPUT_COST_AUD_PER_MILLION'))
  const outputRate = Number(env('OPENAI_OUTPUT_COST_AUD_PER_MILLION'))
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate))
    throw new Error('internal_validation')
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000
}

async function processOne() {
  const config = await settings()
  if (config.emergency_stop || config.backfill_paused) return { outcome: 'disabled' }
  const job = await claimJob()
  if (!job) return { outcome: 'idle' }
  const startedAt = performance.now()

  try {
    const version = await loadVersion(job)
    const source: RecipeIntelligenceSource = {
      recipeId: version.recipe_id ?? version.imported_recipe_id ?? '',
      recipeFingerprint: version.fingerprint,
      ingredients: version.source_snapshot.ingredients ?? [],
      steps: version.source_snapshot.steps ?? [],
    }
    const deterministic = buildDeterministicRecipeIntelligence(source)
    let result = deterministic
    let provider = 'deterministic'
    let modelKey = 'deterministic'
    let inputTokens = 0
    let outputTokens = 0
    let costAud = 0

    if (config.ai_enabled && deterministic.unresolvedIngredientIds.length > 0) {
      if (!(await withinUsageLimits(config))) throw new Error('usage_limit')
      modelKey = Deno.env.get('RECIPE_INTELLIGENCE_MODEL') ?? 'gpt-5-mini-2025-08-07'
      const assisted = await resolveAmbiguousLinks({
        apiKey: env('OPENAI_API_KEY'),
        model: modelKey,
        source,
        deterministic,
        timeoutMs: 12_000,
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
    await finishJob(job, 'completed', {
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
    })
    return { outcome: retry ? 'retry_scheduled' : 'failed', jobId: job.id, category }
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    if (!(await isAuthorised(request))) return json(401, { error: 'unauthorised' })
    const result = await processOne()
    // Operational metadata only; recipe content, credentials and provider payloads are excluded.
    // eslint-disable-next-line no-console
    console.info(JSON.stringify({ event: 'recipe_enrichment', ...result }))
    if (
      result.outcome === 'completed' ||
      result.outcome === 'failed' ||
      result.outcome === 'retry_scheduled'
    ) {
      EdgeRuntime.waitUntil(
        dispatchNext().catch(() => {
          // The durable queue can be resumed safely by another admin command.
          // eslint-disable-next-line no-console
          console.error(JSON.stringify({ event: 'recipe_enrichment_dispatch_failed' }))
        }),
      )
    }
    return json(200, result)
  } catch {
    return json(503, { error: 'temporarily_unavailable' })
  }
})
