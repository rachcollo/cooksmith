import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../src/infrastructure/database/generated/database.types'
import { createSupabaseShoppingRepository } from '../../src/infrastructure/shopping/supabaseShoppingRepository'
import { groupPutAwaySources } from '../../src/domain/shopping/putAway'

describe('captured purchase evidence adapter', () => {
  it('retains valid plan evidence beside null manual and malformed envelopes without changing bought amounts', async () => {
    const evidence = {
      name: 'lamb mince (substitute beef)',
      purchaseName: 'lamb mince',
      originalText: '600 g lamb mince (substitute beef)',
    }
    const amounts = [{ quantity: 750, unit: 'g' }]
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(input instanceof Request ? input.url : String(input)).pathname
      let data: unknown
      if (
        path.endsWith('/rpc/shopping_put_away_sources') ||
        path.endsWith('/household_pantry_items')
      )
        data = []
      else if (path.endsWith('/shopping_stock_purchases'))
        data = [
          {
            id: 'synthetic-receipt',
            name: 'lamb mince',
            received_at: null,
            item_ids: ['synthetic-manual', 'synthetic-plan'],
            source_keys: ['m:manual', 'c:plan'],
            revision: 0,
            amounts,
            source_quantities: [
              { plannedMealId: null, sources: null },
              { sources: 'invalid legacy metadata' },
              { plannedMealId: 'synthetic-meal', sources: [evidence, { name: 123 }] },
            ],
          },
        ]
      else if (path.endsWith('/rpc/measured_shopping_sources'))
        data = [
          {
            id: 'synthetic-receipt',
            name: 'lamb mince',
            item_ids: ['synthetic-manual', 'synthetic-plan'],
            snapshot_token: 'synthetic-token',
            amounts,
          },
        ]
      else throw new Error(`Unexpected synthetic request: ${path}`)
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    const client = createClient<Database>('https://synthetic.invalid', 'synthetic-public-key', {
      accessToken: async () => 'synthetic-access-token',
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch },
    })
    const sources =
      await createSupabaseShoppingRepository(client).listPutAway!('synthetic-household')
    expect(sources).toHaveLength(1)
    expect(sources[0]).toMatchObject({
      nameEvidence: [evidence],
      amounts,
      allowLabelQuantity: false,
      hasConsumedStock: false,
    })
    expect(groupPutAwaySources(sources)[0]).toMatchObject({
      name: 'lamb mince',
      quantity: 750,
      unit: 'g',
    })
    expect(fetch).toHaveBeenCalledTimes(4)
  })
})
