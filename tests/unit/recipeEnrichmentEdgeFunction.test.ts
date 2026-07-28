import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/enrich-recipe/index.ts'),
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

  it('keeps PostgREST failures diagnosable without exposing response content', () => {
    expect(source).toContain(
      "throw new Error(`database_unavailable:${response.status}:${path.split('?')[0]}`)",
    )
  })
})
