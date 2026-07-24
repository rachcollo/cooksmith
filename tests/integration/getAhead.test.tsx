import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
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
  it('keeps per-item rows simple and only shows total time saved in the summary', async () => {
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
    expect(within(task).getByText('10 min estimate')).toBeVisible()
    expect(within(task).queryByText(/saves \d+ min later/u)).not.toBeInTheDocument()
    expect(within(task).queryByText(/minutes later/u)).not.toBeInTheDocument()
  })
})
