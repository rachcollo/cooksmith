import { webcrypto } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import {
  invitationHandler,
  invitationMessage,
  InvitationError,
  type InvitationServices,
} from '../../supabase/functions/send-household-invitation/handler'
const id = '61000000-0000-4000-8000-000000000001'
const input = { action: 'invite', householdId: id, email: 'recipient@example.test' }
function setup() {
  const services: InvitationServices = {
    origin: 'https://cooksmith.example',
    reserve: vi.fn(async () => id),
    claim: vi.fn(async () => ({
      email: input.email,
      inviter_name: 'Alex <script>',
      household_name: 'Test & home',
    })),
    send: vi.fn(async () => undefined),
    finish: vi.fn(async () => undefined),
  }
  return { services, handler: invitationHandler(services) }
}
const request = (body: object = input, auth = 'Bearer synthetic-jwt') =>
  new Request('https://edge.example', {
    method: 'POST',
    headers: { authorization: auth },
    body: JSON.stringify(body),
  })
describe('server invitation handler', () => {
  beforeAll(() => vi.stubGlobal('crypto', webcrypto))
  afterAll(() => vi.unstubAllGlobals())
  it('sends dedicated escaped email and exposes neither raw token nor email to the inviter', async () => {
    const { services, handler } = setup()
    const response = await handler(request())
    expect(await response.json()).toEqual({ status: 'sent' })
    expect(services.reserve).toHaveBeenCalledWith('Bearer synthetic-jwt', {
      householdId: id,
      email: input.email,
    })
    const [message] = vi.mocked(services.send).mock.calls[0]!
    expect(message.html).toContain('Alex &lt;script&gt; has invited you to join Test &amp; home')
    expect(message.text).toContain('No account has been created')
    const token = new URL(
      message.text.split('Review and accept invitation: ')[1]!,
    ).searchParams.get('token')!
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(services.claim).toHaveBeenCalledWith(id, expect.stringMatching(/^[a-f0-9]{64}$/))
    expect(vi.mocked(services.claim).mock.calls[0]![1]).not.toBe(token)
    expect(services.finish).toHaveBeenCalledWith(id, true)
  })
  it('handles resend using the same reservation and rate-limit boundary', async () => {
    const { services, handler } = setup()
    await handler(request({ action: 'resend', invitationId: id }))
    expect(services.reserve).toHaveBeenCalledWith('Bearer synthetic-jwt', { invitationId: id })
  })
  it.each([
    ['GET', 405],
    ['HEAD', 405],
    ['OPTIONS', 204],
  ])('does not write or send for link previews using %s', async (method, status) => {
    const { services, handler } = setup()
    expect((await handler(new Request('https://edge.example', { method }))).status).toBe(status)
    expect(services.reserve).not.toHaveBeenCalled()
    expect(services.send).not.toHaveBeenCalled()
  })
  it('rejects anonymous, malformed and untrusted-origin requests before reservation', async () => {
    const { services, handler } = setup()
    expect((await handler(request(input, ''))).status).toBe(401)
    expect((await handler(request({ action: 'invite' }))).status).toBe(400)
    const foreign = request()
    foreign.headers.set('origin', 'https://attacker.example')
    expect((await handler(foreign)).status).toBe(403)
    expect(services.reserve).not.toHaveBeenCalled()
  })
  it.each([
    [403, 'not_allowed'],
    [429, 'rate_limited'],
  ])('does not deliver after authoritative rejection %s', async (status, code) => {
    const { services, handler } = setup()
    vi.mocked(services.reserve).mockRejectedValue(new InvitationError(Number(status), String(code)))
    expect((await handler(request())).status).toBe(status)
    expect(services.claim).not.toHaveBeenCalled()
    expect(services.send).not.toHaveBeenCalled()
  })
  it('records failure without exposing provider payloads and allows a new bounded retry', async () => {
    const { services, handler } = setup()
    vi.mocked(services.send).mockRejectedValueOnce(new Error('credential and recipient details'))
    expect(await (await handler(request())).json()).toEqual({ error: 'delivery_failed' })
    expect(services.finish).toHaveBeenCalledWith(id, false)
    expect((await handler(request())).status).toBe(200)
    expect(vi.mocked(services.claim).mock.calls[0]![1]).not.toBe(
      vi.mocked(services.claim).mock.calls[1]![1],
    )
  })
  it('does not turn an uncertain finalisation into confirmed success', async () => {
    const { services, handler } = setup()
    vi.mocked(services.finish).mockRejectedValue(new Error('private payload'))
    expect(await (await handler(request())).json()).toEqual({ error: 'delivery_unavailable' })
  })
  it('includes a plain text alternative and no tracking resources', () => {
    const message = invitationMessage(
      { email: input.email, inviter_name: 'Alex', household_name: 'Home' },
      'https://cooksmith.example/invitations/accept?token=synthetic',
    )
    expect(message.html).not.toContain('<img')
    expect(message.text).toContain('Alex has invited you to join Home')
  })
})
