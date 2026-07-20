import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
import { addDays, currentWeek, formatDisplayDate, nextWeek } from '../../src/domain/meal-plans/week'
import { defaultRecipeRepository, renderApp } from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'
const testWeekStart = currentWeek(new Date())
const testMondayLabel = formatDisplayDate(testWeekStart).replace(/\s+\d{4}$/, '')
const testFriday = addDays(testWeekStart, 4)

function meal(overrides: Partial<PlannedMeal>): PlannedMeal {
  return {
    id: 'meal-1',
    householdId,
    mealDate: testFriday,
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
  it('reviews and applies generated proposals only to empty days', async () => {
    const existing = meal({ id: 'existing-dinner' })
    const listWeek = vi.fn(async () => [existing]) satisfies PlannedMealRepository['listWeek']
    const create = vi.fn(async (savedHouseholdId, input) =>
      meal({ id: `generated-${input.mealDate}`, householdId: savedHouseholdId, ...input }),
    ) satisfies PlannedMealRepository['create']
    const repository: PlannedMealRepository = {
      listWeek,
      create,
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }
    const createFromPlan = vi.fn(async () => undefined)
    const shoppingRepository = {
      list: vi.fn(async () => []),
      create: vi.fn(),
      createFromPlan,
      update: vi.fn(),
      setCompleted: vi.fn(),
      remove: vi.fn(),
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
      undefined,
      shoppingRepository,
    )

    await screen.findByRole('heading', { name: testMondayLabel })
    await user.click(screen.getByRole('button', { name: 'Plan my week' }))
    const dialog = await screen.findByRole('dialog', { name: 'Plan my week' })
    expect(within(dialog).getByRole('heading', { name: 'Already planned' })).toBeVisible()
    expect(within(dialog).getByText(/No permitted recipe is available/)).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Apply plan' }))

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        householdId,
        expect.objectContaining({
          mealDate: testWeekStart,
          title: 'Lentil soup',
          recipeId: 'recipe-1',
        }),
      ),
    )
    expect(create).not.toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({ mealDate: testFriday }),
    )
    expect(await screen.findByRole('dialog', { name: 'Your week is planned' })).toBeVisible()
  })

  it('searches repeat recipes, replaces one proposal and reorders proposals by keyboard', async () => {
    const baseRecipe = (await defaultRecipeRepository.list(householdId))[0]!
    const curry = { ...baseRecipe, id: 'recipe-2', name: 'Chickpea curry' }
    const tacos = { ...baseRecipe, id: 'recipe-3', name: 'Bean tacos' }
    const existing = meal({ id: 'existing-dinner', recipeId: baseRecipe.id })
    const repository: PlannedMealRepository = {
      listWeek: async () => [existing],
      create: async (_householdId, input) => meal({ id: `created-${input.mealDate}`, ...input }),
      update: async (id, input) => meal({ id, ...input }),
      remove: async () => undefined,
    }
    const recipeRepository: RecipeRepository = {
      ...defaultRecipeRepository,
      list: async () => [baseRecipe, curry, tacos],
    }
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.999)
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
    await screen.findByRole('heading', { name: testMondayLabel })
    await user.click(screen.getByRole('button', { name: 'Plan my week' }))
    const dialog = await screen.findByRole('dialog', { name: 'Plan my week' })
    const searches = within(dialog).getAllByRole('combobox')
    expect(
      within(dialog).queryByText(
        'Existing dinners stay as they are. Cooksmith will fill only the empty days.',
      ),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByText(/Drag the handle to swap dinners between days/)).toHaveClass(
      'visually-hidden',
    )
    expect(within(dialog).getAllByRole('button', { name: /Move dinner for/ })[0]).toHaveAttribute(
      'aria-describedby',
      'week-plan-drag-instructions',
    )
    expect(within(dialog).getAllByRole('button', { name: /Replace dinner for/ })).toHaveLength(
      searches.length,
    )
    expect(within(dialog).getAllByRole('button', { name: /Remove dinner for/ })).toHaveLength(
      searches.length,
    )
    const originalFirst = (searches[0] as HTMLInputElement).value
    const originalSecond = (searches[1] as HTMLInputElement).value

    fireEvent.keyDown(within(dialog).getAllByRole('button', { name: /Move dinner for/ })[0]!, {
      altKey: true,
      key: 'ArrowDown',
    })
    expect(within(dialog).getAllByRole('combobox')[0]).toHaveValue(originalSecond)
    expect(within(dialog).getAllByRole('combobox')[1]).toHaveValue(originalFirst)

    const secondSearch = within(dialog).getAllByRole('combobox')[1]!
    await user.click(secondSearch)
    await user.clear(secondSearch)
    await user.type(secondSearch, baseRecipe.name)
    await user.click(within(dialog).getByRole('option', { name: baseRecipe.name }))
    expect(within(dialog).getAllByRole('combobox')[1]).toHaveValue(baseRecipe.name)

    await user.click(
      within(dialog).getAllByRole('button', { name: /Replace dinner .* random recipe/ })[1]!,
    )
    expect(within(dialog).getAllByRole('combobox')[1]).toHaveValue(tacos.name)
    random.mockRestore()
  })

  it('randomly replaces only one existing dinner from Plan', async () => {
    const baseRecipe = (await defaultRecipeRepository.list(householdId))[0]!
    const curry = { ...baseRecipe, id: 'recipe-2', name: 'Chickpea curry' }
    const linkedMeal = meal({
      id: 'existing-dinner',
      title: baseRecipe.name,
      recipeId: baseRecipe.id,
      recipeSource: 'household',
      linkedRecipe: { id: baseRecipe.id, name: baseRecipe.name, archivedAt: null },
      recipeState: {
        kind: 'active',
        recipe: { id: baseRecipe.id, name: baseRecipe.name, archivedAt: null },
      },
    })
    const update = vi.fn(async (id, input) => meal({ id, ...input }))
    const repository: PlannedMealRepository = {
      listWeek: async () => [linkedMeal],
      create: async (_householdId, input) => meal({ id: `created-${input.mealDate}`, ...input }),
      update,
      remove: async () => undefined,
    }
    const recipeList = vi.fn(async () => [baseRecipe, curry])
    const recipeRepository: RecipeRepository = { ...defaultRecipeRepository, list: recipeList }

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
    await waitFor(() => expect(recipeList).toHaveBeenCalled())
    await userEvent.click(
      await screen.findByRole('button', {
        name: `Replace ${baseRecipe.name} with a random recipe`,
      }),
    )

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        linkedMeal.id,
        expect.objectContaining({ recipeId: curry.id, title: curry.name }),
      ),
    )
    expect(await screen.findByText(curry.name)).toBeVisible()
  })

  it('requires a separate confirmation before reviewing a full-week replacement', async () => {
    const fullWeek = Array.from({ length: 7 }, (_, index) =>
      meal({ id: `meal-${index}`, mealDate: addDays(testWeekStart, index) }),
    )
    const remove = vi.fn(async () => undefined)
    const repository: PlannedMealRepository = {
      listWeek: async () => fullWeek,
      create: async (_householdId, input) => meal({ id: `created-${input.mealDate}`, ...input }),
      update: async (id, input) => meal({ id, ...input }),
      remove,
    }
    const user = userEvent.setup()

    renderApp('/plan', undefined, undefined, undefined, undefined, undefined, repository)
    await screen.findByRole('heading', { name: testMondayLabel })
    await user.click(screen.getByRole('button', { name: 'Plan my week' }))
    expect(
      await screen.findByText('This week is already planned. What would you like to do?'),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Replace this week' }))
    expect(screen.getByText(/Replace every dinner in this week/)).toBeVisible()
    expect(remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Keep this week' }))
    expect(
      screen.getByText('This week is already planned. What would you like to do?'),
    ).toBeVisible()
    expect(remove).not.toHaveBeenCalled()
  })

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
      expect(listWeek).toHaveBeenLastCalledWith(
        householdId,
        nextWeek(testWeekStart),
        addDays(nextWeek(testWeekStart), 6),
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await waitFor(() =>
      expect(listWeek).toHaveBeenLastCalledWith(
        householdId,
        testWeekStart,
        addDays(testWeekStart, 6),
      ),
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

    const monday = await screen.findByRole('heading', { name: testMondayLabel })
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
        mealDate: testWeekStart,
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
        expect.objectContaining({ mealDate: addDays(testFriday, 1), mealType: 'dinner' }),
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

    const monday = await screen.findByRole('heading', { name: testMondayLabel })
    await user.click(
      within(monday.closest('article') as HTMLElement).getByRole('button', {
        name: 'Add dinner',
      }),
    )
    await user.selectOptions(screen.getByLabelText('Start with'), importedRecipe.id)
    await user.click(screen.getByRole('button', { name: 'Save dinner' }))

    expect(create).toHaveBeenCalledWith(householdId, {
      mealDate: testWeekStart,
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
    expect(within(editDialog).getByLabelText('Date')).toHaveValue(testFriday)
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
    const createFromPlan = vi.fn(async () => undefined)
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

    const monday = await screen.findByRole('heading', { name: testMondayLabel })
    await user.click(
      within(monday.closest('article') as HTMLElement).getByRole('button', { name: 'Add dinner' }),
    )
    await user.selectOptions(screen.getByLabelText('Start with'), recipe.id)
    await user.click(screen.getByRole('button', { name: 'Save dinner' }))

    await waitFor(() =>
      expect(createFromPlan).toHaveBeenCalledWith(householdId, 'linked-created', [
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
