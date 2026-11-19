import { invitationHandler, InvitationError } from './handler.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Promise<Response>): void
}

const origin = Deno.env.get('INVITATION_APP_ORIGIN') ?? ''
const from = Deno.env.get('INVITATION_FROM_EMAIL') ?? ''
const key = Deno.env.get('RESEND_API_KEY') ?? ''
const url = Deno.env.get('SUPABASE_URL') ?? ''
const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function rpc(
  name: string,
  args: object,
  authorization: string,
  apiKey: string,
): Promise<unknown> {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      authorization,
      apikey: apiKey,
      'content-type': 'application/json',
      'content-profile': 'cooksmith',
      'accept-profile': 'cooksmith',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (data.code === 'P0001') throw new InvitationError(429, 'rate_limited')
    if (data.code === '42501' || response.status === 401 || response.status === 403)
      throw new InvitationError(403, 'not_allowed')
    throw new InvitationError(400, 'invitation_unavailable')
  }
  return response.status === 204 ? null : response.json()
}
const privileged = (name: string, args: object) => rpc(name, args, `Bearer ${service}`, service)

const handler = invitationHandler({
  origin,
  async reserve(authorization, input) {
    const result =
      'householdId' in input
        ? await rpc(
            'create_household_invitation',
            { p_household_id: input.householdId, p_email: input.email },
            authorization,
            anon,
          )
        : await rpc(
            'resend_household_invitation',
            { p_invitation_id: input.invitationId },
            authorization,
            anon,
          )
    if (typeof result !== 'string') throw new Error('invalid_reservation')
    return result
  },
  async claim(attemptId, tokenHash) {
    const result = await privileged('claim_household_invitation_delivery', {
      p_attempt_id: attemptId,
      p_token_hash: tokenHash,
    })
    if (!Array.isArray(result) || result.length !== 1) throw new Error('invalid_claim')
    const row = result[0]
    if (
      typeof row.email !== 'string' ||
      typeof row.inviter_name !== 'string' ||
      typeof row.household_name !== 'string'
    )
      throw new Error('invalid_claim')
    return { email: row.email, inviter_name: row.inviter_name, household_name: row.household_name }
  },
  async finish(attemptId, sent) {
    await privileged('finish_household_invitation_delivery', {
      p_attempt_id: attemptId,
      p_sent: sent,
    })
  },
  async send(message, attemptId) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'idempotency-key': `household-invitation/${attemptId}`,
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error('delivery_failed')
  },
})

Deno.serve(async (request) => {
  // No reservation, email or Auth write when configuration/release enablement is absent.
  let validOrigin = false
  try {
    const parsed = new URL(origin)
    validOrigin = parsed.protocol === 'https:' && parsed.origin === origin
  } catch {
    /* Fail closed below. */
  }
  if (
    Deno.env.get('HOUSEHOLD_INVITATIONS_ENABLED') !== 'true' ||
    !validOrigin ||
    !from ||
    !key ||
    !url ||
    !anon ||
    !service
  ) {
    return new Response(JSON.stringify({ error: 'delivery_unavailable' }), {
      status: 503,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'access-control-allow-origin': validOrigin ? origin : 'null',
      },
    })
  }
  return handler(request)
})
