import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'
import type { ShoppingItem } from '../../src/domain/shopping/types'
import {
  authenticatedTestAuthState,
  authenticatedTestClient,
  completedOnboardingRepository,
  defaultPantryRepository,
  defaultPlannedMealRepository,
  defaultRecipeRepository,
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

function renderShopping(repository: ShoppingRepository) {
  return renderApp(
    '/shopping',
    undefined,
    authenticatedTestClient,
    completedOnboardingRepository,
    ownerHouseholdPeopleRepository,
    defaultPantryRepository,
    defaultPlannedMealRepository,
    authenticatedTestAuthState,
    defaultRecipeRepository,
    repository,
  )
}

describe('shopping list foundation', () => {
  it('quickly adds a household item with safe defaults for hidden fields', async () => {
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
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    expect(await screen.findByRole('heading', { level: 1, name: 'Shopping' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('1 item left to buy')
    expect(screen.queryByLabelText('Unit')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Item name'), 'Apples')
    await user.type(screen.getByLabelText(/^Quantity/), '6')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(create).toHaveBeenCalledWith(householdId, {
      name: 'Apples',
      quantity: 6,
      unit: null,
      category: 'other',
    })
    expect(await screen.findByText('Apples')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Other' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('2 items left to buy')
  })

  it('submits quick add from the keyboard through the same mutation', async () => {
    const create = vi.fn(async (nextHouseholdId, input) => ({
      id: 'shopping-bread',
      householdId: nextHouseholdId,
      ...input,
      completed: false,
      position: 0,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies ShoppingRepository['create']
    const repository: ShoppingRepository = {
      list: async () => [],
      create,
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    const name = await screen.findByLabelText('Item name')
    await user.type(name, 'Bread{Enter}')

    expect(create).toHaveBeenCalledWith(householdId, {
      name: 'Bread',
      quantity: null,
      unit: null,
      category: 'other',
    })
    expect(await screen.findByText('Bread')).toBeVisible()
  })

  it('persists completion and lets a household member restore an item', async () => {
    const setCompleted = vi.fn(async (itemId, completed) => item({ id: itemId, completed }))
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create: async () => item(),
      update: async () => item(),
      setCompleted,
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    await user.click(await screen.findByRole('button', { name: 'Mark as done: Milk' }))
    expect(setCompleted).toHaveBeenCalledWith('shopping-milk', true)
    expect(screen.getByRole('status')).toHaveTextContent('0 items left to buy')
    expect(await screen.findByRole('heading', { name: 'Done' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Mark as needed: Milk' }))
    expect(setCompleted).toHaveBeenLastCalledWith('shopping-milk', false)
    expect(screen.getByRole('status')).toHaveTextContent('1 item left to buy')
  })

  it('edits and removes an item without exposing destructive actions accidentally', async () => {
    const update = vi.fn(async (itemId, input) => item({ id: itemId, ...input }))
    const remove = vi.fn(async () => undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create: async () => item(),
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
})
