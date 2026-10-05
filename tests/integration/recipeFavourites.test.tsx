import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FeatureFlagContext } from '../../src/app/admin/featureFlagContext'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingContext } from '../../src/app/onboarding/onboardingContext'
import { RecipeRepositoryContext } from '../../src/app/recipes/recipeContext'
import { PlannedMealRepositoryContext } from '../../src/app/meal-plans/plannedMealContext'
import { ShoppingRepositoryContext } from '../../src/app/shopping/shoppingContext'
import { RecipesPage } from '../../src/routes/RecipesPage'
import type { Recipe } from '../../src/domain/recipes/types'
import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
import {
  completedOnboardingRepository,
  defaultPlannedMealRepository,
  defaultShoppingRepository,
  defaultRecipeRepository,
  renderApp,
} from '../renderApp'

describe('household favourites', () => {
  it('updates cards/details immediately, filters with search and restores failed choices', async () => {
    const base = (await defaultRecipeRepository.list('household'))[0]!
    let rows = [
      base,
      { ...base, id: 'shared', name: 'Shared curry', scope: 'public' as const },
      { ...base, id: 'private', name: 'Private soup', scope: 'private' as const },
    ]
    let finish!: (value: boolean) => void
    const save = vi.fn<NonNullable<RecipeRepository['setFavourite']>>(
      (_h, id, _s, desired) =>
        new Promise((resolve) => {
          finish = (value) => {
            rows = rows.map((r) => (r.id === id ? { ...r, favourite: desired } : r))
            resolve(value)
          }
        }),
    )
    const repo = { ...defaultRecipeRepository, list: async () => rows, setFavourite: save }
    renderApp(
      '/recipes',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repo,
    )
    const button = await screen.findByRole('button', { name: 'Favourite Shared curry' })
    await userEvent.click(button)
    expect(screen.getByRole('button', { name: 'Unfavourite Shared curry' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Unfavourite Shared curry' })).toBeDisabled()
    fireEvent.click(button)
    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith(expect.any(String), 'shared', 'imported', true)
    await act(async () => finish(true))
    expect(await screen.findByText('Shared curry saved to household favourites.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Favourite Private soup' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'curry')
    await userEvent.click(screen.getByRole('button', { name: 'Favourites' }))
    expect(screen.getByRole('button', { name: 'Open Shared curry recipe' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Open Lentil soup recipe' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open Shared curry recipe' }))
    const detail = screen.getByRole('dialog', { name: 'Shared curry' })
    save.mockRejectedValueOnce(new Error('offline'))
    await userEvent.click(within(detail).getByRole('button', { name: 'Unfavourite Shared curry' }))
    await waitFor(() =>
      expect(
        within(detail).getByRole('button', { name: 'Unfavourite Shared curry' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    )
    await userEvent.click(within(detail).getByRole('button', { name: 'Close Shared curry' }))
    expect(screen.getByText(/Your previous choice is restored/)).toBeVisible()
    expect(screen.getByRole('searchbox')).toHaveValue('curry')
  })
  it('refreshes another member’s choice on focus and drops inaccessible recipes', async () => {
    const base = (await defaultRecipeRepository.list('household'))[0]!
    let rows = [base]
    const repo = {
      ...defaultRecipeRepository,
      list: vi.fn(async () => rows),
      setFavourite: vi.fn(async () => true),
    }
    renderApp(
      '/recipes',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repo,
    )
    await screen.findByRole('button', { name: 'Favourite Lentil soup' })
    rows = [{ ...base, favourite: true }]
    fireEvent.focus(window)
    expect(await screen.findByRole('button', { name: 'Unfavourite Lentil soup' })).toBeVisible()
    rows = []
    fireEvent.focus(window)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Unfavourite Lentil soup' }),
      ).not.toBeInTheDocument(),
    )
  })
})

it('clears household favourites and ignores a late response after switching households', async () => {
  const base = (await defaultRecipeRepository.list('a'))[0]!
  let finish!: (rows: Recipe[]) => void
  const pending = new Promise<Recipe[]>((resolve) => {
    finish = resolve
  })
  const repository = {
    ...defaultRecipeRepository,
    list: vi.fn((id: string) =>
      id === 'a'
        ? pending
        : Promise.resolve([{ ...base, name: 'New household curry', favourite: false }]),
    ),
    setFavourite: vi.fn(async () => true),
  }
  const tree = (householdId: string) => (
    <MemoryRouter>
      <OnboardingContext.Provider
        value={{
          state: { householdId, step: 5, complete: true },
          repository: completedOnboardingRepository,
          refresh: () => completedOnboardingRepository.load('test-user'),
        }}
      >
        <RecipeRepositoryContext.Provider value={repository}>
          <PlannedMealRepositoryContext.Provider value={defaultPlannedMealRepository}>
            <ShoppingRepositoryContext.Provider value={defaultShoppingRepository}>
              <FeatureFlagContext.Provider
                value={{ loading: false, enabled: () => false, refresh: async () => undefined }}
              >
                <RecipesPage />
              </FeatureFlagContext.Provider>
            </ShoppingRepositoryContext.Provider>
          </PlannedMealRepositoryContext.Provider>
        </RecipeRepositoryContext.Provider>
      </OnboardingContext.Provider>
    </MemoryRouter>
  )
  const view = render(tree('a'))
  view.rerender(tree('b'))
  await screen.findByRole('button', { name: 'Favourite New household curry' })
  await act(async () => finish([{ ...base, favourite: true }]))
  expect(screen.queryByRole('button', { name: 'Unfavourite Lentil soup' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Favourite New household curry' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect(repository.setFavourite).not.toHaveBeenCalled()
})
