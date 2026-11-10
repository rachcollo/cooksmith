import { createClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  chooseShoppingPeriod,
  type ShoppingPeriod,
  type ShoppingPreset,
} from '../../src/domain/shopping/period'
import type { Database } from '../../src/infrastructure/database/generated/database.types'
import { createSupabaseShoppingRepository } from '../../src/infrastructure/shopping/supabaseShoppingRepository'

const householdId = '20000000-0000-4000-8000-000000000001'
const today = new Date(2026, 10, 8, 12)
const updatedAt = '2026-11-08T00:00:00Z'

type SavedPeriod = {
  shopping_period_kind: string
  shopping_period_week: string
  shopping_period_from: string
  shopping_period_to: string
}

function fixture() {
  const meal = (id: string, date: string, completed = false) => ({
    id,
    meal_date: date,
    meal_type: 'dinner',
    completed_at: completed ? updatedAt : null,
  })
  const contribution = (mealId: string, quantity: number) => ({
    planned_meal_id: mealId,
    quantity,
    unit: 'g',
    source_quantities: [],
  })
  return {
    settings: null as SavedPeriod | null,
    meals: [
      meal('past', '2026-11-01'),
      meal('current', '2026-11-08'),
      meal('next', '2026-11-09'),
      meal('later', '2026-11-10'),
    ],
    items: [
      {
        id: 'rice',
        household_id: householdId,
        display_name: 'Rice',
        quantity: 1600,
        unit: 'g',
        category: 'pantry',
        completed: false,
        position: 0,
        updated_at: updatedAt,
        manual: false,
        shopping_item_contributions: [
          contribution('past', 1000),
          contribution('current', 300),
          contribution('next', 200),
          contribution('later', 100),
        ],
      },
      {
        id: 'bought',
        household_id: householdId,
        display_name: 'Milk',
        quantity: 1,
        unit: 'l',
        category: 'dairy',
        completed: true,
        position: 1,
        updated_at: updatedAt,
        manual: true,
        shopping_item_contributions: [],
      },
    ],
    pantry: [
      {
        id: 'pantry-rice',
        household_id: householdId,
        name: 'Rice',
        quantity: 200,
        unit: 'g',
        category: 'pantry',
        category_source: 'user',
        storage_location: 'pantry',
        storage_location_source: 'user',
        classification_version: null,
        available: true,
        is_default: false,
        updated_at: updatedAt,
      },
    ],
    purchases: [
      {
        name: 'Rice',
        item_ids: ['purchased-rice'],
        received_at: null as string | null,
        amounts: [{ quantity: 200, unit: 'g' }],
        consumed_amounts: { '0': 50 },
      },
    ],
  }
}

// Exercise the real Supabase client and adapter, replacing only HTTP transport.
// This is not a database/RLS test; no network or hosted credentials are used.
function adapter(state = fixture(), initialDefault: ShoppingPreset = 'nextWeek') {
  let defaultKind = initialDefault
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    const headers = new Headers(init?.headers)
    expect(headers.get(method === 'GET' ? 'accept-profile' : 'content-profile')).toBe('cooksmith')
    if (url.pathname === '/rest/v1/rpc/shopping_stock_snapshot' && method === 'POST') {
      expect(body).toEqual({ p_household_id: householdId })
      return Response.json(state)
    }
    expect(url.searchParams.get('household_id')).toBe(`eq.${householdId}`)
    if (url.pathname === '/rest/v1/household_settings') {
      if (method === 'GET') return Response.json({ shopping_default_period: defaultKind })
      if (method === 'PATCH') {
        defaultKind = (body as { shopping_default_period: ShoppingPreset }).shopping_default_period
        return Response.json({ household_id: householdId })
      }
    }
    if (url.pathname === '/rest/v1/household_shopping_periods' && method === 'POST') {
      expect(body).toMatchObject({ household_id: householdId })
      state.settings = body as SavedPeriod
      return Response.json({ household_id: householdId })
    }
    throw new Error(`Unexpected synthetic request: ${method} ${url.pathname}`)
  })
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch },
  })
  return { repository: createSupabaseShoppingRepository(client), fetch, state }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(today)
})
afterEach(() => vi.useRealTimers())

describe('Supabase shopping period adapter', () => {
  it('loads next week as the household default and round-trips every supported preset', async () => {
    const { repository } = adapter()
    expect(await repository.loadDefault!(householdId)).toBe('nextWeek')
    expect(await repository.loadPeriod!(householdId)).toMatchObject({
      choice: 'default',
      defaultKind: 'nextWeek',
      notice: null,
      period: { kind: 'nextWeek', weekStart: '2026-11-09', from: '2026-11-09', to: '2026-11-15' },
    })
    for (const preset of ['week', 'next3', 'next5', 'nextWeek'] as const) {
      await repository.saveDefault!(householdId, preset)
      expect(await repository.loadDefault!(householdId)).toBe(preset)
      expect((await repository.loadPeriod!(householdId)).period.kind).toBe(preset)
    }
  })

  it('persists future custom dates through reload and default changes without changing purchases', async () => {
    const { repository, state } = adapter()
    const items = structuredClone(state.items)
    const purchases = structuredClone(state.purchases)
    const period: ShoppingPeriod = {
      kind: 'custom',
      weekStart: '2026-11-16',
      from: '2026-11-18',
      to: '2026-11-20',
    }
    await repository.savePeriod!(householdId, period)
    await repository.saveDefault!(householdId, 'week')
    expect(await repository.loadPeriod!(householdId)).toMatchObject({
      period,
      choice: 'custom',
      notice: null,
    })
    vi.setSystemTime(new Date(2026, 10, 17, 12))
    expect(await repository.loadPeriod!(householdId)).toMatchObject({
      period,
      choice: 'custom',
      notice: null,
    })
    expect(state.items).toEqual(items)
    expect(state.purchases).toEqual(purchases)
    expect((await repository.loadPeriod!(householdId)).items).toContainEqual(
      expect.objectContaining({ id: 'bought', completed: true, quantity: 1 }),
    )
    await repository.savePeriod!(householdId, chooseShoppingPeriod('default'))
    expect(await repository.loadPeriod!(householdId)).toMatchObject({
      choice: 'default',
      period: { kind: 'week' },
    })
  })

  it.each(['pantry', 'bought', 'combined'] as const)(
    'reserves %s stock for current-week meals before next week without allocating twice',
    async (source) => {
      const state = fixture()
      if (source === 'pantry') {
        state.pantry[0]!.quantity = 350
        state.purchases = []
      }
      if (source === 'bought') {
        state.pantry = []
        state.purchases[0]!.amounts[0]!.quantity = 400
      }
      const { repository } = adapter(state)
      // 350 g usable stock covers the outstanding 300 g this week, then only
      // 50 g of next week's 300 g. The previous week's 1000 g is not reserved.
      const next = await repository.loadPeriod!(householdId)
      expect(next.items.find((item) => item.id === 'rice')?.quantity).toBe(250)
      await repository.savePeriod!(householdId, chooseShoppingPeriod('week'))
      expect(
        (await repository.loadPeriod!(householdId)).items.some((item) => item.id === 'rice'),
      ).toBe(false)
      await repository.savePeriod!(householdId, chooseShoppingPeriod('nextWeek'))
      expect(
        (await repository.loadPeriod!(householdId)).items.find((item) => item.id === 'rice')
          ?.quantity,
      ).toBe(250)
      // A narrower future range cannot reuse the 50 g already reserved for Monday.
      await repository.savePeriod!(householdId, {
        kind: 'custom',
        weekStart: '2026-11-09',
        from: '2026-11-10',
        to: '2026-11-10',
      })
      expect(
        (await repository.loadPeriod!(householdId)).items.find((item) => item.id === 'rice')
          ?.quantity,
      ).toBe(100)
    },
  )

  it('does not reserve stock for completed meals or count put-away purchases twice', async () => {
    const state = fixture()
    state.meals.find((meal) => meal.id === 'current')!.completed_at = updatedAt
    state.pantry[0]!.quantity = 200
    state.purchases[0]!.received_at = updatedAt
    const { repository } = adapter(state)
    expect(
      (await repository.loadPeriod!(householdId)).items.find((item) => item.id === 'rice')
        ?.quantity,
    ).toBe(100)
  })

  it('rejects an invalid cross-week range before sending any write', async () => {
    const { repository, fetch } = adapter()
    await expect(
      repository.savePeriod!(householdId, {
        kind: 'custom',
        weekStart: '2026-11-09',
        from: '2026-11-14',
        to: '2026-11-16',
      }),
    ).rejects.toThrow('Choose a valid range within one Monday-to-Sunday week.')
    expect(fetch).not.toHaveBeenCalled()
  })
})
