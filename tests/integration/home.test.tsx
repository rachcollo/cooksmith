import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { HomePage } from '../../src/routes/HomePage'
import { AuthContext, type AuthContextValue } from '../../src/app/auth/authContext'
import { OnboardingContext } from '../../src/app/onboarding/onboardingContext'
import { PlannedMealRepositoryContext } from '../../src/app/meal-plans/plannedMealContext'
import { ShoppingRepositoryContext } from '../../src/app/shopping/shoppingContext'
import { WeeklyPreparationRepositoryContext } from '../../src/app/get-ahead/weeklyPreparationContext'
import {
  authenticatedTestAuthState,
  completedOnboardingRepository,
  defaultPlannedMealRepository,
  defaultShoppingRepository,
  defaultFeatureFlagRepository,
  renderApp,
} from '../renderApp'
import { toLocalIsoDate } from '../../src/domain/meal-plans/week'
import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'
const auth = { ...authenticatedTestAuthState } as AuthContextValue
const prep = {
  getCurrentPlan: vi.fn(async (): Promise<never> => {
    throw new Error('Home must not generate preparation')
  }),
}
function tree(
  householdId: string,
  planner: PlannedMealRepository,
  shopping = defaultShoppingRepository,
) {
  return (
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <OnboardingContext.Provider
          value={{
            repository: completedOnboardingRepository,
            state: { householdId, step: 5, complete: true },
            refresh: async () => ({ householdId, step: 5, complete: true }),
          }}
        >
          <PlannedMealRepositoryContext.Provider value={planner}>
            <ShoppingRepositoryContext.Provider value={shopping}>
              <WeeklyPreparationRepositoryContext.Provider value={prep}>
                <HomePage />
              </WeeklyPreparationRepositoryContext.Provider>
            </ShoppingRepositoryContext.Provider>
          </PlannedMealRepositoryContext.Provider>
        </OnboardingContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
async function meal(name = 'Lentil soup'): Promise<PlannedMeal> {
  return {
    ...(await defaultPlannedMealRepository.create('household', {
      title: name,
      mealDate: toLocalIsoDate(new Date()),
      mealType: 'dinner',
      notes: null,
      recipeId: 'recipe',
      recipeSource: 'household',
    })),
    recipeState: { kind: 'active', recipe: { id: 'recipe', name, archivedAt: null } },
  }
}
it('offers useful first actions without preview noise or preparation generation', async () => {
  render(tree('new', { ...defaultPlannedMealRepository, listWeek: async () => [] }))
  await screen.findByText('Choose your first meal to get the week started.')
  expect(screen.getByRole('link', { name: 'Find a recipe' })).toHaveAttribute('href', '/recipes')
  expect(screen.getByRole('link', { name: 'Plan a meal' })).toHaveAttribute('href', '/plan')
  expect(screen.queryByRole('link', { name: 'Review preparation' })).not.toBeInTheDocument()
  expect(screen.queryByText(/foundation|About this preview/)).not.toBeInTheDocument()
  expect(prep.getCurrentPlan).not.toHaveBeenCalled()
})
it('shows current meals and grouped bought progress without generating a checklist', async () => {
  const next = await meal()
  const item = await defaultShoppingRepository.create('household', {
    name: 'Milk',
    quantity: 1,
    unit: 'L',
    category: 'dairy_and_eggs',
  })
  render(
    tree(
      'household',
      { ...defaultPlannedMealRepository, listWeek: async () => [next] },
      {
        ...defaultShoppingRepository,
        list: async () => [
          { ...item, id: 'a', completed: true, manual: false },
          { ...item, id: 'b', completed: true, manual: false },
        ],
      },
    ),
  )
  await screen.findByText('Lentil soup')
  expect(screen.getByText('1 of 1 purchases bought · across all dates.')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Review preparation' })).toHaveAttribute(
    'href',
    '/get-ahead',
  )
  expect(prep.getCurrentPlan).not.toHaveBeenCalled()
})
it('keeps a working plan usable when shopping fails and retries safely', async () => {
  const next = await meal()
  const list = vi
    .fn<ShoppingRepository['list']>()
    .mockRejectedValueOnce(new Error('internal details'))
    .mockResolvedValue([])
  render(
    tree(
      'household',
      { ...defaultPlannedMealRepository, listWeek: async () => [next] },
      { ...defaultShoppingRepository, list },
    ),
  )
  await screen.findByText('Shopping progress couldn’t load')
  expect(screen.getByText('Lentil soup')).toBeVisible()
  expect(screen.queryByText('internal details')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('Your list is empty. Plan a recipe or add what you need.')
})
it('clears household data immediately and ignores an old late response after switching', async () => {
  let resolveOld!: (meals: PlannedMeal[]) => void
  const pending = new Promise<PlannedMeal[]>((resolve) => {
    resolveOld = resolve
  })
  const planner = {
    ...defaultPlannedMealRepository,
    listWeek: async (h: string) => (h === 'old' ? pending : []),
  }
  const view = render(tree('old', planner))
  await screen.findByText('Loading your household overview')
  view.rerender(tree('new', planner))
  await screen.findByText('Choose your first meal to get the week started.')
  await act(async () => resolveOld([await meal('Old private dinner')]))
  expect(screen.queryByText('Old private dinner')).not.toBeInTheDocument()
})
it('hides preparation for manual meals and already-prepared freezer stock', async () => {
  const linked = await meal()
  render(
    tree('household', {
      ...defaultPlannedMealRepository,
      listWeek: async () => [
        { ...linked, freezerMealId: 'stock' } as PlannedMeal,
        { ...linked, id: 'manual', recipeId: null, recipeState: { kind: 'free-text' } },
      ],
    }),
  )
  await screen.findByText('2 meals planned this week.')
  expect(screen.queryByRole('link', { name: 'Review preparation' })).not.toBeInTheDocument()
})
it('shows Admin only after a trusted permission response and supports account-menu navigation', async () => {
  let resolve!: (allowed: boolean) => void
  const pending = new Promise<boolean>((r) => {
    resolve = r
  })
  renderApp(
    '/',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    { ...defaultFeatureFlagRepository, isAdmin: () => pending },
  )
  await screen.findByRole('heading', { name: 'Dinner decisions, made lighter.' })
  expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  await act(async () => resolve(true))
  await screen.findByRole('link', { name: 'Admin' })
  await userEvent.click(screen.getByRole('button', { name: 'Open account menu' }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Admin' }))
  await screen.findByRole('heading', { name: 'Feature toggles' })
})
it('fails closed for permission errors including direct Admin routes', async () => {
  renderApp(
    '/admin',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      ...defaultFeatureFlagRepository,
      isAdmin: async () => {
        throw new Error('offline')
      },
    },
  )
  await screen.findByText('We couldn’t verify access')
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument())
  expect(screen.queryByRole('heading', { name: 'Feature toggles' })).not.toBeInTheDocument()
})

it('does not reuse administrator access when the signed-in identity changes', async () => {
  const { useApplicationAdmin } = await import('../../src/app/admin/useApplicationAdmin')
  const { FeatureFlagRepositoryContext } = await import('../../src/app/admin/featureFlagContext')
  let resolveSecond!: (allowed: boolean) => void
  const second = new Promise<boolean>((resolve) => {
    resolveSecond = resolve
  })
  const repository = {
    ...defaultFeatureFlagRepository,
    isAdmin: vi.fn().mockResolvedValueOnce(true).mockReturnValueOnce(second),
  }
  function Access() {
    return <p>{useApplicationAdmin()}</p>
  }
  function accessTree(id: string) {
    return (
      <AuthContext.Provider value={{ ...auth, user: { ...auth.user!, id } }}>
        <FeatureFlagRepositoryContext.Provider value={repository}>
          <Access />
        </FeatureFlagRepositoryContext.Provider>
      </AuthContext.Provider>
    )
  }
  const view = render(accessTree('admin-one'))
  await screen.findByText('allowed')
  view.rerender(accessTree('member-two'))
  expect(screen.queryByText('allowed')).not.toBeInTheDocument()
  expect(screen.getByText('loading')).toBeVisible()
  await act(async () => resolveSecond(false))
  await screen.findByText('denied')
})
