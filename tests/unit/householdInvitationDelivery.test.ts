import { describe, expect, it, vi } from 'vitest'
import { createSupabaseHouseholdPeopleRepository } from '../../src/infrastructure/households/supabaseHouseholdPeopleRepository'
import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'

describe('household invitation delivery', () => {
  it('delegates invite and resend to the server without Auth calls or token RPCs', async () => {
    const invoke = vi.fn(async () => ({ data: { status: 'sent' }, error: null }))
    const signInWithOtp = vi.fn()
    const rpc = vi.fn()
    const repository = createSupabaseHouseholdPeopleRepository({
      functions: { invoke },
      auth: { signInWithOtp },
      schema: () => ({ rpc }),
    } as unknown as CooksmithSupabaseClient)
    await repository.invite('household-1', 'member@example.test')
    await repository.resend('invitation-1')
    expect(invoke).toHaveBeenNthCalledWith(1, 'send-household-invitation', {
      body: { action: 'invite', householdId: 'household-1', email: 'member@example.test' },
    })
    expect(invoke).toHaveBeenNthCalledWith(2, 'send-household-invitation', {
      body: { action: 'resend', invitationId: 'invitation-1' },
    })
    expect(signInWithOtp).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
  it('shows safe retry guidance without exposing provider errors', async () => {
    const invoke = vi.fn(async () => ({ data: null, error: new Error('private-provider-token') }))
    const repository = createSupabaseHouseholdPeopleRepository({
      functions: { invoke },
      schema: () => ({}),
    } as unknown as CooksmithSupabaseClient)
    await expect(repository.resend('invitation-1')).rejects.toThrow(
      'Only the newest link will work',
    )
  })
})
