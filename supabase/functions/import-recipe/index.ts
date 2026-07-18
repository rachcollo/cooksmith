import { extractRecipe } from './extractor.ts'
import { isBlockedAddress, validatePublicUrl } from './urlSafety.ts'

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void
  resolveDns(hostname: string, recordType: 'A' | 'AAAA'): Promise<string[]>
}

const maxBytes = 1_500_000
const requestCounts = new Map<string, { count: number; startedAt: number }>()

async function actorKey(request: Request) {
  const credential = request.headers.get('authorization') ?? 'anonymous'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential))
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    },
  })
}

async function validateDns(url: URL) {
  const answers = (
    await Promise.allSettled([
      Deno.resolveDns(url.hostname, 'A'),
      Deno.resolveDns(url.hostname, 'AAAA'),
    ])
  ).flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  if (answers.length === 0 || answers.some(isBlockedAddress)) throw new Error('blocked_url')
}

async function fetchPage(initialUrl: URL) {
  let url = initialUrl
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    await validateDns(url)
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'CooksmithRecipeImporter/1.0 (+https://cooksmith.app)' },
      signal: AbortSignal.timeout(8_000),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirect === 3) throw new Error('redirect_limit')
      url = validatePublicUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) throw new Error('unavailable')
    const type = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!type.includes('text/html') && !type.includes('application/xhtml+xml'))
      throw new Error('unsupported')
    const length = Number(response.headers.get('content-length') ?? 0)
    if (length > maxBytes) throw new Error('too_large')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('unavailable')
    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel()
        throw new Error('too_large')
      }
      chunks.push(value)
    }
    const body = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    return { html: new TextDecoder().decode(body), url }
  }
  throw new Error('redirect_limit')
}

Deno.serve(async (request) => {
  const startedAt = performance.now()
  let sourceHostname = 'unresolved'
  if (request.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const actor = await actorKey(request)
  const now = Date.now()
  const current = requestCounts.get(actor)
  const bucket =
    !current || now - current.startedAt > 60_000 ? { count: 0, startedAt: now } : current
  bucket.count += 1
  requestCounts.set(actor, bucket)
  if (bucket.count > 10) return json(429, { error: 'rate_limited' })
  try {
    const body = (await request.json()) as { url?: unknown }
    if (typeof body.url !== 'string') return json(400, { error: 'invalid_url' })
    const requested = validatePublicUrl(body.url)
    sourceHostname = requested.hostname
    const page = await fetchPage(requested)
    const draft = extractRecipe(page.html, requested.toString(), page.url.toString())
    // Edge Function operational log: metadata only; recipe content and credentials are excluded.
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        event: 'recipe_import',
        outcome: 'draft_created',
        hostname: sourceHostname,
        parser: 'schema-org-json-ld',
        durationMs: Math.round(performance.now() - startedAt),
      }),
    )
    return json(200, draft)
  } catch (error) {
    const category = error instanceof Error ? error.message : 'unavailable'
    // Edge Function operational log: metadata only; recipe content and credentials are excluded.
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        event: 'recipe_import',
        outcome: category,
        hostname: sourceHostname,
        durationMs: Math.round(performance.now() - startedAt),
      }),
    )
    const status = category === 'invalid_url' ? 400 : category === 'blocked_url' ? 403 : 422
    return json(status, { error: category })
  }
})
