import { describe, expect, it, vi } from 'vitest'

import { fetchWeeklyPreparationHouseholdData } from '../../src/infrastructure/get-ahead/weeklyPreparationHouseholdData'

describe('weekly preparation household data loading', () => {
  it.each([
    'planned_meals?household_id=eq.household-1',
    'household_settings?household_id=eq.household-1',
  ])('loads %s through the caller JWT and RLS boundary', async (path) => {
    const fetcher = vi.fn(async () => new Response('[]', { status: 200 }))

    await expect(
      fetchWeeklyPreparationHouseholdData({
        supabaseUrl: 'https://project.example',
        anonKey: 'public-key',
        authorisation: 'Bearer signed-in-user-jwt',
        path,
        fetcher,
      }),
    ).resolves.toEqual([])

    expect(fetcher).toHaveBeenCalledWith(
      `https://project.example/rest/v1/${path}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'public-key',
          authorization: 'Bearer signed-in-user-jwt',
          'accept-profile': 'cooksmith',
        }),
      }),
    )
  })

  it('fails closed without exposing a protected-table response', async () => {
    const fetcher = vi.fn(async () =>
      Promise.resolve(new Response('permission denied for table planned_meals', { status: 403 })),
    )

    await expect(
      fetchWeeklyPreparationHouseholdData({
        supabaseUrl: 'https://project.example',
        anonKey: 'public-key',
        authorisation: 'Bearer signed-in-user-jwt',
        path: 'planned_meals',
        fetcher,
      }),
    ).rejects.toThrow('household_data_unavailable')
  })
})
