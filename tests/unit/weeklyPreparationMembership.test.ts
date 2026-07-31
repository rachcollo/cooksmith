import { describe, expect, it, vi } from 'vitest'

import { verifyActiveHouseholdMember } from '../../src/infrastructure/get-ahead/weeklyPreparationMembership'

describe('weekly preparation household membership verification', () => {
  it('uses the caller JWT and Cooksmith RPC contract without a service credential', async () => {
    const fetcher = vi.fn(async () => new Response('true', { status: 200 }))

    await expect(
      verifyActiveHouseholdMember({
        supabaseUrl: 'https://project.example',
        anonKey: 'public-key',
        authorisation: 'Bearer signed-in-user-jwt',
        householdId: '10000000-0000-4000-8000-000000000001',
        fetcher,
      }),
    ).resolves.toBe(true)

    expect(fetcher).toHaveBeenCalledWith(
      'https://project.example/rest/v1/rpc/is_active_household_member',
      expect.objectContaining({
        method: 'POST',
        headers: {
          apikey: 'public-key',
          authorization: 'Bearer signed-in-user-jwt',
          'accept-profile': 'cooksmith',
          'content-profile': 'cooksmith',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          target_household_id: '10000000-0000-4000-8000-000000000001',
        }),
      }),
    )
  })

  it('denies inactive or unrelated callers without loading privileged data', async () => {
    const fetcher = vi.fn(async () => new Response('false', { status: 200 }))

    await expect(
      verifyActiveHouseholdMember({
        supabaseUrl: 'https://project.example',
        anonKey: 'public-key',
        authorisation: 'Bearer unrelated-user-jwt',
        householdId: '20000000-0000-4000-8000-000000000002',
        fetcher,
      }),
    ).resolves.toBe(false)
  })

  it('classifies an unavailable permission boundary without leaking its response', async () => {
    const fetcher = vi.fn(async () =>
      Promise.resolve(new Response('sensitive database detail', { status: 403 })),
    )

    await expect(
      verifyActiveHouseholdMember({
        supabaseUrl: 'https://project.example',
        anonKey: 'public-key',
        authorisation: 'Bearer signed-in-user-jwt',
        householdId: '10000000-0000-4000-8000-000000000001',
        fetcher,
      }),
    ).rejects.toThrow('membership_verification_unavailable')
  })
})
