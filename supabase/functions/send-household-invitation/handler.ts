interface Delivery {
  email: string
  inviter_name: string
  household_name: string
}
export interface InvitationServices {
  reserve(
    authorization: string,
    input: { householdId: string; email: string } | { invitationId: string },
  ): Promise<string>
  claim(attemptId: string, tokenHash: string): Promise<Delivery>
  finish(attemptId: string, sent: boolean): Promise<void>
  send(
    message: { to: string; subject: string; html: string; text: string },
    attemptId: string,
  ): Promise<void>
  origin: string
}
export class InvitationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code)
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

export function invitationMessage(delivery: Delivery, link: string) {
  const intro = `${delivery.inviter_name} has invited you to join ${delivery.household_name} on Cooksmith.`
  const details =
    'Accept the invitation to share your household’s cooking plan. No account has been created for you. Sign in with the invited email address, or choose to create and verify an account. This link expires in seven days. If you were not expecting it, you can ignore this email.'
  return {
    to: delivery.email,
    subject: 'You’re invited to a Cooksmith household',
    text: `${intro}\n\n${details}\n\nReview and accept invitation: ${link}`,
    html: `<!doctype html><html lang="en"><body><h1>You’re invited to Cooksmith</h1><p>${escapeHtml(intro)}</p><p>${escapeHtml(details)}</p><p><a href="${escapeHtml(link)}">Review and accept invitation</a></p></body></html>`,
  }
}

export function invitationHandler(services: InvitationServices) {
  return async (request: Request): Promise<Response> => {
    const headers = {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': services.origin,
      'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
      'access-control-allow-methods': 'POST, OPTIONS',
      vary: 'Origin',
    }
    const reply = (status: number, body: object) =>
      new Response(JSON.stringify(body), { status, headers })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' })
    if (request.headers.get('origin') && request.headers.get('origin') !== services.origin)
      return reply(403, { error: 'not_allowed' })
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer '))
      return reply(401, { error: 'authentication_required' })
    try {
      const raw = await request.text()
      if (raw.length > 1024) return reply(400, { error: 'invalid_request' })
      const input: unknown = JSON.parse(raw)
      if (!input || typeof input !== 'object') return reply(400, { error: 'invalid_request' })
      const body = input as Record<string, unknown>
      let command: { householdId: string; email: string } | { invitationId: string }
      if (
        body.action === 'invite' &&
        typeof body.householdId === 'string' &&
        uuid.test(body.householdId) &&
        typeof body.email === 'string' &&
        body.email.trim().length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
      ) {
        command = { householdId: body.householdId, email: body.email.trim().toLowerCase() }
      } else if (
        body.action === 'resend' &&
        typeof body.invitationId === 'string' &&
        uuid.test(body.invitationId)
      ) {
        command = { invitationId: body.invitationId }
      } else return reply(400, { error: 'invalid_request' })
      // Caller JWT drives the database owner check; the privileged claim never takes a caller ID.
      const attemptId = await services.reserve(authorization, command)
      const token = hex(crypto.getRandomValues(new Uint8Array(32)))
      const tokenHash = hex(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))),
      )
      const delivery = await services.claim(attemptId, tokenHash)
      const link = new URL('/invitations/accept', services.origin)
      link.searchParams.set('token', token)
      try {
        await services.send(invitationMessage(delivery, link.toString()), attemptId)
      } catch {
        await services.finish(attemptId, false)
        return reply(502, { error: 'delivery_failed' })
      }
      await services.finish(attemptId, true)
      return reply(200, { status: 'sent' })
    } catch (error) {
      // Provider payloads, credentials, recipient data and tokens never enter logs or responses.
      if (error instanceof InvitationError) return reply(error.status, { error: error.code })
      if (error instanceof SyntaxError) return reply(400, { error: 'invalid_request' })
      return reply(503, { error: 'delivery_unavailable' })
    }
  }
}
