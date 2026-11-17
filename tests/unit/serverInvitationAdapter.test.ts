import { webcrypto } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function load(enabled: boolean) {
  let handler: ((request: Request) => Promise<Response>) | undefined
  const values: Record<string, string> = {
    INVITATION_APP_ORIGIN: 'https://cooksmith.example',
    INVITATION_FROM_EMAIL: 'Cooksmith <invite@example.test>',
    RESEND_API_KEY: 'synthetic-mail-credential',
    SUPABASE_URL: 'https://database.example',
    SUPABASE_ANON_KEY: 'synthetic-public-credential',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-credential',
    HOUSEHOLD_INVITATIONS_ENABLED: String(enabled),
  }
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Deno', {
    env: { get: (name: string) => values[name] },
    serve: (callback: typeof handler) => {
      handler = callback
    },
  })
  await import('../../supabase/functions/send-household-invitation/index')
  return handler!
}
const request = () =>
  new Request('https://edge.example', {
    method: 'POST',
    headers: { authorization: 'Bearer synthetic-caller' },
    body: JSON.stringify({
      action: 'invite',
      householdId: '61000000-0000-4000-8000-000000000001',
      email: 'recipient@example.test',
    }),
  })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})
describe('invitation Edge adapter', () => {
  it('fails closed without enablement before any provider or database request', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const handler = await load(false)
    expect((await handler(request())).status).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('uses caller JWT only for reservation and service credential only for private delivery RPCs, never Auth', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json('62000000-0000-4000-8000-000000000001'))
      .mockResolvedValueOnce(
        Response.json([
          {
            email: 'recipient@example.test',
            inviter_name: 'Alex',
            household_name: 'Synthetic home',
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ id: 'synthetic-provider-id' }))
      .mockResolvedValueOnce(Response.json(null))
    vi.stubGlobal('fetch', fetcher)
    const handler = await load(true)
    expect(await (await handler(request())).json()).toEqual({ status: 'sent' })
    expect(fetcher).toHaveBeenCalledTimes(4)
    const calls = fetcher.mock.calls
    expect(calls.map(([url]) => url)).toEqual([
      'https://database.example/rest/v1/rpc/create_household_invitation',
      'https://database.example/rest/v1/rpc/claim_household_invitation_delivery',
      'https://api.resend.com/emails',
      'https://database.example/rest/v1/rpc/finish_household_invitation_delivery',
    ])
    expect(calls[0]![1].headers.authorization).toBe('Bearer synthetic-caller')
    expect(calls[1]![1].headers.authorization).toBe('Bearer synthetic-server-credential')
    expect(calls[2]![1].headers.authorization).toBe('Bearer synthetic-mail-credential')
    expect(calls[2]![1].headers['idempotency-key']).toContain('household-invitation/')
    expect(JSON.parse(calls[1]![1].body)).toEqual({
      p_attempt_id: '62000000-0000-4000-8000-000000000001',
      p_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })
})
