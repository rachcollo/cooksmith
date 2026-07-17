import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
    mealType: 'dinner',
    title: 'Pasta',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('weekly dinner planner', () => {
  it('renders one calm dinner slot per day and navigates weeks', async () => {
    const listWeek = vi.fn(async () => []) satisfies PlannedMealRepository['listWeek']
    const repository: PlannedMealRepository = {
      listWeek,
      create: async () => meal({ id: 'created' }),
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }

    renderApp('/plan', undefined, undefined, undefined, undefined, undefined, repository)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Seven days. Let’s not overthink it.',
      }),
    ).toBeVisible()
    expect(await screen.findAllByRole('button', { name: 'Add dinner' })).toHaveLength(7)
    expect(screen.queryByText('Nothing planned.')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    await waitFor(() =>
      expect(listWeek).toHaveBeenLastCalledWith(householdId, '2026-07-20', '2026-07-26'),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() =>
      expect(listWeek).toHaveBeenLastCalledWith(householdId, '2026-07-13', '2026-07-19'),
    )
  })

  it('adds, edits, moves and removes dinners', async () => {
    const currentMeals = [meal({ id: 'existing-dinner' })]
    const create = vi.fn(async (_householdId, input) =>
      meal({ id: 'created-dinner', ...input }),
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

    const monday = await screen.findByRole('heading', { name: '13 July' })
    const mondayCard = monday.closest('article')
    expect(mondayCard).not.toBeNull()

    await user.click(within(mondayCard as HTMLElement).getByRole('button', { name: 'Add dinner' }))
    await user.type(screen.getByLabelText('Dinner'), 'Tacos')
    await user.click(screen.getByRole('button', { name: 'Save dinner' }))
    expect(create).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({
        mealDate: '2026-07-13',
        mealType: 'dinner',
        title: 'Tacos',
      }),
    )
    expect(await screen.findByText('Tacos')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Pasta' }))
    await user.clear(screen.getByLabelText('Dinner'))
    await user.type(screen.getByLabelText('Dinner'), 'Updated pasta')
    await user.click(screen.getByRole('button', { name: 'Save dinner' }))
    expect(await screen.findByText('Updated pasta')).toBeVisible()

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Updated pasta' }), {
      altKey: true,
      key: 'ArrowRight',
    })
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        'existing-dinner',
        expect.objectContaining({ mealDate: '2026-07-18', mealType: 'dinner' }),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Remove Updated pasta' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('existing-dinner'))
  })

  it('shows loading and a compact failure message', async () => {
    const repository: PlannedMealRepository = {
      listWeek: async () => {
        throw new Error('offline')
      },
      create: async () => meal({}),
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }

    renderApp('/plan', undefined, undefined, undefined, undefined, undefined, repository)

    expect(
      await screen.findByText('We could not load this week’s dinners. Try refreshing Cooksmith.'),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toBeVisible()
  })
})
