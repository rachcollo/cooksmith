import { describe, expect, it, vi } from 'vitest'
import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'
import { createSupabaseWeeklyPreparationAdminRepository } from '../../src/infrastructure/admin/supabaseWeeklyPreparationAdminRepository'

describe('weekly preparation profile repository', () => {
  it('uses only the fixed authorised RPC, without invoking a provider or changing flags', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    const invoke = vi.fn()
    const from = vi.fn()
    const client = {
      schema: () => ({ rpc, from }),
      functions: { invoke },
    } as unknown as CooksmithSupabaseClient
    await createSupabaseWeeklyPreparationAdminRepository(client).configureLunaProfile()
    expect(rpc).toHaveBeenCalledWith('configure_weekly_preparation_luna_profile')
    expect(from).not.toHaveBeenCalled()
    expect(invoke).not.toHaveBeenCalled()
  })
  it('does not expose database error details', async () => {
    const client = {
      schema: () => ({ rpc: async () => ({ error: { message: 'private diagnostics' } }) }),
    } as unknown as CooksmithSupabaseClient
    await expect(
      createSupabaseWeeklyPreparationAdminRepository(client).configureLunaProfile(),
    ).rejects.toThrow('Profile unchanged. Disable both AI features')
  })
  it('reads evidence only for the current model, prompt, corpus, schema and planner', async () => {
    const filters: Record<string, unknown> = {}
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters[key] = value
        return query
      },
      order: () => query,
      limit: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
    }
    const settingsQuery = {
      select: () => settingsQuery,
      eq: () => settingsQuery,
      single: async () => ({
        data: {
          ai_enabled: false,
          emergency_stop: true,
          model_identifier: 'gpt-6-luna',
          prompt_version: 'weekly-preparation-strategy-v13-luna-low-v1',
          corpus_version: 'weekly-preparation-corpus-v13',
          smoke_verified_at: null,
          updated_at: '2026-10-15T00:00:00Z',
        },
        error: null,
      }),
    }
    const client = {
      schema: () => ({
        from: (table: string) => (table === 'weekly_preparation_settings' ? settingsQuery : query),
      }),
    } as unknown as CooksmithSupabaseClient
    expect(
      await createSupabaseWeeklyPreparationAdminRepository(client).getLatestEvaluation(),
    ).toBeNull()
    expect(filters).toEqual({
      model_identifier: 'gpt-6-luna',
      prompt_version: 'weekly-preparation-strategy-v13-luna-low-v1',
      corpus_version: 'weekly-preparation-corpus-v13',
      schema_version: 'weekly-preparation-plan-v2',
      planner_version: 'weekly-preparation-planner-v13',
    })
  })
})
