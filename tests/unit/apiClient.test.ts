import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createApiClient } from '../../src/application/api/apiClient'

const responseSchema = z.object({ householdId: z.string().uuid() })

describe('versioned API client', () => {
  it('calls api-v1 endpoints with JWT and correlation headers', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ householdId: '11111111-1111-4111-8111-111111111111' }),
    )
    const client = createApiClient('https://example.test/', fetcher)

    const result = await client.get('/households/current', responseSchema, {
      accessToken: 'synthetic-token',
      correlationId: 'cs-18-correlation',
    })

    expect(result).toEqual({
      ok: true,
      data: { householdId: '11111111-1111-4111-8111-111111111111' },
      correlationId: 'cs-18-correlation',
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.test/api-v1/households/current',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer synthetic-token',
          'x-correlation-id': 'cs-18-correlation',
        }),
      }),
    )
  })

  it('returns safe standard errors for provider failures', async () => {
    const fetcher = vi.fn(async () => Response.json({ provider: 'do not expose' }, { status: 500 }))
    const client = createApiClient('https://example.test', fetcher)

    const result = await client.post(
      'households/current',
      { name: 'Dinner home' },
      responseSchema,
      {
        accessToken: 'synthetic-token',
        correlationId: 'cs-18-error',
      },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'internal_error',
        message: 'Cooksmith could not complete that request. Please try again.',
        correlationId: 'cs-18-error',
      },
    })
  })
})
