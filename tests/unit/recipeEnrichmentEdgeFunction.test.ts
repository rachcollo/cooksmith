import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  compactRecipeSource,
  normaliseProviderOutput,
} from '../../src/domain/recipes/providerEnrichment'
import type {
  ProviderIngredientSuggestion,
  ProviderPreparationOpportunity,
  RecipeIntelligenceSource,
} from '../../src/domain/recipes/intelligence'

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/enrich-recipe/index.ts'),
  'utf8',
)
const adapterSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/enrich-recipe/openaiAdapter.ts'),
  'utf8',
)

describe('recipe enrichment Edge Function', () => {
  it('uses the Supabase secret key only as the PostgREST API key', () => {
    const restHeaders = source.match(
      /function restHeaders\(\) \{(?<body>[\s\S]*?)\n\}\n\nfunction userRestHeaders/,
    )?.groups?.body

    expect(restHeaders).toContain('apikey: secretKey()')
    expect(restHeaders).not.toContain('authorization')
  })

  it('keeps the caller bearer token for application-admin authorisation', () => {
    const userRestHeaders = source.match(
      /function userRestHeaders\(authorization: string\) \{(?<body>[\s\S]*?)\n\}\n\nasync function rest/,
    )?.groups?.body

    expect(userRestHeaders).toContain('authorization,')
  })

  it('normalises stored shared-recipe snapshots before enrichment', () => {
    expect(source).toContain('ingredient.name ?? ingredient.ingredient_name')
    expect(source).toContain('ingredient.originalText ?? ingredient.original_line_text')
    expect(source).toContain('ingredient.quantityText ?? ingredient.quantity_text')
  })

  it('keeps validation failures categorised for operations', () => {
    expect(source).toContain("'source_mismatch'")
    expect(source).toContain("'unsupported_reference'")
  })

  it('keeps PostgREST failures diagnosable without exposing response content', () => {
    expect(source).toContain(
      "throw new Error(`database_unavailable:${response.status}:${path.split('?')[0]}`)",
    )
  })

  it('applies provider usage limits only to provider-assisted jobs', () => {
    expect(source).toContain('model_key=neq.deterministic')
    expect(source).toContain('provider_started_at=gte.')
    expect(source).toContain('provider_started_at: providerStartedAt')
    expect(source).not.toContain('model_key=neq.deterministic&created_at=gte.')
    expect(source).toContain("candidate.model_key !== 'deterministic'")
    expect(source).toContain("return { job: null, outcome: 'limited' }")
    expect(source).toContain("return { outcome: 'usage_limited' }")
    expect(source).not.toContain("throw new Error('usage_limit')")
    expect(source).toContain("job.model_key === 'provider-assisted-v1'")
    expect(source).toContain("job.model_key === 'provider-assisted-v2'")
  })

  it('uses a strict Responses API schema with Cooksmith validation and safe diagnostics', () => {
    expect(adapterSource).toContain("type: 'json_schema'")
    expect(adapterSource).toContain("name: 'recipe_ingredient_intelligence'")
    expect(adapterSource).toContain('strict: true')
    expect(adapterSource).not.toContain("type: 'json_object'")
    expect(adapterSource).toContain("required: ['ingredients', 'preparationOpportunities']")
    expect(adapterSource).toContain('additionalProperties: false')
    expect(adapterSource).toContain("sourceIngredientId: { type: 'string', enum: ingredientIds }")
    expect(adapterSource).toContain("? { type: 'string', enum: stepIds }")
    expect(adapterSource).toContain('parsed.ingredients.length !== ingredientIds.length')
    expect(adapterSource).toContain('parsed.ingredients.every(isSuggestion)')
    expect(adapterSource).toContain('parsed.preparationOpportunities.every(isOpportunity)')
    expect(adapterSource).toContain('storageGuidance')
    expect(adapterSource).toContain('stoppingPoint')
    expect(adapterSource).not.toContain('uniqueItems')
    expect(adapterSource).not.toContain('minItems')
    expect(adapterSource).not.toContain('maxItems')
    expect(adapterSource).toContain('throw new ProviderRequestError(')
    expect(adapterSource).toContain("' is not permitted")
    expect(source).toContain('error instanceof ProviderRequestError')
    expect(source).toContain('providerStatus:')
    expect(source).toContain('? error.status : undefined')
    expect(source).toContain('providerCode:')
    expect(source).toContain('? error.providerCode : undefined')
    expect(source).toContain('provider_http_status: error.status')
    expect(source).toContain('provider_error_code: error.providerCode')
    expect(source).toContain('provider_error_param: error.providerParam')
    expect(source).toContain('provider_request_id: error.requestId')
    expect(adapterSource).toContain("response.headers.get('x-request-id')")
    expect(adapterSource).toContain('body.error?.param')
  })

  it('allows realistic provider latency and classifies an aborted request as a timeout', () => {
    const providerTimeout = Number(
      source
        .match(/const PROVIDER_TIMEOUT_MS = (?<value>[\d_]+)/)
        ?.groups?.value.replaceAll('_', ''),
    )
    const jobLease = Number(
      source.match(/const JOB_LEASE_MS = (?<value>[\d_]+)/)?.groups?.value.replaceAll('_', ''),
    )

    expect(providerTimeout).toBe(105_000)
    expect(jobLease).toBeGreaterThan(providerTimeout)
    expect(source).toContain('timeoutMs: PROVIDER_TIMEOUT_MS')
    expect(source).toContain('Date.now() + JOB_LEASE_MS')
    expect(adapterSource).toContain("error.name === 'TimeoutError'")
    expect(adapterSource).toContain("error.name === 'AbortError'")
    expect(adapterSource).toContain("throw new Error('timeout')")
    expect(source).toContain("'timeout'")
  })

  it('compacts verbose recipes without dropping source identifiers', () => {
    const sourceRecipe: RecipeIntelligenceSource = {
      recipeId: 'recipe-1',
      recipeFingerprint: 'fingerprint',
      ingredients: [
        {
          id: 'ingredient-1',
          name: 'chicken',
          originalText: `  500 g   chicken ${'with a long note '.repeat(30)}`,
          quantityText: '500',
          unit: 'g',
          preparation: null,
        },
      ],
      steps: [{ id: 'step-1', instruction: `Mix   well. ${'Continue mixing. '.repeat(80)}` }],
    }

    const compacted = compactRecipeSource(sourceRecipe)

    expect(compacted.ingredients[0]?.id).toBe('ingredient-1')
    expect(compacted.ingredients[0]?.text.length).toBeLessThanOrEqual(240)
    expect(compacted.ingredients[0]?.text).not.toContain('  ')
    expect(compacted.steps[0]?.id).toBe('step-1')
    expect(compacted.steps[0]?.instruction.length).toBeLessThanOrEqual(600)
  })

  it('normalises harmless provider variations but preserves source references for validation', () => {
    const ingredient = {
      sourceIngredientId: 'ingredient-1',
      canonicalName: 'chicken',
      aliases: ['chicken', 'chicken'],
      modifiers: ['boneless', 'boneless'],
      quantity: {
        state: 'known',
        original: '500 g',
        normalisedValue: 500,
        normalisedMaximum: 500,
        unit: 'g',
        dimension: 'mass',
      },
      action: 'slice',
      preparationDetail: 'sliced',
      sourceStepIds: ['step-1', 'step-1'],
      confidence: 'high',
    } satisfies ProviderIngredientSuggestion
    const opportunity = {
      opportunityId: 'prep-chicken',
      title: '  Slice the chicken  ',
      canonicalIngredient: ' chicken ',
      action: 'slice',
      preparationDetail: ' Slice evenly ',
      sourceIngredientIds: ['ingredient-1', 'ingredient-1'],
      sourceStepIds: ['step-1', 'step-1'],
      estimatedMinutes: 2,
      estimatedTimeSavedMinutes: -1,
      maximumLeadTimeHours: 0,
      boundaries: ['raw-protein', 'raw-protein'],
      confidence: 'high',
    } satisfies ProviderPreparationOpportunity

    const normalised = normaliseProviderOutput({
      ingredients: [ingredient],
      preparationOpportunities: [opportunity, opportunity],
    })

    expect(normalised.ingredients[0]?.aliases).toEqual(['chicken'])
    expect(normalised.ingredients[0]?.sourceStepIds).toEqual(['step-1'])
    expect(normalised.preparationOpportunities[0]).toMatchObject({
      opportunityId: 'prep-chicken',
      title: 'Slice the chicken',
      estimatedMinutes: 3,
      estimatedTimeSavedMinutes: 0,
      maximumLeadTimeHours: 1,
      sourceIngredientIds: ['ingredient-1'],
      sourceStepIds: ['step-1'],
      boundaries: ['raw-protein'],
    })
    expect(normalised.preparationOpportunities[1]?.opportunityId).toBe('prep-chicken-2')

    const unknownReference = normaliseProviderOutput({
      ingredients: [ingredient],
      preparationOpportunities: [{ ...opportunity, sourceIngredientIds: ['unknown-ingredient'] }],
    })
    expect(unknownReference.preparationOpportunities[0]?.sourceIngredientIds).toEqual([
      'unknown-ingredient',
    ])
  })

  it('supports a single-job canary without dispatching the rest of the queue', () => {
    expect(source).toContain("body.dispatchMode === 'single' ? 'single' : 'chain'")
    expect(source).toContain("dispatchMode === 'chain'")
    expect(source).toContain("body.modelKey === 'provider-assisted-v1'")
    expect(source).toContain('claimJob(modelKey)')
  })

  it('makes activation/completion atomic and keeps telemetry best-effort', () => {
    expect(source).toContain("await rest('rpc/activate_recipe_enrichment'")
    expect(source).not.toContain("finishJob(job, 'completed'")
    expect(source).toContain('recordUsageTelemetry(job')
    expect(source).toContain('Usage telemetry is')
    expect(source).toContain('best-effort')
  })

  it('checks version freshness before and after provider token use', () => {
    const providerBranch = source.slice(source.indexOf("job.model_key === 'provider-assisted-v1'"))
    const preflight = providerBranch.indexOf('currentVersionMatches(version)')
    const provider = providerBranch.indexOf('resolveAmbiguousLinks')
    const finalCheck = providerBranch.indexOf('currentVersionMatches(version)', preflight + 1)
    expect(preflight).toBeGreaterThanOrEqual(0)
    expect(preflight).toBeLessThan(provider)
    expect(finalCheck).toBeGreaterThan(provider)
  })

  it('drains a bounded queue across failures and temporary concurrency', () => {
    expect(source).toContain('const MAX_CHAIN_DEPTH = 100')
    expect(source).toContain("outcome: 'busy'")
    expect(source).toContain("result.outcome === 'failed'")
    expect(source).toContain("result.outcome === 'busy'")
    expect(source).toContain("result.outcome === 'waiting'")
    expect(source).toContain('available_at.asc')
    expect(source).toContain('result.retryAfterMs')
    expect(source).toContain('chainDepth < MAX_CHAIN_DEPTH')
    expect(source).toContain('dispatchNext(chainDepth + 1)')
    expect(source).toContain('CONCURRENCY_RETRY_DELAY_MS')
  })

  it('authenticates chained worker calls at the Supabase gateway', () => {
    const dispatch = source.match(
      /async function dispatchNext\(chainDepth: number\) \{(?<body>[\s\S]*?)\n\}/,
    )?.groups?.body

    expect(dispatch).toContain('apikey: secretKey()')
    expect(dispatch).toContain(
      "'x-cooksmith-worker-token': env('RECIPE_INTELLIGENCE_WORKER_TOKEN')",
    )
  })
})
