import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import { addDays } from '../../src/domain/meal-plans/week'
import {
  completedOnboardingRepository,
  defaultPlannedMealRepository,
  defaultShoppingRepository,
  renderApp,
} from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'

function setup(dates: string[] = [], timezone = 'Australia/Melbourne') {
  vi.useFakeTimers({ toFake: ['Date'] })
  // Thursday morning in Melbourne, still Wednesday in UTC and Los Angeles.
  vi.setSystemTime(new Date('2026-11-18T14:30:00Z'))
  const meals = dates.map((mealDate, index) => ({
    id: `existing-${index}`,
    mealDate,
  })) as PlannedMeal[]
  const listWeek = vi.fn(async () => meals)
  const create = vi.fn(defaultPlannedMealRepository.create)
  const update = vi.fn(defaultPlannedMealRepository.update)
  const createFromPlan = vi.fn(async () => undefined)
  renderApp(
    '/recipes',
    undefined,
    undefined,
    {
      ...completedOnboardingRepository,
      load: async () => ({
        ...(await completedOnboardingRepository.load('test-user')),
        profile: { displayName: 'Test cook', timezone, locale: 'en-AU', step: 5 },
      }),
    },
    undefined,
    undefined,
    { ...defaultPlannedMealRepository, listWeek, create, update },
    undefined,
    undefined,
    { ...defaultShoppingRepository, createFromPlan },
  )
  return { listWeek, create, update, createFromPlan }
}

const buttonName = 'Add Lentil soup to next available date'
afterEach(() => vi.useRealTimers())

describe('recipe quick-add from today', () => {
  it('ignores empty past days and visibly announces today in the profile timezone', async () => {
    const { listWeek, create, createFromPlan } = setup()
    const button = await screen.findByRole('button', { name: buttonName })
    button.focus()
    await userEvent.keyboard('{Enter}')
    const confirmation = await screen.findByText('Lentil soup added to 19 November 2026.')
    expect(confirmation).toBeVisible()
    expect(confirmation).toHaveAttribute('role', 'status')
    expect(confirmation).toHaveAttribute('aria-live', 'polite')
    expect(listWeek).toHaveBeenCalledWith(householdId, '2026-11-19', '2026-12-30')
    expect(create).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({ mealDate: '2026-11-19' }),
    )
    expect(createFromPlan).toHaveBeenCalledTimes(1)
  })

  it('continues into the next week without replacing existing meals', async () => {
    const { create, update } = setup(
      Array.from({ length: 4 }, (_, offset) => addDays('2026-11-19', offset)),
    )
    await userEvent.click(await screen.findByRole('button', { name: buttonName }))
    expect(await screen.findByText('Lentil soup added to 23 November 2026.')).toBeVisible()
    expect(create).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({ mealDate: '2026-11-23' }),
    )
    expect(update).not.toHaveBeenCalled()
  })

  it('uses the previous calendar date for a profile west of UTC', async () => {
    const { create } = setup([], 'America/Los_Angeles')
    await userEvent.click(await screen.findByRole('button', { name: buttonName }))
    expect(await screen.findByText('Lentil soup added to 18 November 2026.')).toBeVisible()
    expect(create).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({ mealDate: '2026-11-18' }),
    )
  })

  it('does not submit twice while checking availability', async () => {
    const { listWeek, create } = setup()
    let resolve!: (meals: PlannedMeal[]) => void
    listWeek.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const button = await screen.findByRole('button', { name: buttonName })
    await userEvent.dblClick(button)
    expect(button).toBeDisabled()
    expect(listWeek).toHaveBeenCalledTimes(1)
    resolve([])
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(button).toBeEnabled())
  })

  it('reports a full search window without overwriting a meal', async () => {
    const { create } = setup(
      Array.from({ length: 42 }, (_, offset) => addDays('2026-11-19', offset)),
    )
    await userEvent.click(await screen.findByRole('button', { name: buttonName }))
    expect(
      await screen.findByText(/We could not find an empty date before 30 December 2026/),
    ).toBeVisible()
    expect(create).not.toHaveBeenCalled()
  })
})
