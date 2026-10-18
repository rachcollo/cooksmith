import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDeterministicRecipeIntelligence } from '../../src/domain/recipes/intelligence'

const assisted = vi.hoisted(() => vi.fn())
vi.mock('../../supabase/functions/enrich-recipe/openaiAdapter.ts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resolveAmbiguousLinks: assisted,
}))
let handler: (request: Request) => Promise<Response>
let admin: boolean
let claimed: boolean
let providerFailure: boolean
let stale: boolean
const jobId = '98000000-0000-4000-8000-000000000030'
const requests: { url: string; init?: RequestInit }[] = []
const waitUntil = vi.fn()
beforeEach(async () => {
  vi.resetModules()
  requests.length = 0
  admin = true
  claimed = false
  providerFailure = false
  stale = false
  waitUntil.mockClear()
  assisted.mockReset()
  assisted.mockImplementation(async ({ source }) => {
    if (providerFailure) throw new Error('schema_invalid')
    return {
      result: buildDeterministicRecipeIntelligence(source),
      inputTokens: 100,
      outputTokens: 50,
    }
  })
  vi.stubGlobal('Deno', {
    env: {
      get: (name: string) =>
        name === 'SUPABASE_SECRET_KEYS'
          ? undefined
          : name === 'SUPABASE_URL'
            ? 'https://project.example'
            : name.includes('COST')
              ? '1'
              : 'test-only',
    },
    serve: (callback: typeof handler) => {
      handler = callback
    },
  })
  vi.stubGlobal('EdgeRuntime', { waitUntil })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({ url, init })
      const u = new URL(url)
      if (u.pathname.endsWith('/has_application_role')) return Response.json(admin)
      if (u.pathname.endsWith('/admin_recipe_repair_claim')) {
        if (!admin) return Response.json({}, { status: 403 })
        if (claimed) return Response.json(null)
        claimed = true
        return Response.json({
          id: jobId,
          source_kind: 'shared_platform',
          recipe_id: null,
          imported_recipe_id: 'source-1',
          recipe_version_id: 'version-1',
          attempt_count: 1,
          model_key: 'admin-repair:request-1',
        })
      }
      if (u.pathname.endsWith('/recipe_intelligence_settings'))
        return Response.json([{ ai_enabled: true, emergency_stop: false, backfill_paused: false }])
      if (u.pathname.endsWith('/recipe_content_versions'))
        return Response.json(
          u.searchParams.has('id')
            ? [
                {
                  id: 'version-1',
                  source_kind: 'shared_platform',
                  recipe_id: null,
                  imported_recipe_id: 'source-1',
                  fingerprint: 'fingerprint',
                  source_snapshot: { ingredients: [], steps: [] },
                },
              ]
            : [{ id: stale ? 'new-version' : 'version-1' }],
        )
      if (u.pathname.endsWith('/activate_recipe_enrichment')) return Response.json('enrichment-1')
      if (u.pathname.endsWith('/recipe_enrichment_jobs') && init?.method === 'PATCH')
        return Response.json([])
      throw new Error('Unexpected worker request')
    }),
  )
  await import('../../supabase/functions/enrich-recipe/index')
})
afterEach(() => vi.unstubAllGlobals())
function run(headers: Record<string, string> = { authorization: 'Bearer test-admin' }) {
  return handler(
    new Request('https://project.example/functions/v1/enrich-recipe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ repairJobId: jobId, dispatchMode: 'chain' }),
    }),
  )
}
describe('targeted repair worker execution', () => {
  it('processes only its claimed job, records cost and never chains', async () => {
    expect((await run()).status).toBe(200)
    expect(assisted).toHaveBeenCalledTimes(1)
    expect(waitUntil).not.toHaveBeenCalled()
    expect(requests.some((r) => r.url.includes('order=created_at.asc'))).toBe(false)
    const telemetry = requests.find((r) => r.url.includes('state=eq.completed'))
    expect(JSON.parse(String(telemetry?.init?.body)).estimated_cost_aud).toBe(0.00015)
    expect(
      requests.find((r) => r.url.includes('/admin_recipe_repair_claim'))?.init?.headers,
    ).toMatchObject({ authorization: 'Bearer test-admin' })
  })
  it('a duplicate dispatch does not invoke the provider again', async () => {
    await run()
    expect(await (await run()).json()).toEqual({ outcome: 'already_attempted' })
    expect(assisted).toHaveBeenCalledTimes(1)
  })
  it('does not retry failed validation or pretend the unknown cost was zero', async () => {
    providerFailure = true
    expect(await (await run()).json()).toMatchObject({
      outcome: 'failed',
      category: 'schema_invalid',
    })
    const patch = requests.find((r) => r.init?.method === 'PATCH')
    expect(JSON.parse(String(patch?.init?.body))).toMatchObject({
      state: 'failed',
      estimated_cost_aud: null,
    })
    expect(waitUntil).not.toHaveBeenCalled()
  })
  it('rejects a worker token without an administrator session', async () => {
    expect((await run({ 'x-cooksmith-worker-token': 'test-only' })).status).toBe(401)
    expect(assisted).not.toHaveBeenCalled()
  })
  it('rejects an ordinary member even alongside a worker token', async () => {
    admin = false
    expect(
      (await run({ authorization: 'Bearer member', 'x-cooksmith-worker-token': 'test-only' }))
        .status,
    ).toBe(409)
    expect(assisted).not.toHaveBeenCalled()
  })
  it('does not spend on a stale source version', async () => {
    stale = true
    expect(await (await run()).json()).toMatchObject({
      outcome: 'failed',
      category: 'stale_version',
    })
    expect(assisted).not.toHaveBeenCalled()
    expect(
      JSON.parse(String(requests.find((r) => r.init?.method === 'PATCH')?.init?.body))
        .estimated_cost_aud,
    ).toBe(0)
  })
})
