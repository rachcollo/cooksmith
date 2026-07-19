import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PlannedMealRepository } from '../../src/application/meal-plans/plannedMealRepository'
import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'
import type { ShoppingItem, ShoppingItemInput } from '../../src/domain/shopping/types'
import {
  authenticatedTestAuthState,
  authenticatedTestClient,
  completedOnboardingRepository,
  defaultPantryRepository,
  defaultPlannedMealRepository,
  defaultRecipeRepository,
  defaultShoppingRepository,
  ownerHouseholdPeopleRepository,
  renderApp,
} from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'

function item(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'shopping-milk',
    householdId,
    name: 'Milk',
    quantity: 2,
    unit: 'L',
    category: 'dairy_and_eggs',
    completed: false,
    position: 0,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderShopping(
  repository: ShoppingRepository,
  plannedMealRepository: PlannedMealRepository = defaultPlannedMealRepository,
  recipeRepository: RecipeRepository = defaultRecipeRepository,
) {
  return renderApp(
    '/shopping',
    undefined,
    authenticatedTestClient,
    completedOnboardingRepository,
    ownerHouseholdPeopleRepository,
    defaultPantryRepository,
    plannedMealRepository,
    authenticatedTestAuthState,
    recipeRepository,
    repository,
  )
}

describe('shopping list foundation', () => {
  it('adds a household item and groups it by grocery category', async () => {
    const create = vi.fn(async (nextHouseholdId, input) => ({
      id: 'shopping-apples',
      householdId: nextHouseholdId,
      ...input,
      completed: false,
      position: 1,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies ShoppingRepository['create']
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create,
      createFromPlan: defaultShoppingRepository.createFromPlan,
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    expect(await screen.findByRole('heading', { level: 1, name: 'Shopping' })).toBeVisible()
    await user.type(screen.getByLabelText('Item name'), 'Apples')
    await user.type(screen.getByLabelText(/^Quantity/), '6')
    await user.selectOptions(screen.getByLabelText('Category'), 'produce')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    expect(create).toHaveBeenCalledWith(householdId, {
      name: 'Apples',
      quantity: 6,
      unit: null,
      category: 'produce',
    })
    expect(await screen.findByText('Apples')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Fruit and vegetables' })).toBeVisible()
  })

  it('persists completion and lets a household member restore an item', async () => {
    const setCompleted = vi.fn(async (itemId, completed) => item({ id: itemId, completed }))
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create: async () => item(),
      createFromPlan: defaultShoppingRepository.createFromPlan,
      update: async () => item(),
      setCompleted,
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    await user.click(await screen.findByRole('button', { name: 'Mark as done: Milk' }))
    expect(setCompleted).toHaveBeenCalledWith('shopping-milk', true)
    expect(await screen.findByRole('heading', { name: 'Done' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Mark as needed: Milk' }))
    expect(setCompleted).toHaveBeenLastCalledWith('shopping-milk', false)
  })

  it('edits and removes an item without exposing destructive actions accidentally', async () => {
    const update = vi.fn(async (itemId, input) => item({ id: itemId, ...input }))
    const remove = vi.fn(async () => undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create: async () => item(),
      createFromPlan: defaultShoppingRepository.createFromPlan,
      update,
      setCompleted: async () => item(),
      remove,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    await user.click(await screen.findByRole('button', { name: 'Edit Milk' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Milk' })
    await user.clear(within(dialog).getByLabelText('Item name'))
    await user.type(within(dialog).getByLabelText('Item name'), 'Oat milk')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(update).toHaveBeenCalledWith(
      'shopping-milk',
      expect.objectContaining({ name: 'Oat milk' }),
    )
    expect(await screen.findByText('Oat milk')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove Oat milk' }))
    expect(remove).toHaveBeenCalledWith('shopping-milk')
    expect(await screen.findByRole('heading', { name: 'Your list is ready' })).toBeVisible()
  })

  it("previews and adds this week's linked recipe ingredients to the list", async () => {
    const createFromPlan = vi.fn(async (nextHouseholdId: string, inputs: ShoppingItemInput[]) =>
      inputs.map((input, index) => ({
        id: `generated-${index + 1}`,
        householdId: nextHouseholdId,
        ...input,
        completed: false,
        position: index + 1,
        updatedAt: '2026-01-01T00:00:00Z',
      })),
    ) satisfies ShoppingRepository['createFromPlan']
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create: async () => item(),
      createFromPlan,
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const plannedMealRepository: PlannedMealRepository = {
      ...defaultPlannedMealRepository,
      listWeek: async (nextHouseholdId, weekStart) => [
        {
          id: 'meal-1',
          householdId: nextHouseholdId,
          mealDate: weekStart,
          mealType: 'dinner',
          title: 'Lentil soup',
          notes: null,
          recipeId: 'recipe-1',
          linkedRecipe: { id: 'recipe-1', name: 'Lentil soup', archivedAt: null },
          recipeState: {
            kind: 'active',
            recipe: { id: 'recipe-1', name: 'Lentil soup', archivedAt: null },
          },
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }
    const recipeRepository: RecipeRepository = {
      ...defaultRecipeRepository,
      list: async (nextHouseholdId) => [
        {
          id: 'recipe-1',
          householdId: nextHouseholdId,
          name: 'Lentil soup',
          ingredients: null,
          description: null,
          sourceNote: null,
          sourceUrl: null,
          servings: 4,
          prepTimeMinutes: 10,
          cookTimeMinutes: 30,
          imageUrl: null,
          notes: null,
          category: null,
          tags: [],
          favourite: false,
          ingredientRows: [
            {
              id: 'ingredient-1',
              name: 'Brown lentils',
              quantity: '1',
              unit: 'cup',
              preparation: null,
              originalLineText: '1 cup brown lentils',
              parserVersion: 'recipe-content-v1',
              derivationStatus: 'derived',
              position: 1,
            },
            {
              id: 'ingredient-2',
              name: 'Milk',
              quantity: null,
              unit: null,
              preparation: null,
              originalLineText: 'Milk',
              parserVersion: 'recipe-content-v1',
              derivationStatus: 'derived',
              position: 2,
            },
          ],
          steps: [],
          archivedAt: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }
    const user = userEvent.setup()
    renderShopping(repository, plannedMealRepository, recipeRepository)

    await user.click(await screen.findByRole('button', { name: "Add this week's meals" }))
    const dialog = await screen.findByRole('dialog', { name: "Add this week's meals" })
    expect(within(dialog).getByText('Brown lentils')).toBeVisible()
    expect(within(dialog).getByText(/Already on your list: Milk/)).toBeVisible()

    await user.click(within(dialog).getByRole('button', { name: 'Add 1 item' }))
    expect(createFromPlan).toHaveBeenCalledWith(householdId, [
      { name: 'Brown lentils', quantity: 1, unit: 'cup', category: 'pantry' },
    ])
    expect(await screen.findByText("Added 1 item from this week's meals.")).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Pantry' })).toBeVisible()
    expect(screen.getByText('Brown lentils')).toBeVisible()
  })
})
