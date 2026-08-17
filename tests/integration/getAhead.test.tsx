import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
import {
  WeeklyPreparationUnavailableError,
  type WeeklyPreparationRepository,
} from '../../src/application/get-ahead/weeklyPreparationRepository'
import { currentWeek } from '../../src/domain/meal-plans/week'
import { periodForPreset } from '../../src/domain/get-ahead/preparationPeriod'
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

const usefulWeeklyPreparationRepository: WeeklyPreparationRepository = {
  getCurrentPlan: async ({ weekStart, weekEnd }) => ({
    schemaVersion: 'weekly-preparation-plan-v2',
    plannerVersion: 'weekly-preparation-planner-v13',
    householdId,
    planId: `${weekStart}_${weekEnd}`,
    cacheKey: 'useful-ai-plan',
    generation: 'model-assisted',
    fallbackReason: null,
    ambiguousCandidateIds: [],
    tasks: [
      {
        id: 'task-onion',
        title: 'Dice onion',
        canonicalCategory: 'onion',
        decision: 'separate',
        reasonCode: 'compatible',
        confidence: 'high',
        validation: 'validated',
        storageGuidance: 'Refrigerate in a covered container until ready to use.',
        subtasks: [
          {
            id: 'subtask-onion',
            title: 'Dice onion',
            canonicalAction: 'dice',
            preparationDetail: 'diced',
            quantity: { state: 'known', value: 1, unit: null },
            sources: [
              {
                id: 'candidate-onion',
                plannedMealId: 'meal-get-ahead',
                recipeId: recipe.id,
                recipeVersionId: 'recipe-version-onion',
                sourceIngredientId: 'ingredient-onion',
                sourceStepIds: [],
                originalText: '1 onion, diced',
                ingredientLines: ['1 onion'],
                instructionSteps: ['Peel and dice the onion.'],
                stoppingPoint: 'The onion is diced.',
                finishingGuidance: 'Add to the pasta sauce on the night.',
              },
            ],
          },
        ],
      },
    ],
  }),
}

describe('Get Ahead page', () => {
  beforeEach(() => localStorage.clear())

  it('discards an obsolete saved session and rebuilds Get Ahead without crashing', async () => {
    const period = periodForPreset('next-weekdays')
    const key = `cooksmith:get-ahead:${householdId}:${period.start}_${period.end}`
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 'get-ahead-session-v1',
        selectedMinutes: 30,
        tasks: [{ id: 'obsolete-task' }],
      }),
    )

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
      usefulWeeklyPreparationRepository,
    )

    expect(await screen.findByRole('button', { name: 'Start' })).toBeVisible()
    expect(screen.queryByText('That page did not come together')).not.toBeInTheDocument()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('shows a clear unavailable state and replaces it after a successful retry', async () => {
    const user = userEvent.setup()
    let calls = 0
    const weeklyPreparationRepository: WeeklyPreparationRepository = {
      getCurrentPlan: async (input) => {
        calls += 1
        if (calls === 1) throw new Error('temporarily unavailable')
        return usefulWeeklyPreparationRepository.getCurrentPlan(input)
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

    expect(await screen.findByText(/could not create your prep plan/u)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('AI-assisted plan')).toBeVisible()
    expect(screen.queryByText(/could not create your prep plan/u)).not.toBeInTheDocument()
  })

  it('explains an honest empty result without presenting it as a system failure', async () => {
    const weeklyPreparationRepository: WeeklyPreparationRepository = {
      getCurrentPlan: async () => {
        throw new WeeklyPreparationUnavailableError('no_worthwhile_preparation')
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

    expect(await screen.findByText('No worthwhile prep fits this session')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.queryByText('We could not create your prep plan')).not.toBeInTheDocument()
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
      undefined,
      usefulWeeklyPreparationRepository,
    )

    await user.click(await screen.findByRole('button', { name: 'Start' }))

    expect(await screen.findByText(/minutes saved this week/u)).toBeVisible()
    expect(screen.getByText('10 minutes of prep time remaining.')).toBeVisible()
    const checkbox = await screen.findByRole('checkbox')
    const task = checkbox.closest('li')
    if (!task) throw new Error('Expected the Get Ahead instruction to render inside a task row.')
    expect(within(task).queryByText('10 min estimate')).not.toBeInTheDocument()
    expect(within(task).queryByText(/Saves \d+ min later/u)).not.toBeInTheDocument()
    expect(within(task).queryByText(/For .+ on/u)).not.toBeInTheDocument()
    expect(within(task).queryByText(/More actions/u)).not.toBeInTheDocument()
    expect(within(task).queryByText(/explicitly describes/u)).not.toBeInTheDocument()
    expect(within(task).getAllByText('For Simple pasta.')[0]).toBeVisible()
    expect(
      within(task).getByText('Refrigerate in a covered container until ready to use.'),
    ).toBeVisible()
    const disclosure = within(task).getByText('Show what to do')
    expect(disclosure).toBeVisible()
    await user.click(disclosure)
    expect(disclosure.closest('details')).toHaveAttribute('open')
    expect(within(task).getByText('Ingredients')).toBeVisible()
    expect(within(task).getByText('1 onion')).toBeVisible()
    expect(within(task).getByText('Steps')).toBeVisible()
    expect(within(task).getByText('Peel and dice the onion.')).toBeVisible()
    expect(within(task).getByText(/The onion is diced/u)).toBeVisible()
    expect(within(task).getByText(/Add to the pasta sauce on the night/u)).toBeVisible()
    expect(within(task).getByText('Simple pasta')).toBeVisible()
    expect(within(task).queryAllByText('Dice onion')).toHaveLength(1)
    expect(screen.queryByText(/Recommended because/u)).not.toBeInTheDocument()

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
      undefined,
      usefulWeeklyPreparationRepository,
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
