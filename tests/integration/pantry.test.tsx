import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PantryRepository } from '../../src/application/pantry/pantryRepository'
import { renderApp } from '../renderApp'

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
      householdId: '20000000-0000-4000-8000-000000000001',
      ...input,
      isDefault: true,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies PantryRepository['update']
    const repository: PantryRepository = {
      list: async (householdId) => [
        {
          id: 'default-flour',
          householdId,
          name: 'Plain flour',
          category: 'baking',
          storageLocation: 'pantry',
          quantity: 1,
          unit: 'kg',
          available: true,
          isDefault: true,
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'default-milk',
          householdId,
          name: 'Milk',
          category: 'tea_coffee_and_drinks',
          storageLocation: 'fridge',
          quantity: null,
          unit: null,
          available: true,
          isDefault: true,
          updatedAt: '2026-01-01T00:00:00Z',
        },
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
    await userEvent.selectOptions(screen.getByLabelText('Location'), 'fridge')
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }))

    expect(create).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000001', {
      name: 'Greek yoghurt',
      category: 'other',
      storageLocation: 'fridge',
      quantity: null,
      unit: null,
      available: true,
    })
    expect(await screen.findByRole('heading', { name: 'Greek yoghurt' })).toBeVisible()
  })
})
