import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { OnboardingContext } from '../../src/app/onboarding/onboardingContext'
import { PlannedMealRepositoryContext } from '../../src/app/meal-plans/plannedMealContext'
import { RecipeRepositoryContext } from '../../src/app/recipes/recipeContext'
import { ShoppingRepositoryContext } from '../../src/app/shopping/shoppingContext'
import { FeatureFlagContext } from '../../src/app/admin/featureFlagContext'
import { PlanPage } from '../../src/routes/PlanPage'
import type { Recipe } from '../../src/domain/recipes/types'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import {
  completedOnboardingRepository,
  defaultRecipeRepository,
  defaultPlannedMealRepository,
  defaultShoppingRepository,
} from '../renderApp'

function setup(
  list = defaultRecipeRepository.list,
  create = vi.fn(defaultPlannedMealRepository.create),
  contribution = vi.fn(async () => undefined),
) {
  const update = vi.fn(defaultPlannedMealRepository.update)
  const recipes = { ...defaultRecipeRepository, list }
  const tree = (householdId: string) => (
    <MemoryRouter>
      <OnboardingContext.Provider
        value={{
          state: { householdId, step: 5, complete: true },
          repository: completedOnboardingRepository,
          refresh: () => completedOnboardingRepository.load('test-user'),
        }}
      >
        <FeatureFlagContext.Provider
          value={{ loading: false, enabled: () => false, refresh: async () => undefined }}
        >
          <PlannedMealRepositoryContext.Provider
            value={{ ...defaultPlannedMealRepository, listWeek: async () => [], create, update }}
          >
            <RecipeRepositoryContext.Provider value={recipes}>
              <ShoppingRepositoryContext.Provider
                value={{ ...defaultShoppingRepository, createFromPlan: contribution }}
              >
                <PlanPage />
              </ShoppingRepositoryContext.Provider>
            </RecipeRepositoryContext.Provider>
          </PlannedMealRepositoryContext.Provider>
        </FeatureFlagContext.Provider>
      </OnboardingContext.Provider>
    </MemoryRouter>
  )
  const view = render(tree('household-a'))
  return { create, update, contribution, switchHousehold: () => view.rerender(tree('household-b')) }
}
async function open() {
  await userEvent.click((await screen.findAllByRole('button', { name: 'Add dinner' }))[0]!)
}

describe('search and manual planner choices', () => {
  it('offers deliberate manual entry when recipe loading fails, with no ingredients', async () => {
    const { create, contribution } = setup(async () => {
      throw new Error('offline')
    })
    await open()
    await userEvent.type(screen.getByRole('combobox'), 'Dinner out')
    expect(screen.getByRole('button', { name: 'Save dinner' })).toBeDisabled()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Save dinner' }))
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledWith(
      'household-a',
      expect.objectContaining({ title: 'Dinner out', recipeId: null }),
    )
    expect(contribution).toHaveBeenCalledWith('household-a', expect.any(String), [])
    expect(await screen.findByText('Manual meal')).toBeVisible()
  })
  it('clears stale household results and the open editor before a late response arrives', async () => {
    let finish!: (value: Recipe[]) => void
    const old = new Promise<Recipe[]>((resolve) => {
      finish = resolve
    })
    const list = vi.fn((householdId: string) =>
      householdId === 'household-a' ? old : Promise.resolve([]),
    )
    const harness = setup(list)
    await open()
    await userEvent.type(screen.getByRole('combobox'), 'Old meal')
    harness.switchHousehold()
    await act(async () => {
      finish(await defaultRecipeRepository.list('household-a'))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await open()
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(screen.queryByRole('option', { name: /Lentil/ })).not.toBeInTheDocument()
    expect(harness.create).not.toHaveBeenCalled()
  })
  it('suppresses duplicate in-flight submits and retries reconciliation without creating another meal', async () => {
    let finish!: (value: PlannedMeal) => void
    const create = vi.fn(
      () =>
        new Promise<PlannedMeal>((resolve) => {
          finish = resolve
        }),
    )
    const contribution = vi
      .fn(async () => undefined)
      .mockRejectedValueOnce(new Error('Shopping unavailable'))
    const harness = setup(defaultRecipeRepository.list, create, contribution)
    await open()
    await userEvent.type(screen.getByRole('combobox'), 'Dinner out')
    await userEvent.keyboard('{Enter}')
    const form = screen.getByRole('button', { name: 'Save dinner' }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(create).toHaveBeenCalledOnce()
    await act(async () => {
      finish(
        await defaultPlannedMealRepository.create('household-a', {
          mealDate: '2026-10-05',
          mealType: 'dinner',
          title: 'Dinner out',
          notes: null,
          recipeId: null,
          recipeSource: null,
        }),
      )
    })
    expect(await screen.findByText('Shopping unavailable')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Save dinner' }))
    await waitFor(() => expect(harness.update).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledOnce()
  })
})
