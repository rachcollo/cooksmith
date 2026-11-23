import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../src/infrastructure/database/generated/database.types'
import { createSupabaseShoppingRepository } from '../../src/infrastructure/shopping/supabaseShoppingRepository'

function adapter() {
  const fetch = vi.fn(
    async () => new Response('null', { headers: { 'Content-Type': 'application/json' } }),
  )
  const client = createClient<Database>('https://synthetic.invalid', 'synthetic-public-key', {
    accessToken: async () => 'synthetic-test-token',
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch },
  })
  return { repository: createSupabaseShoppingRepository(client), fetch }
}

describe('Shopping precision at the persistence adapter', () => {
  it.each([0.004, 0.000000000000000001])('rejects %s g before any write', async (quantity) => {
    const { repository, fetch } = adapter()
    const input = { name: 'Synthetic saffron', quantity, unit: 'g', category: 'pantry' as const }
    await expect(repository.create('synthetic-household', input)).rejects.toThrow(
      /two decimal places/,
    )
    await expect(
      repository.updatePurchase!('synthetic-household', [{ id: 'synthetic-item', ...input }]),
    ).rejects.toThrow(/two decimal places/)
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each(['kg', 'L'])(
    'sends exact smaller units for %s without changing ownership or identity',
    async (unit) => {
      const { repository, fetch } = adapter()
      await repository.updatePurchase!('synthetic-household', [
        {
          id: 'synthetic-item',
          name: 'Synthetic',
          quantity: 0.004,
          unit,
          category: 'pantry',
          combineWithPlan: true,
        },
      ])
      const request = fetch.mock.calls[0] as unknown as [RequestInfo, RequestInit]
      const body = JSON.parse(request[1].body as string)
      expect(body.target_household_id).toBe('synthetic-household')
      expect(body.item_inputs).toEqual([
        expect.objectContaining({
          id: 'synthetic-item',
          quantity: 4,
          unit: unit === 'kg' ? 'g' : 'ml',
          combineWithPlan: true,
        }),
      ])
    },
  )
})
