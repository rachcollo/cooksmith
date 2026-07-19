import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PantryRepository } from '../../src/application/pantry/pantryRepository'
import type { PantryItem } from '../../src/domain/pantry/types'
import { renderApp } from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'

function pantryItem(overrides: Partial<PantryItem>): PantryItem {
  return {
    id: 'default-flour',
    householdId,
    name: 'Plain flour',
    category: 'baking',
    categorySource: 'explicit',
    storageLocation: 'pantry',
    storageLocationSource: 'explicit',
    classificationVersion: null,
    quantity: 1,
    unit: 'kg',
    available: true,
    isDefault: true,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('household staples experience', () => {
  it('shows locations, filters staples and adds a fridge item', async () => {
    const create = vi.fn(async (householdId, input) => ({
      id: 'new-item',
      householdId,
      ...input,
      isDefault: false,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies PantryRepository['create']
    const update = vi.fn(async (_itemId, input) => ({
      id: 'default-flour',
      householdId,
      ...input,
      isDefault: true,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies PantryRepository['update']
    const repository: PantryRepository = {
      list: async () => [
        pantryItem({}),
        pantryItem({
          id: 'default-milk',
          name: 'Milk',
          category: 'tea_coffee_and_drinks',
          storageLocation: 'fridge',
          quantity: null,
          unit: null,
        }),
      ],
      create,
      update,
      remove: async () => undefined,
    }

    renderApp('/pantry', undefined, undefined, undefined, undefined, repository)
    expect(await screen.findByRole('heading', { level: 1, name: 'Pantry' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Plain flour' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Milk' })).toBeVisible()

    await userEvent.selectOptions(screen.getByLabelText('Location filter'), 'fridge')
    expect(screen.queryByRole('heading', { name: 'Plain flour' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Milk' })).toBeVisible()

    await userEvent.selectOptions(screen.getByLabelText('Location filter'), 'all')
    await userEvent.type(screen.getByLabelText('Search staples'), 'flour')
    expect(screen.getByRole('heading', { name: 'Plain flour' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Milk' })).not.toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Search staples'))
    await userEvent.type(screen.getByLabelText('Item name'), 'Greek yoghurt')
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }))

    expect(create).toHaveBeenCalledWith(householdId, {
      name: 'Greek yoghurt',
      category: 'dairy',
      categorySource: 'automatic',
      storageLocation: 'fridge',
      storageLocationSource: 'automatic',
      classificationVersion: 1,
      quantity: null,
      unit: null,
      available: true,
    })
    expect(await screen.findByRole('heading', { name: 'Greek yoghurt' })).toBeVisible()
  })

  it('edits an existing item in a modal and updates only that pantry card', async () => {
    const update = vi.fn(async (itemId, input) => ({
      id: itemId,
      householdId,
      ...input,
      isDefault: true,
      updatedAt: '2026-01-02T00:00:00Z',
    })) satisfies PantryRepository['update']
    const repository: PantryRepository = {
      list: async () => [pantryItem({}), pantryItem({ id: 'default-milk', name: 'Milk' })],
      create: async () => pantryItem({ id: 'created' }),
      update,
      remove: async () => undefined,
    }
    const user = userEvent.setup()

    renderApp('/pantry', undefined, undefined, undefined, undefined, repository)
    const card = (await screen.findByRole('heading', { name: 'Plain flour' })).closest('article')
    expect(card).not.toBeNull()

    await user.click(within(card as HTMLElement).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Plain flour' })
    expect(within(dialog).getByLabelText('Item name')).toHaveValue('Plain flour')

    await user.clear(within(dialog).getByLabelText('Item name'))
    await user.type(within(dialog).getByLabelText('Item name'), 'Bread flour')
    await user.selectOptions(within(dialog).getByLabelText('Location'), 'freezer')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(update).toHaveBeenCalledWith('default-flour', {
      name: 'Bread flour',
      category: 'baking',
      categorySource: 'explicit',
      storageLocation: 'freezer',
      storageLocationSource: 'explicit',
      classificationVersion: null,
      quantity: 1,
      unit: 'kg',
      available: true,
    })
    expect(await screen.findByRole('heading', { name: 'Bread flour' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Plain flour' })).not.toBeInTheDocument()
  })

  it('keeps edits local until save and shows friendly validation failures', async () => {
    const update = vi.fn() satisfies PantryRepository['update']
    const repository: PantryRepository = {
      list: async () => [pantryItem({}), pantryItem({ id: 'default-milk', name: 'Milk' })],
      create: async () => pantryItem({ id: 'created' }),
      update,
      remove: async () => undefined,
    }
    const user = userEvent.setup()

    renderApp('/pantry', undefined, undefined, undefined, undefined, repository)
    const card = (await screen.findByRole('heading', { name: 'Plain flour' })).closest('article')
    expect(card).not.toBeNull()

    await user.click(within(card as HTMLElement).getByRole('button', { name: 'Edit' }))
    let dialog = screen.getByRole('dialog', { name: 'Edit Plain flour' })
    await user.clear(within(dialog).getByLabelText('Item name'))
    await user.type(within(dialog).getByLabelText('Item name'), 'Milk')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(
      await within(dialog).findByText('That item is already in your household pantry.'),
    ).toBeVisible()
    expect(update).not.toHaveBeenCalled()

    await user.clear(within(dialog).getByLabelText('Item name'))
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await user.type(within(dialog).getByLabelText('Item name'), 'Unsaved flour')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Edit Plain flour' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plain flour' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Unsaved flour' })).not.toBeInTheDocument()

    await user.click(within(card as HTMLElement).getByRole('button', { name: 'Edit' }))
    dialog = screen.getByRole('dialog', { name: 'Edit Plain flour' })
    within(dialog).getByRole('button', { name: 'Close Edit Plain flour' }).click()
    expect(screen.queryByRole('dialog', { name: 'Edit Plain flour' })).not.toBeInTheDocument()
  })

  it('reclassifies an automatic suggestion on rename without overwriting an explicit correction', async () => {
    const update = vi.fn(async (itemId, input) => ({
      id: itemId,
      householdId,
      ...input,
      isDefault: false,
      updatedAt: '2026-01-02T00:00:00Z',
    })) satisfies PantryRepository['update']
    const repository: PantryRepository = {
      list: async () => [
        pantryItem({
          name: 'Milk',
          category: 'dairy',
          categorySource: 'automatic',
          storageLocation: 'fridge',
          storageLocationSource: 'explicit',
          classificationVersion: 1,
        }),
      ],
      create: async () => pantryItem({ id: 'created' }),
      update,
      remove: async () => undefined,
    }
    const user = userEvent.setup()

    renderApp('/pantry', undefined, undefined, undefined, undefined, repository)
    const card = (await screen.findByRole('heading', { name: 'Milk' })).closest('article')
    await user.click(within(card as HTMLElement).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Milk' })
    await user.clear(within(dialog).getByLabelText('Item name'))
    await user.type(within(dialog).getByLabelText('Item name'), 'Apples')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(update).toHaveBeenCalledWith(
      'default-flour',
      expect.objectContaining({
        category: 'produce',
        categorySource: 'automatic',
        storageLocation: 'fridge',
        storageLocationSource: 'explicit',
        classificationVersion: 1,
      }),
    )
  })

  it('preserves remove and availability regressions', async () => {
    const update = vi.fn(async (itemId, input) => ({
      id: itemId,
      householdId,
      ...input,
      isDefault: true,
      updatedAt: '2026-01-02T00:00:00Z',
    })) satisfies PantryRepository['update']
    const remove = vi.fn(async () => undefined) satisfies PantryRepository['remove']
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const repository: PantryRepository = {
      list: async () => [pantryItem({})],
      create: async () => pantryItem({ id: 'created' }),
      update,
      remove,
    }
    const user = userEvent.setup()

    renderApp('/pantry', undefined, undefined, undefined, undefined, repository)
    await screen.findByRole('heading', { name: 'Plain flour' })
    await user.click(screen.getByRole('button', { name: 'Mark out of stock' }))
    expect(update).toHaveBeenCalledWith(
      'default-flour',
      expect.objectContaining({ available: false }),
    )
    expect(await screen.findByRole('button', { name: 'Mark available' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(remove).toHaveBeenCalledWith('default-flour')
    expect(await screen.findByRole('heading', { name: 'Start your pantry' })).toBeVisible()
  })
})
