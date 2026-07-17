import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import { renderApp } from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'
function meal(overrides: Partial<PlannedMeal>): PlannedMeal {
  return {
    id: 'meal-1',
    householdId,
    mealDate: '2026-07-17',
    mealType: 'breakfast',
    title: 'Porridge',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('weekly meal planner', () => {
  it('renders seven days, navigates weeks and refreshes when the active household changes', async () => {
    const listWeek = vi.fn(async () => []) satisfies PlannedMealRepository['listWeek']
    const repository: PlannedMealRepository = {
      listWeek,
      create: async () => meal({ id: 'created' }),
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }
    renderApp('/plan', undefined, undefined, undefined, undefined, undefined, repository)
    expect(await screen.findByRole('heading', { level: 1, name: 'Meal Planner' })).toBeVisible()
    await screen.findByText('No planned meals yet')
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .filter((heading) => /July 2026/.test(heading.textContent ?? '')),
    ).toHaveLength(8)
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await waitFor(() =>
      expect(listWeek).toHaveBeenLastCalledWith(householdId, '2026-07-20', '2026-07-26'),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() =>
      expect(listWeek).toHaveBeenLastCalledWith(householdId, '2026-07-13', '2026-07-19'),
    )
  })

  it('adds breakfast, lunch and dinner entries, edits, moves, cancels and removes meals', async () => {
    const currentMeals = [meal({ id: 'existing-dinner', mealType: 'dinner', title: 'Pasta' })]
    const create = vi.fn(async (_householdId, input) =>
      meal({ id: `created-${input.mealType}`, ...input }),
    ) satisfies PlannedMealRepository['create']
    const update = vi.fn(async (id, input) =>
      meal({ id, ...input }),
    ) satisfies PlannedMealRepository['update']
    const remove = vi.fn(async () => undefined) satisfies PlannedMealRepository['remove']
    const repository: PlannedMealRepository = {
      listWeek: async () => currentMeals,
      create,
      update,
      remove,
    }
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp('/plan', undefined, undefined, undefined, undefined, undefined, repository)

    const friday = await screen.findByRole('heading', { name: '17 July 2026' })
    const day = friday.closest('article')
    expect(day).not.toBeNull()
    expect(within(day as HTMLElement).getByText('Today')).toBeVisible()

    for (const [buttonIndex, title] of [
      [0, 'Toast'],
      [1, 'Salad'],
      [2, 'Curry'],
    ] as const) {
      await user.click(
        within(day as HTMLElement).getAllByRole('button', { name: 'Add' })[buttonIndex],
      )
      await user.type(screen.getByLabelText('Meal title'), title)
      await user.click(screen.getByRole('button', { name: 'Save meal' }))
      expect(await screen.findByText(title)).toBeVisible()
    }
    expect(create).toHaveBeenCalledTimes(3)

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await user.clear(screen.getByLabelText('Meal title'))
    await user.type(screen.getByLabelText('Meal title'), 'Updated porridge')
    await user.click(screen.getByRole('button', { name: 'Save meal' }))
    expect(await screen.findByText('Updated porridge')).toBeVisible()

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await user.selectOptions(screen.getByLabelText('Meal type'), 'lunch')
    await user.clear(screen.getByLabelText('Date'))
    await user.type(screen.getByLabelText('Date'), '2026-07-18')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByDisplayValue('2026-07-18')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    await waitFor(() => expect(remove).toHaveBeenCalled())
  })

  it('shows empty, loading and failure states', async () => {
    const repository: PlannedMealRepository = {
      listWeek: async () => [],
      create: async () => meal({}),
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }
    const { unmount } = renderApp(
      '/plan',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
    )
    expect(await screen.findByText('No planned meals yet')).toBeVisible()
    unmount()
    renderApp('/plan', undefined, undefined, undefined, undefined, undefined, {
      ...repository,
      listWeek: async () => {
        throw new Error('offline')
      },
    })
    expect(
      await screen.findByText('We could not load this week’s meal plan. Try refreshing Cooksmith.'),
    ).toBeVisible()
  })
})
