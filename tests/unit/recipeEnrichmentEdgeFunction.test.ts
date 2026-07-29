import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

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
    expect(source).toContain("job.model_key === 'provider-assisted-v1'")
  })

  it('uses JSON mode with Cooksmith validation and safe provider diagnostics', () => {
    expect(adapterSource).toContain("type: 'json_object'")
    expect(adapterSource).not.toContain("type: 'json_schema'")
    expect(adapterSource).not.toContain('strict: true')
    expect(adapterSource).toContain('parsed.ingredients.length !== ingredientIds.length')
    expect(adapterSource).toContain('parsed.ingredients.every(isSuggestion)')
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

  it('supports a single-job canary without dispatching the rest of the queue', () => {
    expect(source).toContain("body.dispatchMode === 'single' ? 'single' : 'chain'")
    expect(source).toContain("dispatchMode === 'chain'")
    expect(source).toContain("body.modelKey === 'provider-assisted-v1'")
    expect(source).toContain('claimJob(modelKey)')
  })
})
