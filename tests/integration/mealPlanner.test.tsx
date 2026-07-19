import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import { defaultRecipeRepository, renderApp } from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'

function meal(overrides: Partial<PlannedMeal>): PlannedMeal {
  return {
    id: 'meal-1',
    householdId,
    mealDate: '2026-07-17',
    mealType: 'dinner',
    title: 'Pasta',
    notes: null,
    recipeId: null,
    recipeSource: null,
    linkedRecipe: null,
    recipeState: { kind: 'free-text' },
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
    expect(screen.queryByText('The weekly wrangle')).not.toBeInTheDocument()
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

    await user.click(
      within(mondayCard as HTMLElement).getByRole('button', {
        name: 'Add dinner',
      }),
    )
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

  it('adds a selected public recipe-bank meal using the imported recipe source', async () => {
    const importedRecipe = {
      ...(await defaultRecipeRepository.list(householdId))[0],
      id: '30000000-0000-4000-8000-000000000001',
      householdId: '',
      scope: 'public' as const,
      name: 'Baked garlic chicken',
    }
    const create = vi.fn(async (_householdId, input) =>
      meal({ id: 'recipe-bank-dinner', ...input }),
    ) satisfies PlannedMealRepository['create']
    const repository: PlannedMealRepository = {
      listWeek: async () => [],
      create,
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }
    const recipeRepository: RecipeRepository = {
      ...defaultRecipeRepository,
      list: async () => [importedRecipe],
    }
    const user = userEvent.setup()

    renderApp(
      '/plan',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
      undefined,
      recipeRepository,
    )

    const monday = await screen.findByRole('heading', { name: '13 July' })
    await user.click(
      within(monday.closest('article') as HTMLElement).getByRole('button', {
        name: 'Add dinner',
      }),
    )
    await user.selectOptions(screen.getByLabelText('Start with'), importedRecipe.id)
    await user.click(screen.getByRole('button', { name: 'Save dinner' }))

    expect(create).toHaveBeenCalledWith(householdId, {
      mealDate: '2026-07-13',
      mealType: 'dinner',
      title: 'Baked garlic chicken',
      notes: null,
      recipeId: importedRecipe.id,
      recipeSource: 'imported',
    })
  })

  it('opens linked recipe details from the meal card and exposes planner edit controls', async () => {
    const linkedMeal = meal({
      id: 'linked-dinner',
      title: 'Lentil soup',
      recipeId: 'recipe-1',
      recipeSource: 'household',
      linkedRecipe: { id: 'recipe-1', name: 'Lentil soup', archivedAt: null },
      recipeState: {
        kind: 'active',
        recipe: { id: 'recipe-1', name: 'Lentil soup', archivedAt: null },
      },
    })
    const repository: PlannedMealRepository = {
      listWeek: async () => [linkedMeal],
      create: async (_householdId, input) => meal({ id: 'created-dinner', ...input }),
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }
    const recipeUpdate = vi.fn(defaultRecipeRepository.update) satisfies RecipeRepository['update']
    const recipeRepository: RecipeRepository = {
      ...defaultRecipeRepository,
      update: recipeUpdate,
    }
    const user = userEvent.setup()

    renderApp(
      '/plan',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
      undefined,
      recipeRepository,
    )

    const linkedMealButton = (await screen.findAllByRole('button', { name: /Lentil soup/ })).find(
      (button) => button.classList.contains('planned-meal-title'),
    )
    expect(linkedMealButton).toBeDefined()
    await user.click(linkedMealButton as HTMLElement)
    const recipeDialog = await screen.findByRole('dialog', {
      name: 'Lentil soup',
    })
    expect(within(recipeDialog).getByText('1 cup lentils')).toBeVisible()
    await user.click(within(recipeDialog).getByRole('button', { name: 'Back to planner' }))

    await user.click(screen.getByRole('button', { name: 'Edit planned dinner Lentil soup' }))
    const editDialog = await screen.findByRole('dialog', { name: 'Edit Lentil soup' })
    expect(within(editDialog).getByLabelText('Date')).toHaveValue('2026-07-17')
    expect(within(editDialog).getByLabelText('Dinner')).toHaveValue('Lentil soup')
    expect(within(editDialog).getByLabelText(/Notes/)).toBeVisible()
    expect(recipeUpdate).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Unlink recipe/ })).not.toBeInTheDocument()
  })

  it('automatically adds linked recipe ingredients to shopping when a meal is planned', async () => {
    const recipe = {
      ...(await defaultRecipeRepository.list(householdId))[0],
      id: '30000000-0000-4000-8000-000000000022',
      ingredientRows: [
        {
          id: 'ingredient-1',
          name: 'lentils',
          quantity: '1',
          unit: 'cup',
          preparation: null,
          originalLineText: '1 cup lentils',
          parserVersion: 'recipe-content-v1',
          derivationStatus: 'derived' as const,
          position: 1,
        },
      ],
    }
    const createFromPlan = vi.fn(async () => [])
    const shoppingRepository = {
      list: vi.fn(async () => []),
      create: vi.fn(),
      createFromPlan,
      update: vi.fn(),
      setCompleted: vi.fn(),
      remove: vi.fn(),
    }
    const repository: PlannedMealRepository = {
      listWeek: async () => [],
      create: async (savedHouseholdId, input) =>
        meal({
          id: 'linked-created',
          householdId: savedHouseholdId,
          ...input,
          linkedRecipe: { id: recipe.id, name: recipe.name, archivedAt: null },
          recipeState: {
            kind: 'active',
            recipe: { id: recipe.id, name: recipe.name, archivedAt: null },
          },
        }),
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }
    const recipeRepository: RecipeRepository = {
      ...defaultRecipeRepository,
      list: async () => [recipe],
    }
    const user = userEvent.setup()

    renderApp(
      '/plan',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
      undefined,
      recipeRepository,
      shoppingRepository,
    )

    const monday = await screen.findByRole('heading', { name: '13 July' })
    await user.click(
      within(monday.closest('article') as HTMLElement).getByRole('button', { name: 'Add dinner' }),
    )
    await user.selectOptions(screen.getByLabelText('Start with'), recipe.id)
    await user.click(screen.getByRole('button', { name: 'Save dinner' }))

    await waitFor(() =>
      expect(createFromPlan).toHaveBeenCalledWith(householdId, [
        expect.objectContaining({
          name: 'lentils',
          quantity: 1,
          unit: 'cup',
          category: 'pantry',
        }),
      ]),
    )
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
