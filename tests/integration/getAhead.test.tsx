import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
import type { WeeklyPreparationRepository } from '../../src/application/get-ahead/weeklyPreparationRepository'
import { currentWeek } from '../../src/domain/meal-plans/week'
import {
  authenticatedTestClient,
  authenticatedTestAuthState,
  completedOnboardingRepository,
  defaultPantryRepository,
  defaultShoppingRepository,
  ownerHouseholdPeopleRepository,
  renderApp,
} from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'
const recipe = {
  id: 'recipe-get-ahead',
  householdId,
  name: 'Simple pasta',
  ingredients: '1 onion, diced',
  description: null,
  sourceNote: null,
  sourceUrl: null,
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  imageUrl: null,
  notes: null,
  category: null,
  tags: [],
  favourite: false,
  ingredientRows: [
    {
      id: 'ingredient-onion',
      name: 'Onion',
      quantity: '1',
      unit: null,
      preparation: 'diced',
      originalLineText: '1 onion, diced',
      parserVersion: 'recipe-content-v1',
      derivationStatus: 'derived',
      position: 1,
    },
  ],
  steps: [],
  archivedAt: null,
  createdAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
}

const plannedMealRepository: PlannedMealRepository = {
  listWeek: async () => [
    {
      id: 'meal-get-ahead',
      householdId,
      mealDate: currentWeek(new Date()),
      mealType: 'dinner',
      title: 'Simple pasta',
      notes: null,
      recipeId: recipe.id,
      recipeSource: 'household',
      linkedRecipe: { id: recipe.id, name: recipe.name, archivedAt: null },
      recipeState: {
        kind: 'active',
        recipe: { id: recipe.id, name: recipe.name, archivedAt: null },
      },
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
    },
  ],
  create: async () => {
    throw new Error('not used by this test')
  },
  update: async () => {
    throw new Error('not used by this test')
  },
  remove: async () => undefined,
}

const recipeRepository: RecipeRepository = {
  list: async () => [recipe],
  create: async () => {
    throw new Error('not used by this test')
  },
  update: async () => {
    throw new Error('not used by this test')
  },
  archive: async () => {
    throw new Error('not used by this test')
  },
}

describe('Get Ahead page', () => {
  beforeEach(() => localStorage.clear())

  it('clears the temporary fallback banner after a successful retry', async () => {
    const user = userEvent.setup()
    let calls = 0
    const weeklyPreparationRepository: WeeklyPreparationRepository = {
      getCurrentPlan: async () => {
        calls += 1
        if (calls === 1) throw new Error('temporarily unavailable')
        return {
          schemaVersion: 'weekly-preparation-plan-v2',
          plannerVersion: 'weekly-preparation-planner-v5',
          householdId,
          planId: `${currentWeek(new Date())}_${currentWeek(new Date())}`,
          cacheKey: 'successful-retry',
          tasks: [],
          ambiguousCandidateIds: [],
          generation: 'model-assisted',
          fallbackReason: null,
        }
      },
    }
    renderApp(
      '/get-ahead',
      { appEnvironment: 'test', buildCommit: 'test-build' },
      authenticatedTestClient,
      completedOnboardingRepository,
      ownerHouseholdPeopleRepository,
      defaultPantryRepository,
      plannedMealRepository,
      authenticatedTestAuthState,
      recipeRepository,
      defaultShoppingRepository,
      undefined,
      weeklyPreparationRepository,
    )

    expect(await screen.findByText(/temporary fallback/u)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('AI-assisted plan')).toBeVisible()
    expect(screen.queryByText(/temporary fallback/u)).not.toBeInTheDocument()
  })

  it('keeps prep rows compact and strikes through completed checklist items', async () => {
    const user = userEvent.setup()
    renderApp(
      '/get-ahead',
      { appEnvironment: 'test', buildCommit: 'test-build' },
      authenticatedTestClient,
      completedOnboardingRepository,
      ownerHouseholdPeopleRepository,
      defaultPantryRepository,
      plannedMealRepository,
      authenticatedTestAuthState,
      recipeRepository,
      defaultShoppingRepository,
    )

    await user.click(await screen.findByRole('button', { name: 'Start' }))

    expect(await screen.findByText(/minutes saved this week/u)).toBeVisible()
    const instruction = await screen.findByText('Diced')
    const task = instruction.closest('li')
    if (!task) throw new Error('Expected the Get Ahead instruction to render inside a task row.')
    expect(within(task).queryByText('10 min estimate')).not.toBeInTheDocument()
    expect(within(task).queryByText(/Saves \d+ min later/u)).not.toBeInTheDocument()
    expect(within(task).queryByText(/For .+ on/u)).not.toBeInTheDocument()
    expect(within(task).queryByText(/More actions/u)).not.toBeInTheDocument()
    expect(within(task).queryByText(/explicitly describes/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/Recommended because/u)).not.toBeInTheDocument()

    const checkbox = within(task).getByRole('checkbox')
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(task).toHaveClass('task-row-completed')

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('shows the preparation period and replans a resumable session for more time', async () => {
    const user = userEvent.setup()
    renderApp(
      '/get-ahead',
      { appEnvironment: 'test', buildCommit: 'test-build' },
      authenticatedTestClient,
      completedOnboardingRepository,
      ownerHouseholdPeopleRepository,
      defaultPantryRepository,
      plannedMealRepository,
      authenticatedTestAuthState,
      recipeRepository,
      defaultShoppingRepository,
    )

    expect(await screen.findByLabelText('Which meals are you preparing for?')).toHaveValue(
      'next-weekdays',
    )
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByText(/30 minutes available/u)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'End early' }))
    await user.selectOptions(screen.getByLabelText('Preset duration'), '45')
    await user.click(screen.getByRole('button', { name: 'Update plan' }))

    expect(await screen.findByText(/45 minutes available/u)).toBeVisible()
    expect(screen.getByRole('button', { name: 'End early' })).toBeVisible()
  })
})
