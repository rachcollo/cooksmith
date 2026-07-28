import { describe, expect, it, vi } from 'vitest'

import type { CooksmithSupabaseClient } from '../../src/infrastructure/auth/supabaseAuthClient'
import { createSupabaseWeeklyPreparationAdminRepository } from '../../src/infrastructure/admin/supabaseWeeklyPreparationAdminRepository'

const status = {
  paused: false,
  aiEnabled: false,
  monthlyCostLimitAud: 10,
  sources: {
    household: { eligible: 2, current: 0 },
    sharedPlatform: { eligible: 19, current: 0 },
  },
  states: { pending: 21 },
}

function clientWith(rpc: ReturnType<typeof vi.fn>, invoke: ReturnType<typeof vi.fn>) {
  return {
    schema: () => ({ rpc }),
    functions: { invoke },
  } as unknown as CooksmithSupabaseClient
}

describe('recipe enrichment dispatcher', () => {
  it.each(['start', 'resume', 'retry_failed', 'reprocess_ai'] as const)(
    'starts the protected worker after the %s command',
    async (command) => {
      const rpc = vi.fn(async () => ({ data: { status }, error: null }))
      const invoke = vi.fn(async () => ({ data: { outcome: 'completed' }, error: null }))

      const result = await createSupabaseWeeklyPreparationAdminRepository(
        clientWith(rpc, invoke),
      ).commandRecipeEnrichment(command)

      expect(rpc).toHaveBeenCalledWith('recipe_enrichment_backfill_command', {
        command,
        batch_limit: 25,
      })
      expect(invoke).toHaveBeenCalledWith('enrich-recipe', { body: {} })
      expect(result).toEqual(status)
    },
  )

  it('pauses without dispatching another worker', async () => {
    const rpc = vi.fn(async () => ({
      data: { status: { ...status, paused: true } },
      error: null,
    }))
    const invoke = vi.fn()

    await createSupabaseWeeklyPreparationAdminRepository(
      clientWith(rpc, invoke),
    ).commandRecipeEnrichment('pause')

    expect(invoke).not.toHaveBeenCalled()
  })

  it('updates Recipe Intelligence AI through the audited admin RPC', async () => {
    const rpc = vi.fn(async () => ({ data: { ...status, aiEnabled: true }, error: null }))
    const invoke = vi.fn()

    const result = await createSupabaseWeeklyPreparationAdminRepository(
      clientWith(rpc, invoke),
    ).setRecipeIntelligenceAi(true)

    expect(rpc).toHaveBeenCalledWith('recipe_intelligence_ai_command', {
      command: 'enable_ai',
    })
    expect(result.aiEnabled).toBe(true)
    expect(invoke).not.toHaveBeenCalled()
  })
})
