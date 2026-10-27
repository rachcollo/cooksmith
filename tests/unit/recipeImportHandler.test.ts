import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let handler: (request: Request) => Promise<Response>
const log = vi.fn()
const url = 'https://recipes.example/soup'
const html = readFileSync('tests/fixtures/recipe-import/cannings-layout.html', 'utf8')

beforeEach(async () => {
  vi.resetModules()
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Deno', {
    serve: (callback: typeof handler) => {
      handler = callback
    },
    resolveDns: vi.fn(async () => ['8.8.8.8']),
  })
  log.mockClear()
  vi.spyOn(console, 'info').mockImplementation(log)
  await import('../../supabase/functions/import-recipe/index')
})
afterEach(() => vi.unstubAllGlobals())
const request = (source = url) =>
  new Request('https://local.example/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: source }),
  })

describe('recipe import handler', () => {
  it('returns a review draft from HTML using only the bounded page fetch', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(html, { headers: { 'content-type': 'text/html' } }),
    )
    vi.stubGlobal('fetch', fetch)
    const response = await handler(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      name: 'Slow cooked vegetables',
      ingredients: '1 onion, sliced\n2 cups broth\nSalt & pepper',
      sourceUrl: url,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(fetch.mock.calls[0]?.[0])).toBe(url)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"parser":"labelled-html"'))
  })
  it.each([
    ['application/json', html, 'unsupported_content_type'],
    ['text/html', '<h1>Article</h1><p>No recipe.</p>', 'recipe_not_found'],
    ['text/html', '<h1>Soup</h1><h2>Ingredients</h2><p>Onion</p>', 'incomplete_recipe'],
  ])('distinguishes %s rejection: %s', async (type, body, error) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { headers: { 'content-type': type } })),
    )
    const response = await handler(request())
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error })
  })
  it('preserves URL and redirect safety', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }),
    )
    vi.stubGlobal('fetch', fetch)
    const response = await handler(request())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'blocked_url' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
