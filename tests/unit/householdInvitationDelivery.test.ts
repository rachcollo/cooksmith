import { describe, expect, it, vi } from 'vitest'

import { createSupabaseHouseholdPeopleRepository } from '../../src/infrastructure/households/supabaseHouseholdPeopleRepository'
import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'

describe('household invitation delivery', () => {
  it('uses the existing PKCE confirmation callback and Resend-backed Supabase email channel', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }))
    const rpc = vi.fn(() => ({
      single: async () => ({
        data: {
          invitation_id: 'invitation-1',
          invitation_token: 'a'.repeat(64),
          invited_email: 'member@example.test',
          invitation_expires_at: '2026-08-01T00:00:00Z',
        },
        error: null,
      }),
    }))
    const client = {
      auth: { signInWithOtp },
      schema: () => ({ rpc }),
    } as unknown as CooksmithSupabaseClient

    await createSupabaseHouseholdPeopleRepository(client).invite(
      'household-1',
      'member@example.test',
    )

    expect(rpc).toHaveBeenCalledWith('create_household_invitation', {
      p_household_id: 'household-1',
      p_email: 'member@example.test',
    })
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'member@example.test',
      options: {
        emailRedirectTo:
          'http://localhost:3000/auth/confirm?returnTo=%2Finvitations%2Faccept%3Ftoken%3D' +
          'a'.repeat(64),
        shouldCreateUser: true,
      },
    })
  })
})
