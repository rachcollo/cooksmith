import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'
import type { PantryRepository } from '../../src/application/pantry/pantryRepository'
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

function renderShopping(
  repository: ShoppingRepository,
  pantryRepository: PantryRepository = defaultPantryRepository,
) {
  return renderApp(
    '/shopping',
    undefined,
    authenticatedTestClient,
    completedOnboardingRepository,
    ownerHouseholdPeopleRepository,
    pantryRepository,
    defaultPlannedMealRepository,
    authenticatedTestAuthState,
    defaultRecipeRepository,
    repository,
  )
}

describe('shopping list foundation', () => {
  it('shows accessible pantry guidance only for a strong same-household match', async () => {
    const repository: ShoppingRepository = {
      list: async () => [item(), item({ id: 'shopping-rice', name: 'Rice' })],
      create: async () => item(),
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const pantryRepository: PantryRepository = {
      list: async (nextHouseholdId) => [
        {
          id: 'pantry-milk',
          householdId: nextHouseholdId,
          name: ' milk ',
          category: 'dairy',
          categorySource: 'explicit',
          storageLocation: 'fridge',
          storageLocationSource: 'explicit',
          classificationVersion: null,
          quantity: 1,
          unit: 'L',
          available: true,
          isDefault: false,
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'pantry-rice-vinegar',
          householdId: nextHouseholdId,
          name: 'Rice vinegar',
          category: 'oils_and_vinegars',
          categorySource: 'explicit',
          storageLocation: 'pantry',
          storageLocationSource: 'explicit',
          classificationVersion: null,
          quantity: null,
          unit: null,
          available: true,
          isDefault: false,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      create: async () => defaultPantryRepository.create(householdId, {} as never),
      update: async () => defaultPantryRepository.update('', {} as never),
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository, pantryRepository)

    const info = await screen.findByRole('button', {
      name: 'Why should I check my pantry for Milk?',
    })
    expect(info.closest('li')).toHaveClass('shopping-item-pantry-match')
    expect(screen.queryByText('May already have')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Why should I check my pantry for Rice?' }),
    ).not.toBeInTheDocument()
    const milkRow = screen.getByText('Milk').closest('li')
    const riceRow = screen.getByText('Rice').closest('li')
    expect(milkRow?.children).toHaveLength(5)
    expect(riceRow?.children).toHaveLength(5)
    expect(within(milkRow!).getByRole('button', { name: 'Edit Milk' })).toBeVisible()
    expect(within(riceRow!).getByRole('button', { name: 'Edit Rice' })).toBeVisible()

    await user.click(info)
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Check your pantry — you might already have this item, and we hate wasting food and money!',
    )
    expect(info).toHaveAttribute('aria-describedby', 'pantry-match-message-shopping-milk')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
  it('reviews completed shopping before putting groceries into Pantry', async () => {
    const reconcile = vi.fn(async (_householdId, proposal) => ({
      id: proposal.kind === 'increment' ? proposal.pantryItemId : 'pantry-created',
      householdId,
      name: 'Milk',
      category: 'dairy' as const,
      categorySource: 'explicit' as const,
      storageLocation: 'fridge' as const,
      storageLocationSource: 'explicit' as const,
      classificationVersion: null,
      quantity: 3,
      unit: 'L',
      available: true,
      isDefault: false,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies PantryRepository['reconcile']
    const repository: ShoppingRepository = {
      list: async () => [item({ completed: true })],
      create: async () => item(),
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const pantryRepository: PantryRepository = {
      list: async () => [
        {
          id: 'pantry-milk',
          householdId,
          name: 'Milk',
          category: 'dairy',
          categorySource: 'explicit',
          storageLocation: 'fridge',
          storageLocationSource: 'explicit',
          classificationVersion: null,
          quantity: 1,
          unit: 'L',
          available: true,
          isDefault: false,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      create: async () => defaultPantryRepository.create(householdId, {} as never),
      update: async () => defaultPantryRepository.update('', {} as never),
      reconcile,
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository, pantryRepository)

    expect(await screen.findByRole('heading', { name: 'Put away shopping' })).toBeVisible()
    expect(screen.getByText('Add to Milk')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(reconcile).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({
        kind: 'increment',
        pantryItemId: 'pantry-milk',
        idempotencyKey: 'shopping-put-away:shopping-milk',
      }),
    )
    expect(screen.getByText('Reviewed')).toBeVisible()
  })

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

    const editButton = await screen.findByRole('button', { name: 'Edit Milk' })
    const row = editButton.closest('li')
    expect(row).not.toBeNull()
    await user.click(editButton)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.clear(within(row!).getByLabelText('Item name'))
    await user.type(within(row!).getByLabelText('Item name'), 'Oat milk')
    await user.clear(within(row!).getByLabelText('Quantity'))
    await user.type(within(row!).getByLabelText('Quantity'), '3')
    await user.click(within(row!).getByRole('button', { name: 'Save changes to Milk' }))
    expect(update).toHaveBeenCalledWith('shopping-milk', {
      name: 'Oat milk',
      quantity: 3,
      unit: 'L',
      category: 'dairy_and_eggs',
    })
    expect(await screen.findByText('Oat milk')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove Oat milk' }))
    expect(remove).toHaveBeenCalledWith('shopping-milk')
    expect(await screen.findByRole('heading', { name: 'Your list is ready' })).toBeVisible()
  })
})
