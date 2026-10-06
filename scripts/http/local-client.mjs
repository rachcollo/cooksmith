import { createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

// Only synthetic seeded local databases are supported. Never accept a hosted endpoint.
const config = process.env.COOKSMITH_LOCAL_REST_URL
  ? {
      API_URL: process.env.COOKSMITH_LOCAL_REST_URL,
      JWT_SECRET: process.env.COOKSMITH_LOCAL_JWT_SECRET,
    }
  : JSON.parse(
      execFileSync('node_modules/.bin/supabase', ['status', '--output', 'json'], {
        encoding: 'utf8',
      }),
    )
const url = new URL(config.API_URL)
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  throw new Error('HTTP regression tests require a local database.')
if (!config.JWT_SECRET) throw new Error('Local JWT secret is required.')
export const householdId = '20000000-0000-4000-8000-000000000001'
export function localSupabaseClient(member = 1) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'authenticated', sub: `10000000-0000-4000-8000-${String(member).padStart(12, '0')}`, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}`
  const token = `${payload}.${createHmac('sha256', config.JWT_SECRET).update(payload).digest('base64url')}`
  return createClient(url.origin, config.ANON_KEY || token, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(
          process.env.COOKSMITH_LOCAL_REST_URL ? String(input).replace('/rest/v1', '') : input,
          { ...init, signal: AbortSignal.timeout(4000) },
        ),
    },
  })
}
export async function must(query) {
  const result = await query
  if (result.error)
    throw new Error(`${result.status}: ${result.error.code} ${result.error.message}`)
  return result.data
}

export function localClient(member = 1) {
  return localSupabaseClient(member).schema('cooksmith')
}
